// Server-only building block. No runtime route is enabled by this module.
import {scouterRequestContext} from './scouter-request-context.js';
import {reconstructScouterOrder} from './scouter-discovery.js';
import {createScouterRequestPolicy} from './scouter-request-policy.js';

function freeze(value) {
  if (value && typeof value === 'object') {Object.values(value).forEach(freeze); Object.freeze(value);}
  return value;
}

// Prefer this entry point for the future owner workflow. It always uses the
// concrete server policy, even if an options object contains validatePrepared.
// A review records past evidence; it is not a live-request budget/authorisation.
export async function acquireReviewedScouterOrder(payload, catalogue, {review, ...options} = {}) {
  const result = await acquireScouterOrder(payload, catalogue, {...options,validatePrepared:createScouterRequestPolicy(review)});
  const stats = result.steps.filter(step => /^hexaStat[1-3]$/i.test(step.coreId));
  if (stats.length !== 3 || new Set(stats.map(step => step.coreId.toLowerCase())).size !== 3 ||
      stats.some(step => step.from !== 0 || step.level !== 20)) throw new Error('Scouter response failed reconstruction validation');
  return {...result, semanticReview:'matched-server-review', publishable:false};
}
// validatePrepared is a trusted server policy, never a client assertion. It must
// establish genuine benchmark provenance and full outgoing semantics. Hashes
// alone are insufficient. No existing configured template is cleared here.
export async function acquireScouterOrder(payload, catalogue, {apiKey, validatePrepared, fetchImpl = globalThis.fetch, timeoutMs = 25_000} = {}) {
  if (typeof validatePrepared !== 'function' || typeof apiKey !== 'string' || !apiKey || !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 25_000) throw new Error('Scouter acquisition configuration required');
  const controller = new AbortController();
  let rejectDeadline;
  const deadline = new Promise((_, reject) => {rejectDeadline = reject;});
  const timer = setTimeout(() => {rejectDeadline(new Error('Scouter order acquisition timed out')); controller.abort();}, timeoutMs);
  const bounded = operation => Promise.race([operation, deadline]);
  try {
    // Validate finite JSON before serialisation can erase non-finite values.
    // Clone synchronously before any await, retaining the same body for hashing,
    // policy validation and transmission even if the caller mutates its input.
    const contextPromise = scouterRequestContext(payload);
    const body = freeze(structuredClone(payload));
    const sourceCatalogue = freeze(structuredClone(catalogue));
    const requestContext = await bounded(contextPromise);
    if (sourceCatalogue?.job !== requestContext.job || sourceCatalogue?.selection?.region !== requestContext.region || sourceCatalogue?.selection?.world !== requestContext.world) throw new Error('Scouter catalogue and prepared request differ');
    if (await bounded(Promise.resolve().then(() => validatePrepared(body, sourceCatalogue))) !== true) throw new Error('Scouter outgoing semantic validation required');
    const url = 'https://api.maplescouter.com/api/calc/hexa-order?class=' + encodeURIComponent(requestContext.job);
    const response = await bounded(fetchImpl(url, {method:'POST', redirect:'manual', credentials:'omit', signal:controller.signal,
      headers:{'Content-Type':'application/json', Accept:'application/json', 'api-key':apiKey, Origin:'https://maplescouter.com', Referer:'https://maplescouter.com/'}, body:JSON.stringify(body)}));
    if (!response.ok) throw new Error(`Scouter order returned ${response.status}; stop without retries`);
    if (response.url && response.url !== url) throw new Error('Unexpected Scouter order redirect');
    const maxBytes = 3_000_000;
    if (Number(response.headers.get('Content-Length')) > maxBytes || !response.body) throw new Error('Scouter order body unavailable or oversized');
    const reader = response.body.getReader(), chunks = [];
    let bytes = 0, complete = false;
    try {
      while (true) {
        const part = await bounded(reader.read());
        if (part.done) {complete = true; break;}
        bytes += part.value.byteLength;
        if (bytes > maxBytes) throw new Error('Scouter order exceeds inspection limit');
        chunks.push(part.value);
      }
    } finally {
      if (!complete) void reader.cancel().catch(() => {});
      reader.releaseLock();
    }
    const capturedAt = new Date().toISOString();
    const data = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) {data.set(chunk,offset); offset += chunk.byteLength;}
    const digest = await bounded(crypto.subtle.digest('SHA-256',data));
    const sha256 = Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
    const result = reconstructScouterOrder(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(data)), sourceCatalogue, sourceCatalogue.selection, sourceCatalogue.sourceIconOverrides);
    if (result.issues.length) throw new Error('Scouter response failed reconstruction validation');
    // Raw responses can contain profiles. Return only the reconstruction's
    // selected source fields, never the full body, key or validator output.
    return {...result, requestContext, provenance:{catalogue:sourceCatalogue.provenance ?? {}, response:{url,capturedAt,sha256}}, publishable:false};
  } catch (error) {
    // Policy/transport/parser errors can contain private input. Do not echo them.
    const message = /^Scouter (?:order acquisition timed out|order returned \d+; stop without retries|response failed reconstruction validation|outgoing semantic validation required|catalogue and prepared request differ)$/.test(error?.message) ? error.message : 'Scouter order acquisition failed';
    throw new Error(message);
  } finally {clearTimeout(timer); controller.abort();}
}
