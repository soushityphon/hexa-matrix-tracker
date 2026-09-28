// Bundled with the static files by scripts/build-worker.mjs.
const mimeTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8' };

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });
    const path = url.pathname === '/' ? '/index.html' : url.pathname;
    if (!Object.hasOwn(ASSETS, path)) return new Response('Not found', { status: 404 });
    const ext = path.slice(path.lastIndexOf('.'));
    return new Response(request.method === 'HEAD' ? null : ASSETS[path], { headers: { 'Content-Type': mimeTypes[ext] || 'application/octet-stream', 'Cache-Control': 'public, max-age=60' } });
  }
};
