import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const root = process.cwd();
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
createServer(async (req, res) => {
  try {
    const requestPath = decodeURIComponent(req.url === '/' ? 'index.html' : req.url.split('?')[0].replace(/^\/+/, ''));
    const file = normalize(join(root, requestPath));
    if (!file.startsWith(normalize(root))) throw new Error('Invalid path');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(Number(process.env.PORT || 4173), '127.0.0.1', function () {
  console.log(`Local: http://127.0.0.1:${this.address().port}`);
});
