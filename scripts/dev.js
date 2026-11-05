// Local static server for dist/, mimicking Firebase Hosting's cleanUrls,
// trailingSlash and 404 handling. Usage: npm run dev [-- --port 8080]
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';

const dist = path.resolve(import.meta.dirname, '../dist');
const portArg = process.argv.indexOf('--port');
const port = Number(portArg > -1 ? process.argv[portArg + 1] : process.env.PORT || 8080);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

async function file(p) {
  try {
    const stat = await fs.stat(p);
    return stat.isFile() ? p : null;
  } catch {
    return null;
  }
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    const target = path.join(dist, pathname);
    if (!target.startsWith(dist)) {
      res.writeHead(400).end();
      return;
    }
    let found = await file(target);
    if (!found && !path.extname(pathname)) {
      if (!pathname.endsWith('/') && (await file(path.join(target, 'index.html')))) {
        res.writeHead(301, { Location: pathname + '/' + url.search }).end();
        return;
      }
      found = await file(path.join(target, 'index.html'));
    }
    const status = found ? 200 : 404;
    found ||= path.join(dist, '404.html');
    try {
      const body = await fs.readFile(found);
      res.writeHead(status, { 'Content-Type': TYPES[path.extname(found)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      // dist/ is being rebuilt.
      res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8', 'Retry-After': '2' }).end('Building, reload in a moment.');
    }
  })
  .listen(port, () => console.log(`Serving dist/ at http://localhost:${port}`));
