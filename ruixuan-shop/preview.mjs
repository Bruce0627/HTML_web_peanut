import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, relative, sep, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = await realpath(fileURLToPath(new URL('.', import.meta.url)));
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp'
};
const port = Number(process.argv[2] ?? 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Provide a port from 1 to 65535.');

createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    const requestPath = pathname.endsWith('/') ? pathname + 'index.html' : pathname;
    const target = await realpath(resolve(root, '.' + requestPath));
    const local = relative(root, target);
    const type = types[extname(target).toLowerCase()];
    const info = await stat(target);
    if (local === '..' || local.startsWith('..' + sep) || isAbsolute(local) || !type || !info.isFile()) {
      response.writeHead(404).end();
      return;
    }
    const headers = { 'Content-Type': type, 'Content-Length': info.size, 'X-Content-Type-Options': 'nosniff' };
    response.writeHead(200, headers);
    if (request.method === 'HEAD') response.end();
    else createReadStream(target).on('error', () => response.destroy()).pipe(response);
  } catch {
    response.writeHead(404).end();
  }
}).listen(port, '127.0.0.1', () => console.log('http://127.0.0.1:' + port + '/'));
