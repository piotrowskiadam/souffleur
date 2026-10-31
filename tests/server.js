// Test-only static server. Never included in either extension bundle.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
const root = resolve('.');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
createServer(async (request, response) => {
  const path = resolve(root, `.${new URL(request.url, 'http://localhost').pathname}`);
  if (!path.startsWith(`${root}/`)) { response.writeHead(403).end(); return; }
  try { response.setHeader('Content-Type', types[extname(path)] ?? 'application/octet-stream'); response.end(await readFile(path)); }
  catch { response.writeHead(404).end('Not found'); }
}).listen(4173, '127.0.0.1');
