import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, relative, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const portArg = process.argv.indexOf('--port');
const port = Number(portArg >= 0 ? process.argv[portArg + 1] : process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' };
createServer(async (req, res) => {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
    if (req.url === '/health') {
      res.writeHead(200, { 'content-type': types['.json'] }).end(JSON.stringify({ app: 'geometry-lab', version: 1 }));
      return;
    }
    const pathname = decodeURIComponent(req.url.split('?')[0]);
    // Online add-ins need a web entry point; local WPS add-ins generate one.
    if (pathname === '/wps-addon/' || pathname === '/wps-addon/index.html') {
      res.writeHead(200, { 'content-type': types['.html'], 'cache-control': 'no-store' });
      res.end('<!doctype html><html><head><meta charset="utf-8"><title>GeometryLab WPS Add-in</title></head><body><script src="main.js"></script></body></html>');
      return;
    }
    const requestPath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const file = resolve(root, requestPath);
    const rel = relative(root, file);
    if (!rel || rel.startsWith('..') || rel.split(sep).some(part => part.startsWith('.')) || !types[extname(file)]) throw new Error('Invalid path');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': types[extname(file)], 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(port, '127.0.0.1', function () {
  console.log(`Local: http://127.0.0.1:${this.address().port}`);
});
