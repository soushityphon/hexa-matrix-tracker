// Bundled with the static files by scripts/build-worker.mjs.
import { validateDraft } from './priority-draft.js';
const mimeTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8' };
const scouterUrl = 'https://api.maplescouter.com/api/calc/hexa-order?class=%ED%98%B8%EC%98%81';
const noStore = { 'Cache-Control': 'no-store' };
function isAdmin(request, env) {
  return !!env?.ADMIN_USER_ID && request.headers.get('oai-authenticated-user-id') === env.ADMIN_USER_ID;
}
async function priorityPreview(request, env) {
  if (!env?.DB) return new Response('Priority preview storage is unavailable', { status: 503 });
  try {
    if (request.method === 'GET') {
      const rows = await env.DB.prepare('SELECT mode, draft_json FROM priority_preview').all();
      const drafts = {};
      for (const row of rows.results || []) {
        try {
          const draft = validateDraft(JSON.parse(row.draft_json));
          if (draft.mode === row.mode && !draft.newNodes.length) drafts[row.mode] = draft;
        } catch { /* A stale version cannot replace the GitHub baseline. */ }
      }
      return Response.json({ drafts }, { headers: noStore });
    }
    if (!['PUT', 'DELETE'].includes(request.method)) return new Response('Method not allowed', { status: 405 });
    if (!isAdmin(request, env)) return new Response('Admin access required', { status: 403 });
    if (Number(request.headers.get('content-length')) > 100_000) return new Response('Payload too large', { status: 413 });
    const body = await request.text();
    if (body.length > 100_000) return new Response('Payload too large', { status: 413 });
    let selection;
    try { selection = JSON.parse(body); } catch { return new Response('Invalid JSON', { status: 400 }); }
    if (request.method === 'DELETE') {
      if (typeof selection?.mode !== 'string' || !/^[a-z0-9_]+$/.test(selection.mode)) return new Response('Invalid priority ID', { status: 400 });
      await env.DB.prepare('DELETE FROM priority_preview WHERE mode = ?').bind(selection.mode).run();
      return Response.json({ removed: selection.mode }, { headers: noStore });
    }
    let draft;
    try { draft = validateDraft(selection?.draft); }
    catch (error) { return new Response(error.message, { status: 400 }); }
    if (draft.newNodes.length) return new Response('New skills need a reviewed GitHub update before their costs can be used in the tracker', { status: 400 });
    await env.DB.prepare('INSERT INTO priority_preview (mode, draft_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(mode) DO UPDATE SET draft_json = excluded.draft_json, updated_at = excluded.updated_at')
      .bind(draft.mode, JSON.stringify(draft), new Date().toISOString()).run();
    return Response.json({ saved: draft.mode }, { headers: noStore });
  } catch { return new Response('Priority preview storage failed. Try again later.', { status: 503 }); }
}
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
    if (url.pathname === '/api/priority-preview') return priorityPreview(request, env);
    if (url.pathname === '/priority-review.html' && !isAdmin(request, env)) return new Response('Admin access required', { status: 403 });
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
      // The saved GMS capture predates the reset baseline and reports two unlocked Stats.
      // Keep the two copies in sync before sending either world to Maple Scouter.
      if (!payload.userStat?.hexa) return new Response('Configured Hoyoung request is missing HEXA data', { status: 503 });
      if (kms && (!fixedBaseline(payload.myHexa) || !fixedBaseline(payload.userStat?.hexa))) {
        return new Response('Configured KMS request must use the fixed level-one Origin baseline', { status: 503 });
      }
      if (!kms) {
        payload.myHexa.hexaStat = 0;
        payload.userStat.hexa.hexaStat = 0;
        payload.myHexa.hexaStat_opened = false;
        payload.userStat.hexa.hexaStat_opened = false;
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
        if (!upstream.ok) return new Response([429, 430].includes(upstream.status)
          ? `Maple Scouter returned ${upstream.status}. Wait a few minutes before checking again.`
          : `Maple Scouter returned ${upstream.status}`, { status: 502 });
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
