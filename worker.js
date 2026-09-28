// Bundled with the static files by scripts/build-worker.mjs.
const mimeTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8' };
const apiUrl = 'https://api.maplescouter.com/api/calc/hexa-order?class=%ED%98%B8%EC%98%81';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/api/hexa-order') {
      if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
      if (Number(request.headers.get('content-length')) > 100_000) return new Response('Payload too large', { status: 413 });
      let payload;
      try { payload = await request.json(); } catch { return new Response('Invalid JSON', { status: 400 }); }
      if (!payload || JSON.stringify(payload).length > 100_000 || payload.userStat?.stat?.myClass !== '호영' || payload.myHexa?.character_class !== '호영') {
        return new Response('Hoyoung HEXA payload required', { status: 400 });
      }
      try {
        const upstream = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(25_000) });
        if (!upstream.ok) return new Response(`Maple Scouter returned ${upstream.status}`, { status: 502 });
        const result = await upstream.json();
        if (!Array.isArray(result.class_hexa)) return new Response('Maple Scouter returned an unexpected result', { status: 502 });
        return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
      } catch { return new Response('Maple Scouter could not be reached', { status: 502 }); }
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });
    const path = url.pathname === '/' ? '/index.html' : url.pathname;
    if (!Object.hasOwn(ASSETS, path)) return new Response('Not found', { status: 404 });
    const ext = path.slice(path.lastIndexOf('.'));
    return new Response(request.method === 'HEAD' ? null : ASSETS[path], { headers: { 'Content-Type': mimeTypes[ext] || 'application/octet-stream', 'Cache-Control': 'public, max-age=60' } });
  }
};
