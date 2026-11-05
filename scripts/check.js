// Quality gate for dist/: HTML basics, broken links, metadata, banned words,
// sitemap consistency and a duplicate-sentence report between indexed pages.
// Usage: npm run build && npm run check   (exit code 1 on any error)
import fs from 'node:fs/promises';
import path from 'node:path';
import config from '../site.config.js';
import { sentences, stripTags, wordCount } from './lib/text.js';

const root = path.resolve(import.meta.dirname, '..');
// DIST lets parallel builds write to separate folders.
const dist = process.env.DIST ? path.resolve(process.env.DIST) : path.join(root, 'dist');
const MAX_TITLE = 60;
const MAX_CSS = 30 * 1024;
const MAX_OVERLAP = 0.3;
const MIN_SIGN_WORDS = 200;
// Names that must never appear on the site or in the repo, base64-encoded so
// that this file passes its own scan.
const BANNED = new RegExp(['YXV0b2xpaXQ=', 'YWpva291bHU='].map((b) => Buffer.from(b, 'base64').toString()).join('|'), 'i');
const BANNED_TEXT = /\btekoäly|\bchatgpt\b|\bclaude\b|\bAI\b|\bgpt-\d/i;

const errors = [];
const warnings = [];
const err = (file, msg) => errors.push(`${file}: ${msg}`);
const warn = (file, msg) => warnings.push(`${file}: ${msg}`);

async function walk(dir, filter) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full, filter)));
    else if (filter(entry.name)) out.push(full);
  }
  return out;
}

function urlOf(file) {
  const rel = '/' + path.relative(dist, file).replace(/\\/g, '/');
  return rel.endsWith('/index.html') ? rel.slice(0, -'index.html'.length) : rel;
}

function attr(tag, name) {
  return tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1] ?? (new RegExp(`\\s${name}(\\s|>|$)`).test(tag) ? '' : null);
}

function decode(s) {
  return s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

// Main content without the parts that repeat on purpose (CTA, notices, headings).
function uniqueText(html) {
  const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/)?.[1] || '';
  return stripTags(
    main
      .replace(/<aside[^>]*data-shared[^>]*>[\s\S]*?<\/aside>/g, ' ')
      .replace(/<div[^>]*data-shared[^>]*>[\s\S]*?<\/div>/g, ' ')
      .replace(/<nav[\s\S]*?<\/nav>/g, ' ')
      .replace(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/g, ' ')
      .replace(/<section class="sources"[\s\S]*?<\/section>/g, ' ')
  );
}

