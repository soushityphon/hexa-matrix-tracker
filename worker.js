// Bundled with the static files by scripts/build-worker.mjs.
const mimeTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8' };
const scouterUrl = 'https://api.maplescouter.com/api/calc/hexa-order?class=%ED%98%B8%EC%98%81';
function fixedBaseline(hexa) {
  if (!hexa || hexa.hexaStat !== 0 || hexa.hexaStat_opened !== false || hexa.hexaSkill?.skillCore1 !== 1) return false;
  if (Object.entries(hexa.hexaSkill).some(([key, level]) => key !== 'skillCore1' && level !== 0)) return false;
  if (Object.values(hexa.hexaSkill_general || {}).some(level => level !== 0)) return false;
  return Object.entries(hexa).every(([key, level]) =>
    !/^(?:skillCore|masteryCore|reinCore|generalCore)\d+$/.test(key) || (key === 'skillCore1' ? level === '1' : level === '0'));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/hexa-order') {
      if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
      if (Number(request.headers.get('content-length')) > 1_000) return new Response('Payload too large', { status: 413 });
      let selection, payload;
      try {
        const body = await request.text();
        if (body.length > 1_000) return new Response('Payload too large', { status: 413 });
        selection = JSON.parse(body);
      } catch { return new Response('Invalid JSON', { status: 400 }); }
      if (!['lotus_heroic', 'lotus_interactive', 'taotie_heroic', 'taotie_interactive'].includes(selection?.mode)) return new Response('Supported Hoyoung mode required', { status: 400 });
      const kms = selection.mode.startsWith('taotie_');
      const part1 = kms ? env?.MAPLE_SCOUTER_KMS_REQUEST_PART_1 : env?.MAPLE_SCOUTER_REQUEST_PART_1;
      const part2 = kms ? env?.MAPLE_SCOUTER_KMS_REQUEST_PART_2 : env?.MAPLE_SCOUTER_REQUEST_PART_2;
      if (!env?.MAPLE_SCOUTER_API_KEY || !part1 || !part2) return new Response('Maple Scouter request is not configured for this update', { status: 503 });
      try { payload = JSON.parse(part1 + part2); }
      catch { return new Response('Configured Maple Scouter request is invalid JSON', { status: 503 }); }
      if (payload?.myHexa?.character_class !== '호영' || payload?.userStat?.stat?.myClass !== '호영' || payload?.userStat?.isGMS !== !kms) {
        return new Response('Configured Hoyoung request has the wrong class or region', { status: 503 });
      }
      if (kms && (!fixedBaseline(payload.myHexa) || !fixedBaseline(payload.userStat?.hexa))) {
        return new Response('Configured KMS request must use the fixed level-one Origin baseline', { status: 503 });
      }
      payload.sole = selection.mode.endsWith('_interactive');
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
