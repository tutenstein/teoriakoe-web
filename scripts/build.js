// Builds the static site into dist/: pages from content/ and data/, hashed
// assets, sitemaps and robots.txt. Usage: npm run build
import fs from 'node:fs/promises';
import path from 'node:path';
import { minify } from 'html-minifier-terser';
import config from '../site.config.js';
import { Assets } from './lib/assets.js';
import { parseFrontmatter } from './lib/frontmatter.js';
import { createMarkdown } from './lib/markdown.js';
import { adSlot, compareTable, screenshots } from '../templates/components.js';
import { layout } from '../templates/layout.js';
import { prepareSigns, signRoute, groupRoute, hubRoute, HUB_URL } from '../templates/signs.js';
import { pageRoute } from '../templates/page.js';
import { homeRoute } from '../templates/home.js';
import { notFoundRoute } from '../templates/notfound.js';

const root = path.resolve(import.meta.dirname, '..');
// DIST lets parallel builds write to separate folders.
const dist = process.env.DIST ? path.resolve(process.env.DIST) : path.join(root, 'dist');
const contentDir = path.join(root, 'content');
const REQUIRED = ['title', 'description', 'h1', 'updated'];

const readJson = async (rel) => JSON.parse(await fs.readFile(path.join(root, rel), 'utf8'));

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir) {
  if (!(await exists(dir))) return [];
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (entry.name.endsWith('.md')) out.push(full);
  }
  return out.sort();
}

async function readContent(file) {
  const source = await fs.readFile(file, 'utf8');
  const { data, body } = parseFrontmatter(source, path.relative(root, file));
  return { file: path.relative(root, file), data, body };
}

function requireFields(content, keys = REQUIRED) {
  const missing = keys.filter((k) => content.data[k] === undefined || content.data[k] === '');
  if (missing.length) throw new Error(`${content.file}: missing frontmatter ${missing.join(', ')}`);
}

// content/pages/teoriakoe/hinta.md -> /teoriakoe/hinta/, index.md -> parent folder.
function pageUrl(file) {
  const rel = path.relative(path.join(contentDir, 'pages'), file).replace(/\\/g, '/').replace(/\.md$/, '');
  const clean = rel === 'index' ? '' : rel.replace(/\/index$/, '');
  return clean ? `/${clean}/` : '/';
}

function outFile(url) {
  if (url.endsWith('.html')) return path.join(dist, url);
  return path.join(dist, url, 'index.html');
}

function svgSize(svg) {
  const [, , w, h] = svg.match(/viewBox="([^"]+)"/)[1].split(/[\s,]+/).map(Number);
  return { width: Math.round(w), height: Math.round(h) };
}

async function buildAssets(assets) {
  const fonts = {};
  for (const weight of [400, 600, 800]) fonts[weight] = await assets.file(`fonts/manrope-${weight}.woff2`);
  const css = await assets.css('css/site.css', { FONT_400: fonts[400], FONT_600: fonts[600], FONT_800: fonts[800] });
  const js = {};
  for (const [name, file] of Object.entries({ site: 'site.js', search: 'search.js', quiz: 'quiz.js', signCheck: 'sign-check.js' })) {
    js[name] = await assets.js(`js/${file}`);
  }
  const screens = {};
  for (const file of await fs.readdir(path.join(root, 'static/img/screens'))) {
    screens[file.replace('.webp', '')] = await assets.file(`img/screens/${file}`);
  }
  // Official store badges, once added to static/badges/ (see README).
  const badges = {};
  for (const [key, file] of [['appStore', 'badges/app-store-fi.svg'], ['googlePlay', 'badges/google-play-fi.svg']]) {
    const full = path.join(root, 'static', file);
    if (!(await exists(full))) continue;
    const size = svgSize(await fs.readFile(full, 'utf8'));
    const height = 52;
    badges[key] = { src: await assets.file(file), height, width: Math.round((size.width / size.height) * height) };
  }
  return {
    css,
    js,
    fonts,
    screens,
    badges,
    icon64: await assets.file('img/icon-64.png'),
    icon192: await assets.file('img/icon-192.png'),
    icon512: await assets.file('img/icon-512.png'),
    og: await assets.file('img/og-default.jpg')
  };
}

async function copyStatic() {
  await fs.cp(path.join(root, 'static/signs'), path.join(dist, 'kuvat/merkit'), { recursive: true });
  await fs.copyFile(path.join(root, 'static/img/favicon.ico'), path.join(dist, 'favicon.ico'));
  await fs.copyFile(path.join(root, 'static/img/apple-touch-icon.png'), path.join(dist, 'apple-touch-icon.png'));
  await fs.copyFile(path.join(root, 'static/img/icon-512.png'), path.join(dist, 'kuvat/teoriakoe-fi.png'));
}

function faqLd(faq) {
  return {
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer }
    }))
  };
}

