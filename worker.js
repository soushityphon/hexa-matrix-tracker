// Bundled with the static files by scripts/build-worker.mjs.
import { validateDraft } from './priority-draft.js';
import { scouterRequestContext } from './scouter-request-context.js';
const mimeTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png' };
const scouterUrl = 'https://api.maplescouter.com/api/calc/hexa-order?class=%ED%98%B8%EC%98%81';
const noStore = { 'Cache-Control': 'no-store' };
function isAdmin(request, env) {
  return !!env?.ADMIN_EMAIL && request.headers.get('oai-authenticated-user-email')?.toLowerCase() === env.ADMIN_EMAIL.toLowerCase();
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
        } catch { /* An invalid saved version cannot be shown. */ }
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
// Each Scouter request starts from the job's fixed Origin baseline, regardless of
// the account levels in the saved template. Add other jobs' Origin IDs here only
// when their request schema has been verified.
const originByClass = { '호영': 'skillCore1' };
const coreKey = /^(?:skillCore|masteryCore|reinCore|generalCore)\d+$/;
const record = value => value && typeof value === 'object' && !Array.isArray(value);
function resetHexa(hexa, origin) {
  if (!record(hexa) || !record(hexa.hexaSkill) || !record(hexa.hexaSkill_general) ||
      !Object.hasOwn(hexa, 'hexaStat') || !Object.hasOwn(hexa, 'hexaStat_opened') ||
      !Object.hasOwn(hexa, origin) || !Object.hasOwn(hexa.hexaSkill, origin) ||
      !Number.isInteger(hexa.hexaStat) || hexa.hexaStat < 0 || typeof hexa.hexaStat_opened !== 'boolean') return false;
  hexa.hexaStat = 0;
  hexa.hexaStat_opened = false;
  for (const [key, value] of Object.entries(hexa)) {
    if (coreKey.test(key)) {
      if (!/^(?:0|[1-9]\d*)$/.test(String(value))) return false;
      hexa[key] = key === origin ? '1' : '0';
    }
  }
  for (const group of [hexa.hexaSkill, hexa.hexaSkill_general]) {
    for (const [key, value] of Object.entries(group)) {
      if (!coreKey.test(key) || !Number.isInteger(value) || value < 0) return false;
      group[key] = key === origin ? 1 : 0;
    }
  }
  return hexa.hexaStat === 0 && hexa.hexaStat_opened === false &&
    hexa[origin] === '1' && hexa.hexaSkill[origin] === 1 &&
    Object.entries(hexa).every(([key, value]) => !coreKey.test(key) || value === (key === origin ? '1' : '0')) &&
    [hexa.hexaSkill, hexa.hexaSkill_general].every(group =>
      Object.entries(group).every(([key, value]) => value === (key === origin ? 1 : 0)));
}

export function prepareScouterRequest(mode, env) {
  const kms = mode.startsWith('taotie_');
  const part1 = kms ? env?.MAPLE_SCOUTER_KMS_REQUEST_PART_1 : env?.MAPLE_SCOUTER_REQUEST_PART_1;
  const part2 = kms ? env?.MAPLE_SCOUTER_KMS_REQUEST_PART_2 : env?.MAPLE_SCOUTER_REQUEST_PART_2;
  if (!part1 || !part2) throw new Error('Maple Scouter request is not configured for this update');
  let payload;
  try { payload = JSON.parse(part1 + part2); }
  catch { throw new Error('Configured Maple Scouter request is invalid JSON'); }
  if (payload?.myHexa?.character_class !== '호영' || payload?.userStat?.stat?.myClass !== '호영' || payload?.userStat?.isGMS !== !kms) throw new Error('Configured Hoyoung request has the wrong class or region');
  if (!resetHexa(payload.myHexa, 'skillCore1') || !resetHexa(payload.userStat?.hexa, 'skillCore1')) throw new Error('Configured Hoyoung request cannot be reset to Origin 1, all other skills 0 and unopened HEXA Stats');
  payload.sole = mode.endsWith('_interactive');
  return payload;
}

