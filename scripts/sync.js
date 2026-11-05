// Copies the allowed data and images from the app repository into this repo.
// The app repo is only read. The question banks never leave it: only
// signs.json, tips.json and the `topics` part of theory.json are copied.
// Run after the app's sign data changes: `npm run sync`. Outputs are committed,
// so CI never needs the app repo or sharp.
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';
import config from '../site.config.js';
import { signFileBase } from './lib/text.js';

const root = path.resolve(import.meta.dirname, '..');
const app = path.resolve(root, config.appRepo);
const out = (...p) => path.join(root, ...p);

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function writeJson(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 1) + '\n');
}

// Inkscape files carry editor metadata the browser never uses.
function cleanSvg(svg) {
  return svg
    .replace(/<\?xml[^>]*\?>\s*/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<metadata[\s\S]*?<\/metadata>/g, '')
    .replace(/<sodipodi:namedview[^>]*\/>/g, '')
    .replace(/<sodipodi:namedview[\s\S]*?<\/sodipodi:namedview>/g, '')
    .trim() + '\n';
}

function svgSize(svg) {
  const viewBox = svg.match(/viewBox="([^"]+)"/);
  if (viewBox) {
    const [, , w, h] = viewBox[1].trim().split(/[\s,]+/).map(Number);
    if (w > 0 && h > 0) return { width: Math.round(w), height: Math.round(h) };
  }
  const w = parseFloat(svg.match(/<svg[^>]*\swidth="([\d.]+)/)?.[1]);
  const h = parseFloat(svg.match(/<svg[^>]*\sheight="([\d.]+)/)?.[1]);
  if (w > 0 && h > 0) return { width: Math.round(w), height: Math.round(h) };
  throw new Error('SVG without a usable size');
}

async function syncData() {
  const signs = await readJson(path.join(app, 'assets/data/signs.json'));
  await writeJson(out('data/signs.json'), signs);
  await writeJson(out('data/tips.json'), await readJson(path.join(app, 'assets/data/tips.json')));
  const theory = await readJson(path.join(app, 'assets/data/theory.json'));
  await writeJson(out('data/theory-topics.json'), { topics: theory.topics });
  return signs;
}

async function syncSigns(signs) {
  const dir = out('static/signs');
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
  const images = {};
  for (const sign of signs.signs) {
    const src = path.join(app, sign.image);
    const base = signFileBase(sign.code);
    if (src.endsWith('.svg')) {
      const svg = cleanSvg(await fs.readFile(src, 'utf8'));
      await fs.writeFile(path.join(dir, base + '.svg'), svg);
      images[sign.code] = { file: base + '.svg', ...svgSize(svg) };
    } else {
      const file = base + '.webp';
      const info = await sharp(src)
        .resize({ width: 480, height: 480, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(path.join(dir, file));
      images[sign.code] = { file, width: info.width, height: info.height };
    }
  }
  await writeJson(out('data/sign-images.json'), images);
}

// Minimal ICO container holding one PNG (supported by every current browser).
function pngToIco(png, size) {
  const head = Buffer.alloc(22);
  head.writeUInt16LE(0, 0); // reserved
  head.writeUInt16LE(1, 2); // type: icon
  head.writeUInt16LE(1, 4); // image count
  head.writeUInt8(size, 6);
  head.writeUInt8(size, 7);
  head.writeUInt16LE(1, 10); // colour planes
  head.writeUInt16LE(32, 12); // bits per pixel
  head.writeUInt32LE(png.length, 14);
  head.writeUInt32LE(22, 18); // offset of the PNG data
  return Buffer.concat([head, png]);
}

async function syncImages() {
  const img = out('static/img');
  await fs.mkdir(path.join(img, 'screens'), { recursive: true });
  const icon = path.join(app, 'store/android/metadata/fi-FI/images/icon.png');
  for (const size of [512, 192, 64]) {
    await sharp(icon).resize(size).png().toFile(path.join(img, `icon-${size}.png`));
  }
  await sharp(icon).resize(180).png().toFile(path.join(img, 'apple-touch-icon.png'));
  const fav = await sharp(icon).resize(32).png().toBuffer();
  await fs.writeFile(path.join(img, 'favicon-32.png'), fav);
  await fs.writeFile(path.join(img, 'favicon.ico'), pngToIco(fav, 32));

  await sharp(path.join(app, 'store/ios/creative_assets/fi/header_3840x1646.png'))
    .resize(1200, 630, { fit: 'cover' })
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(path.join(img, 'og-default.jpg'));

  const shots = path.join(app, 'store/android/metadata/fi-FI/images/phoneScreenshots');
  for (const name of await fs.readdir(shots)) {
    if (!name.endsWith('.png')) continue;
    for (const width of [360, 540, 720]) {
      await sharp(path.join(shots, name))
        .resize({ width })
        .webp({ quality: 80 })
        .toFile(path.join(img, 'screens', `${name.replace('.png', '')}-${width}.webp`));
    }
  }
}

// Subsets Manrope to Latin and writes WOFF2 files. Needs Python fontTools
// with brotli; the WOFF2 files are committed, so missing tools only skip this.
function syncFonts() {
  const res = spawnSync('python3', [path.join(root, 'scripts/fonts.py'), path.join(app, 'assets/fonts'), out('static/fonts')], { stdio: 'inherit' });
  if (res.status !== 0) console.warn('Font subsetting skipped: install fontTools and brotli (pip install fonttools brotli).');
}

const signs = await syncData();
await syncSigns(signs);
await syncImages();
syncFonts();
console.log(`Synced ${signs.signs.length} signs, images and fonts from ${app}`);