function sitemapXml(entries) {
  const urls = entries
    .map((e) => `<url><loc>${config.origin}${e.url}</loc>${e.updated ? `<lastmod>${e.updated}</lastmod>` : ''}</url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

async function writeSitemaps(routes) {
  const groups = {};
  for (const r of routes) {
    if (r.noindex || !r.sitemap) continue;
    (groups[r.sitemap] ||= []).push(r);
  }
  const index = [];
  for (const name of ['core', 'signs', 'blog', 'en']) {
    const entries = groups[name];
    if (!entries?.length) continue;
    const file = `sitemap-${name}.xml`;
    await fs.writeFile(path.join(dist, file), sitemapXml(entries));
    const lastmod = entries.map((e) => e.updated).filter(Boolean).sort().pop();
    index.push(`<sitemap><loc>${config.origin}/${file}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</sitemap>`);
  }
  await fs.writeFile(
    path.join(dist, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${index.join('\n')}\n</sitemapindex>\n`
  );
  await fs.writeFile(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${config.origin}/sitemap.xml\n`);
  return Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, v.length]));
}

async function main() {
  const started = Date.now();
  await fs.rm(dist, { recursive: true, force: true });
  await fs.mkdir(dist, { recursive: true });

  const assets = new Assets(root, dist);
  const urls = await buildAssets(assets);
  await copyStatic();

  const signData = prepareSigns(await readJson('data/signs.json'), await readJson('data/sign-images.json'));
  urls.quizData = await assets.json(
    'quiz-data',
    {
      groups: Object.fromEntries(signData.groups.map((g) => [g.id, g.fi])),
      signs: signData.signs.map((s) => [s.code, s.nameFi, s.img.src, s.img.width, s.img.height, s.category, s.descFi || '', s.url])
    }
  );

  const pages = [];
  for (const file of await walk(path.join(contentDir, 'pages'))) {
    const page = await readContent(file);
    if (page.data.draft === true) continue;
    requireFields(page);
    page.url = pageUrl(file);
    pages.push(page);
  }
  const hub = await readContent(path.join(contentDir, 'liikennemerkit/index.md'));
  requireFields(hub);
  const groupContent = {};
  for (const file of await walk(path.join(contentDir, 'liikennemerkit/ryhmat'))) {
    const c = await readContent(file);
    requireFields(c, ['title', 'description', 'updated']);
    groupContent[path.basename(file, '.md')] = c;
  }
  const signContent = {};
  for (const file of await walk(path.join(contentDir, 'liikennemerkit/merkit'))) {
    const c = await readContent(file);
    requireFields(c, ['description', 'updated']);
    const code = path.basename(file, '.md');
    if (!signData.byCode.has(code)) throw new Error(`${c.file}: unknown sign code ${code}`);
    signContent[code] = c;
  }

  // Every URL is known before any page renders, so templates link only to pages that exist.
  const known = new Set(['/404.html', HUB_URL, ...pages.map((p) => p.url), ...signData.groups.map((g) => g.url), ...signData.signs.map((s) => s.url)]);
  const pageByUrl = new Map(pages.map((p) => [p.url, p]));
  const render = createMarkdown({
    resolveHref(href) {
      if (href.startsWith('merkki:')) {
        const sign = signData.byCode.get(href.slice(7));
        if (!sign) throw new Error(`Unknown sign link ${href}`);
        return sign.url;
      }
      return href;
    }
  });
  const ctx = {
    config,
    urls,
    badges: urls.badges,
    routes: known,
    signData,
    year: new Date().getFullYear(),
    markdown: (body, shortcodes = {}) =>
      render(body, { ad: () => adSlot('inline'), compare: () => compareTable(), screens: () => screenshots(ctx), ...shortcodes }),
    crumbsFor(url, name) {
      const crumbs = [{ name: 'Etusivu', url: '/' }];
      const parts = url.split('/').filter(Boolean);
      for (let i = 1; i < parts.length; i++) {
        const parent = `/${parts.slice(0, i).join('/')}/`;
        const p = pageByUrl.get(parent);
        if (p) crumbs.push({ name: p.data.crumb || p.data.h1, url: parent });
      }
      crumbs.push({ name, url });
      return crumbs;
    }
  };

  const routes = [];
  for (const page of pages) routes.push(page.data.layout === 'home' ? homeRoute(page, ctx) : pageRoute(page, ctx));
  routes.push(hubRoute(ctx, hub));
  for (const group of signData.groups) routes.push(groupRoute(group, ctx, groupContent[group.id]));
  for (const sign of signData.signs) routes.push(signRoute(sign, ctx, signContent[sign.code]));
  routes.push(notFoundRoute(ctx));

  const searchIndex = routes
    .filter((r) => !r.noindex && r.kind !== 'sign')
    .map((r) => [r.title.replace(/ \| Teoriakoe FI$/, ''), r.url])
    .concat(signData.signs.map((s) => [`${s.code} ${s.nameFi}`, s.url]));
  urls.searchIndex = await assets.json('search-index', searchIndex);
  // The 404 page needs the index URL, which only exists now.
  routes[routes.length - 1] = notFoundRoute(ctx);

  for (const route of routes) {
    if (route.faq?.length) (route.jsonld ||= []).push(faqLd(route.faq));
    const html = await minify(layout(route, ctx), {
      collapseWhitespace: true,
      conservativeCollapse: true,
      removeComments: true,
      collapseBooleanAttributes: true,
      useShortDoctype: true
    });
    const file = outFile(route.url);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, html);
  }

  const sitemapCounts = await writeSitemaps(routes);
  await fs.writeFile(
    path.join(dist, '.build-report.json'),
    JSON.stringify({ routes: routes.map((r) => ({ url: r.url, kind: r.kind, noindex: !!r.noindex, words: r.words })), assets: assets.sizes })
  );
  const indexed = routes.filter((r) => !r.noindex).length;
  const cssSize = assets.sizes[path.basename(urls.css)];
  console.log(
    `Built ${routes.length} pages (${indexed} indexed, ${routes.length - indexed} noindex) in ${Date.now() - started} ms. ` +
      `Sitemaps: ${JSON.stringify(sitemapCounts)}. CSS ${(cssSize / 1024).toFixed(1)} KB.`
  );
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