// Values are allowlisted, not copied wholesale from a secret template. Unknown
// fields retain their paths/types but never their private strings or statistics.
export function inspectScouterRequest(payload) {
  const fields = [], issues = [];
  // Observed in both live Hoyoung templates on 30 September. This is a schema
  // fingerprint, not a claim that the inventories must mirror each other.
  const observed = {
    top: ['skillCore1','skillCore2','skillCore3','skillCore4','skillCore5','skillCore6','masteryCore1','masteryCore2','masteryCore3','masteryCore4','reinCore1','reinCore2','reinCore3','reinCore4','generalCore2','generalCore3','generalCore4'],
    hexaSkill: ['skillCore1','skillCore2','skillCore3','masteryCore1','masteryCore2','masteryCore3','masteryCore4','reinCore1','reinCore2','reinCore3','reinCore4'],
    hexaSkill_general: ['generalCore1','generalCore2','generalCore3']
  };
  const type = value => value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
  function walk(value, path = '') {
    const key = path.split('.').at(-1);
    const inHexa = /^(myHexa|userStat\.hexa)(\.|$)/.test(path);
    const knownLevel = inHexa && coreKey.test(key);
    if (knownLevel) {
      const relative = path.replace(/^(myHexa|userStat\.hexa)\./, '').split('.');
      const group = relative.length === 1 ? 'top' : relative.length === 2 ? relative[0] : '';
      if (!observed[group]?.includes(key)) issues.push({path, reason:'Unrecognised core or level location outside the observed Hoyoung schema'});
    }
    const knownStat = inHexa && ['hexaStat', 'hexaStat_opened'].includes(key);
    const row = { path: path || '$', type: type(value) };
    if ((knownLevel || knownStat) && ['number', 'boolean'].includes(typeof value)) row.value = value;
    else if (knownLevel && /^[0-9]+$/.test(value)) row.value = value;
    else if (['sole','userStat.isGMS'].includes(path)) row.value = value;
    else if (['myHexa.character_class','userStat.hexa.character_class','userStat.stat.myClass'].includes(path)) row.value = value === '호영' ? '호영' : '[redacted]';
    else if (typeof value !== 'object' || value === null) row.value = '[redacted]';
    fields.push(row);
    if (!knownLevel && !knownStat && !['hexaSkill','hexaSkill_general','myHexa','userStat.hexa'].includes(key) &&
        ((inHexa && /core|stat|level|opened|unlock/i.test(key)) || (!inHexa && /hexa|core|skill.*level/i.test(key)))) issues.push({ path, reason: 'Unrecognised HEXA or level field; value redacted, requires schema review' });
    if (value && typeof value === 'object') for (const [child, item] of Object.entries(value)) walk(item, Array.isArray(value) ? `${path}[${child}]` : path ? `${path}.${child}` : child);
  }
  walk(payload);
  const copies = ['myHexa','userStat.hexa'].map(path => {
    const h = path === 'myHexa' ? payload.myHexa : payload.userStat?.hexa;
    for (const [group, keys] of Object.entries(observed)) for (const key of keys) {
      if (!Object.hasOwn(group === 'top' ? h || {} : h?.[group] || {}, key)) issues.push({path: `${path}.${group === 'top' ? '' : group + '.'}${key}`, reason:'Missing core from the observed Hoyoung schema'});
    }
    const cores = Object.keys(h || {}).filter(k => coreKey.test(k)).sort();
    for (const key of cores) {
      const group = key.startsWith('generalCore') ? 'hexaSkill_general' : 'hexaSkill';
      if (!Object.hasOwn(h[group] || {}, key)) issues.push({ path: `${path}.${group}.${key}`, reason: 'Missing matching nested core' });
    }
    for (const group of ['hexaSkill','hexaSkill_general']) for (const key of Object.keys(h?.[group] || {})) if (!cores.includes(key)) issues.push({path:`${path}.${key}`,reason:'Missing matching top-level core'});
    return { path, cores, origin: h?.skillCore1 === '1' && h?.hexaSkill?.skillCore1 === 1, presentSkillsReset: cores.every(k => h[k] === (k === 'skillCore1' ? '1' : '0')), scalarStatReset: h?.hexaStat === 0 && h?.hexaStat_opened === false };
  });
  if (JSON.stringify(copies[0].cores) !== JSON.stringify(copies[1].cores)) issues.push({ path:'userStat.hexa', reason:'Core inventories differ between copies' });
  // Until the real schema is reviewed, a single scalar cannot prove Stats I-III.
  issues.push({ path:'myHexa.hexaStat', reason:'Scalar Stat fields do not independently prove all three Stats are zero and unopened; schema confirmation required' });
  return { fields, copies, issues, validatedForClassSubstitution: false, upstreamCalled: false, persisted: false };
}

async function requestDiagnostic(request, env) {
  const serviceToken = env?.SCOUTER_DIAGNOSTIC_TOKEN;
  const ownerService = typeof serviceToken === 'string' && serviceToken.length >= 32 && request.headers.get('Authorization') === `Bearer ${serviceToken}`;
  if (!isAdmin(request, env) && !ownerService) return new Response('Admin access required', {status:403, headers:noStore});
  if (request.method !== 'GET') return new Response('Method not allowed', {status:405, headers:noStore});
  const requests = await Promise.all(['lotus_heroic','lotus_interactive','taotie_heroic','taotie_interactive'].map(async mode => {
    try {
      const payload = prepareScouterRequest(mode, env);
      return { mode, ...inspectScouterRequest(payload), requestContext:await scouterRequestContext(payload) };
    }
    catch (error) { return {mode, error:error.message, validatedForClassSubstitution:false}; }
  }));
  return Response.json({requests}, {headers:noStore});
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/scouter-request-diagnostic') return requestDiagnostic(request, env);
    if (url.pathname === '/api/priority-preview') return priorityPreview(request, env);
    if (['/priority-review.html', '/scouter-request-diagnostic.html'].includes(url.pathname) && !isAdmin(request, env)) {
      return new Response('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Priority Review sign-in</title><main style="font:1rem system-ui;max-width:32rem;margin:12vh auto;padding:1.5rem"><h1>Priority Review</h1><p>Sign in as the site owner to edit priorities.</p><p><a href="/signin-with-chatgpt?return_to=%2Fpriority-review.html">Continue with ChatGPT</a></p><p><a href="/">Back to tracker</a></p></main></html>', { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }
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
      if (!env?.MAPLE_SCOUTER_API_KEY) return new Response('Maple Scouter request is not configured for this update', { status: 503 });
      try { payload = prepareScouterRequest(selection.mode, env); }
      catch (error) { return new Response(error.message, { status: 503 }); }
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
    const body = ext === '.png' && request.method !== 'HEAD' ? Uint8Array.from(atob(ASSETS[path]), char => char.charCodeAt(0)) : ASSETS[path];
    return new Response(request.method === 'HEAD' ? null : body, { headers: { 'Content-Type': mimeTypes[ext] || 'application/octet-stream', 'Cache-Control': ['.html', '.js', '.css'].includes(ext) ? 'no-store' : 'public, max-age=60' } });
  }
};
