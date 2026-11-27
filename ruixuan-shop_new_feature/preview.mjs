import { createReadStream } from 'node:fs';
import { mkdir, realpath, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { orderRoutes } from './source/orders.mjs';

const root = await realpath(fileURLToPath(new URL('.', import.meta.url)));
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp'
};
const port = Number(process.argv[2] ?? 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Provide a port from 1 to 65535.');

await mkdir(resolve(root, 'data'), { recursive: true });
const orders = orderRoutes(resolve(root, 'data', 'orders.sqlite'), process.env);

createServer(async (request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1');
  if (url.pathname.startsWith('/api/')) {
    try {
      await orders(request, response, url);
    } catch (error) {
      console.error(error.message);
      if (!response.headersSent) response.writeHead(500, {
        'Content-Type': 'application/json', 'Cache-Control': 'no-store'
      }).end('{"error":"server_error"}');
    }
    return;
  }
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  try {
    const pathname = decodeURIComponent(url.pathname);
    const requestPath = pathname.endsWith('/') ? pathname + 'index.html' : pathname;
    const target = await realpath(resolve(root, '.' + requestPath));
    const local = relative(root, target);
    const type = types[extname(target).toLowerCase()];
    const info = await stat(target);
    if (!/^(?:index\.html$|(?:HTML|en|ja|picture|assets|admin)[\\/])/i.test(local) ||
        isAbsolute(local) || !type || !info.isFile()) {
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
}).listen(port, process.env.HOST ?? '127.0.0.1', () => console.log('http://127.0.0.1:' + port + '/'));