async function main() {
  const files = await walk(dist, (n) => n.endsWith('.html'));
  const pages = new Map();
  for (const file of files) pages.set(urlOf(file), { file, html: await fs.readFile(file, 'utf8') });
  const report = JSON.parse(await fs.readFile(path.join(dist, '.build-report.json'), 'utf8'));
  const sitemapUrls = new Set();
  for (const xml of await walk(dist, (n) => /^sitemap-.*\.xml$/.test(n))) {
    for (const m of (await fs.readFile(xml, 'utf8')).matchAll(/<loc>([^<]+)<\/loc>/g)) sitemapUrls.add(m[1].replace(config.origin, ''));
  }

  const ids = new Map();
  for (const [url, { html }] of pages) ids.set(url, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));

  const indexed = [];
  for (const [url, { html }] of pages) {
    const where = url;
    const is404 = url === '/404.html';
    if (!html.startsWith('<!doctype html>')) err(where, 'missing <!doctype html>');
    if (!/<html lang="[a-z]{2}"/.test(html)) err(where, 'missing <html lang>');
    const h1 = html.match(/<h1[\s>]/g)?.length || 0;
    if (h1 !== 1) err(where, `expected one <h1>, found ${h1}`);
    const title = decode(html.match(/<title>([^<]*)<\/title>/)?.[1] || '');
    if (!title) err(where, 'missing <title>');
    else if (title.length > MAX_TITLE) err(where, `title is ${title.length} chars (max ${MAX_TITLE}): ${title}`);
    const desc = decode(html.match(/<meta name="description" content="([^"]*)"/)?.[1] || '');
    if (!desc) err(where, 'missing meta description');
    else if (desc.length < 70 || desc.length > 160) warn(where, `description is ${desc.length} chars`);
    const noindex = /<meta name="robots" content="noindex/.test(html);
    if (!is404) {
      const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
      if (canonical !== config.origin + url) err(where, `canonical ${canonical} does not match the page URL`);
      if (!noindex && !/hreflang="x-default"/.test(html)) err(where, 'missing hreflang x-default');
      if (url !== '/' && !html.includes('"BreadcrumbList"')) err(where, 'missing BreadcrumbList JSON-LD');
    }
    if (noindex && sitemapUrls.has(url)) err(where, 'noindex page is listed in a sitemap');
    if (!noindex && !is404) {
      indexed.push(url);
      if (!sitemapUrls.has(url)) err(where, 'indexed page is missing from the sitemaps');
    }

    for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      try {
        JSON.parse(m[1]);
      } catch {
        err(where, 'invalid JSON-LD');
      }
    }
    for (const m of html.matchAll(/<img\b[^>]*>/g)) {
      const tag = m[0];
      if (attr(tag, 'alt') === null) err(where, `image without alt: ${tag.slice(0, 80)}`);
      if (!attr(tag, 'width') || !attr(tag, 'height')) err(where, `image without width/height: ${tag.slice(0, 80)}`);
    }
    const seen = new Set();
    for (const m of html.matchAll(/\sid="([^"]+)"/g)) {
      if (seen.has(m[1])) err(where, `duplicate id "${m[1]}"`);
      seen.add(m[1]);
    }
    for (const m of html.matchAll(/<a\b[^>]*>/g)) {
      const tag = m[0];
      const href = decode(attr(tag, 'href') || '');
      if (!href) {
        err(where, `link without href: ${tag}`);
        continue;
      }
      if (/^https?:\/\//.test(href)) {
        if (!/noopener/.test(attr(tag, 'rel') || '')) err(where, `external link without rel="noopener": ${href}`);
        continue;
      }
      if (/^(mailto|tel):/.test(href)) continue;
      const [target, hash] = href.split('#');
      const targetUrl = target === '' ? url : target;
      if (!targetUrl.startsWith('/')) {
        err(where, `relative link ${href}`);
        continue;
      }
      if (!pages.has(targetUrl)) {
        if (!targetUrl.endsWith('/') && pages.has(targetUrl + '/')) err(where, `link without trailing slash: ${href}`);
        else err(where, `broken link: ${href}`);
        continue;
      }
      if (hash && !ids.get(targetUrl).has(hash)) err(where, `missing anchor: ${href}`);
    }
    const text = stripTags(html.replace(/<head>[\s\S]*?<\/head>/, ''));
    if (BANNED.test(html)) err(where, 'contains a banned name');
    if (BANNED_TEXT.test(text)) err(where, `mentions AI tooling: "${text.match(BANNED_TEXT)[0]}"`);
  }

  // Asset URLs referenced from HTML must exist.
  const assetRefs = new Set();
  for (const { html } of pages.values()) for (const m of html.matchAll(/(?:src|href|srcset)="([^"]+)"/g)) {
    for (const part of m[1].split(',')) {
      const ref = part.trim().split(' ')[0];
      if (ref.startsWith('/assets/') || ref.startsWith('/kuvat/')) assetRefs.add(ref);
    }
  }
  for (const ref of assetRefs) {
    try {
      await fs.access(path.join(dist, ref));
    } catch {
      err('assets', `missing file ${ref}`);
    }
  }

  // Banned names anywhere in the sources or output, including file names.
  const scanDirs = ['content', 'templates', 'src', 'scripts', 'static', 'data'].map((d) => path.join(root, d)).concat(dist);
  for (const dir of scanDirs) {
    for (const file of await walk(dir, () => true)) {
      const rel = path.relative(root, file);
      if (BANNED.test(rel)) err(rel, 'banned name in file name');
      if (/\.(md|js|json|css|html|xml|txt|svg)$/.test(file) && BANNED.test(await fs.readFile(file, 'utf8'))) {
        err(rel, 'banned name in file');
      }
    }
  }

  for (const route of report.routes) {
    if (route.kind === 'sign' && !route.noindex && route.words < MIN_SIGN_WORDS) err(route.url, `indexed sign page has ${route.words} words`);
    if (route.kind === 'sign' && route.noindex && route.words > 0) err(route.url, `sign text has ${route.words} words; it needs ${MIN_SIGN_WORDS} to be indexed`);
  }
  for (const [file, size] of Object.entries(report.assets)) {
    if (file.endsWith('.css') && size > MAX_CSS) err(file, `CSS is ${(size / 1024).toFixed(1)} KB (max 30 KB)`);
  }

  // Duplicate sentences between indexed pages: share of the smaller page's
  // sentences that also appear on the other page.
  const sets = new Map();
  const owners = new Map();
  for (const url of indexed) {
    const set = new Set(sentences(uniqueText(pages.get(url).html)));
    sets.set(url, set);
    for (const s of set) {
      if (!owners.has(s)) owners.set(s, []);
      owners.get(s).push(url);
    }
  }
  const shared = new Map();
  for (const list of owners.values()) {
    if (list.length < 2) continue;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const key = `${list[i]}\n${list[j]}`;
        shared.set(key, (shared.get(key) || 0) + 1);
      }
    }
  }
  const overlaps = [];
  for (const [key, count] of shared) {
    const [a, b] = key.split('\n');
    const ratio = count / Math.max(1, Math.min(sets.get(a).size, sets.get(b).size));
    overlaps.push([ratio, a, b, count]);
  }
  overlaps.sort((x, y) => y[0] - x[0]);
  for (const [ratio, a, b, count] of overlaps) {
    if (ratio > MAX_OVERLAP) err(`${a} ↔ ${b}`, `${Math.round(ratio * 100)} % shared sentences (${count})`);
  }

  const words = indexed.map((u) => wordCount(uniqueText(pages.get(u).html)));
  console.log(`Checked ${pages.size} HTML files (${indexed.length} indexed, ${sitemapUrls.size} in sitemaps).`);
  console.log(`Unique text per indexed page: min ${Math.min(...words)} words, median ${words.sort((a, b) => a - b)[Math.floor(words.length / 2)]}.`);
  console.log(`Highest sentence overlap: ${overlaps.slice(0, 3).map(([r, a, b]) => `${Math.round(r * 100)} % ${a} ↔ ${b}`).join('; ') || 'none'}`);
  for (const w of warnings) console.log(`warn  ${w}`);
  for (const e of errors) console.log(`ERROR ${e}`);
  if (errors.length) {
    console.log(`\n${errors.length} error(s).`);
    process.exit(1);
  }
  console.log('No errors.');
}

main();
