// Fingerprinted assets: every file under /assets/ carries a content hash in its
// name, so firebase.json can cache it for a year as immutable.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { minify } from 'html-minifier-terser';

export function contentHash(data) {
  return crypto.createHash('sha256').update(data).digest('hex').slice(0, 10);
}

export async function minifyCss(css) {
  const out = await minify(`<style>${css}</style>`, { minifyCSS: true });
  return out.replace(/^<style>|<\/style>$/g, '');
}

export async function minifyJs(js) {
  const out = await minify(`<script>${js}</script>`, { minifyJS: { compress: true, mangle: true } });
  return out.replace(/^<script>|<\/script>$/g, '');
}

export class Assets {
  constructor(root, dist) {
    this.root = root;
    this.dist = dist;
    this.done = new Map();
    this.sizes = {};
  }

  async write(name, ext, data) {
    const file = `${name}.${contentHash(data)}${ext}`;
    await fs.mkdir(path.join(this.dist, 'assets'), { recursive: true });
    await fs.writeFile(path.join(this.dist, 'assets', file), data);
    this.sizes[file] = Buffer.byteLength(data);
    return `/assets/${file}`;
  }

  // Copies a file from static/ under a hashed name; returns its URL.
  async file(rel) {
    if (!this.done.has(rel)) {
      const data = await fs.readFile(path.join(this.root, 'static', rel));
      const ext = path.extname(rel);
      this.done.set(rel, await this.write(path.basename(rel, ext), ext, data));
    }
    return this.done.get(rel);
  }

  async css(rel, replace = {}) {
    let css = await fs.readFile(path.join(this.root, 'src', rel), 'utf8');
    for (const [token, value] of Object.entries(replace)) css = css.replaceAll(token, value);
    return this.write(path.basename(rel, '.css'), '.css', await minifyCss(css));
  }

  async js(rel) {
    const js = await fs.readFile(path.join(this.root, 'src', rel), 'utf8');
    return this.write(path.basename(rel, '.js'), '.js', await minifyJs(js));
  }

  async json(name, data) {
    return this.write(name, '.json', JSON.stringify(data));
  }
}
