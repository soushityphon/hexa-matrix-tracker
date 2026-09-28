// Bundled with the static files by scripts/build-worker.mjs.
const mimeTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8' };
const scouterUrl = 'https://api.maplescouter.com/api/calc/hexa-order?class=%ED%98%B8%EC%98%81';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/hexa-order') {
      if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
      if (!env?.MAPLE_SCOUTER_API_KEY || !env?.MAPLE_SCOUTER_REQUEST_PART_1 || !env?.MAPLE_SCOUTER_REQUEST_PART_2) return new Response('Maple Scouter request is not configured', { status: 503 });
      if (Number(request.headers.get('content-length')) > 1_000) return new Response('Payload too large', { status: 413 });
      let selection, payload;
      try {
        const body = await request.text();
        if (body.length > 1_000) return new Response('Payload too large', { status: 413 });
        selection = JSON.parse(body);
        payload = JSON.parse(env.MAPLE_SCOUTER_REQUEST_PART_1 + env.MAPLE_SCOUTER_REQUEST_PART_2);
      } catch { return new Response('Invalid JSON', { status: 400 }); }
      if (!['lotus_heroic', 'lotus_interactive'].includes(selection?.mode)) return new Response('Current GMS Lotus mode required', { status: 400 });
      if (payload?.myHexa?.character_class !== '호영' || payload?.userStat?.stat?.myClass !== '호영' || payload?.userStat?.isGMS !== true) {
        return new Response('Configured GMS Hoyoung request is invalid', { status: 503 });
      }
      payload.sole = selection.mode === 'lotus_interactive';
      try {
        const upstream = await fetch(scouterUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': '*/*',
            'api-key': env.MAPLE_SCOUTER_API_KEY,
            'Origin': 'https://maplescouter.com',
            'Referer': 'https://maplescouter.com/'
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(25_000)
        });
        if (!upstream.ok) return new Response(`Maple Scouter returned ${upstream.status}`, { status: 502 });
        const result = await upstream.json();
        if (!Array.isArray(result?.class_hexa) || !result.class_hexa.length) return new Response('Maple Scouter returned an unexpected order', { status: 502 });
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
