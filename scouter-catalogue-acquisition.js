// Server and CLI provider. Public source is parsed as data, never evaluated.
import {discoverSkillMetadata, discoverCostSchedules, discoverIconOverrides, discoverySelection} from './scouter-discovery.js';

const origin = 'https://maplescouter.com';
const maxResourceBytes = 3_000_000;
const maxTotalBytes = 12_000_000;
export function catalogueSelection(job, region, world) {
  if (typeof job !== 'string' || !job.trim() || job.length > 80 || /[\u0000-\u001f\u007f]/.test(job)) throw new Error('Scouter source job name required');
  return {job:job.trim(), selection:discoverySelection(region, world)};
}
export async function acquireScouterCatalogue(job, region, world, {fetchImpl = globalThis.fetch, timeoutMs = 25_000} = {}) {
  const selected = catalogueSelection(job, region, world);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 25_000) throw new Error('Invalid acquisition deadline');
  const controller = new AbortController();
  let rejectDeadline, totalBytes = 0;
  const deadline = new Promise((_, reject) => {rejectDeadline = reject;});
  const timer = setTimeout(() => {
    rejectDeadline(new Error('Scouter source acquisition timed out'));
    controller.abort();
  }, timeoutMs);
  const bounded = operation => Promise.race([operation, deadline]);
  async function read(url) {
    const response = await bounded(fetchImpl(url, {signal:controller.signal, redirect:'error', credentials:'omit', headers:{Accept:'text/html, application/javascript, text/javascript'}}));
    if (!response.ok) throw new Error(`Scouter source returned ${response.status}; stop without retries`);
    if (response.url && response.url !== url) throw new Error('Unexpected Scouter source redirect');
    const length = Number(response.headers.get('Content-Length'));
    if (length > maxResourceBytes) throw new Error('Source exceeds inspection limit');
    if (!response.body) throw new Error('Scouter source body missing');
    const reader = response.body.getReader(), chunks = [];
    let bytes = 0, complete = false;
    try {
      while (true) {
        const part = await bounded(reader.read());
        if (part.done) {complete = true; break;}
        bytes += part.value.byteLength; totalBytes += part.value.byteLength;
        if (bytes > maxResourceBytes || totalBytes > maxTotalBytes) throw new Error('Source exceeds inspection limit');
        chunks.push(part.value);
      }
    } finally {
      if (!complete) void reader.cancel().catch(() => {});
      reader.releaseLock();
    }
    const data = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) {data.set(chunk, offset); offset += chunk.byteLength;}
    const text = new TextDecoder('utf-8', {fatal:true}).decode(data);
    const hash = await bounded(crypto.subtle.digest('SHA-256', data));
    return {text, provenance:{url, capturedAt:new Date().toISOString(), sha256:Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2,'0')).join('')}};
  }
  try {
    const page = await read(origin + '/ko/hexa');
    const paths = [...new Set([...page.text.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)].map(match => match[1]))]
      .filter(path => path.startsWith('/_next/static/chunks/'))
      .map(path => {
        const url = new URL(path, origin);
        if (url.origin !== origin || !url.pathname.startsWith('/_next/static/chunks/') || url.search || url.hash) throw new Error('Unexpected public chunk path');
        return url.href;
      });
    // Module numbers are search hints. Current HTML supplies the filenames.
    paths.sort((a,b) => Number(!/\/(6352|7717)-|\/app\/.*hexa\/page-/.test(a)) - Number(!/\/(6352|7717)-|\/app\/.*hexa\/page-/.test(b)));
    let metadata, costs, icons;
    for (const url of paths.slice(0,45)) {
      const chunk = await read(url);
      if (!metadata && chunk.text.includes('91178:')) metadata = {...chunk, catalogue:discoverSkillMetadata(chunk.text, selected.job)};
      if (!costs && chunk.text.includes('60937:')) costs = {...chunk, schedules:discoverCostSchedules(chunk.text)};
      if (/\/app\/.*hexa\/page-/.test(url)) icons = {...chunk, overrides:discoverIconOverrides(chunk.text)};
      if (metadata && costs && icons) break;
    }
    if (!metadata || !costs || !icons) throw new Error('Required public modules not found; schema investigation needed');
    for (const skill of metadata.catalogue.skills) {
      if (!costs.schedules[skill.coreId]) throw new Error(`Missing cost schedule for ${skill.coreId}`);
      skill.costs = costs.schedules[skill.coreId];
    }
    return {schema:1, namespace:'isolated-scouter-discovery', selection:selected.selection, ...metadata.catalogue,
      provenance:{page:page.provenance, metadata:metadata.provenance, costs:costs.provenance, icons:icons.provenance},
      sourceIconOverrides:icons.overrides, reviewedOverrides:{}, orders:[], fd:[], publishable:false,
      limitations:['Region/patch availability requires a validated region-specific order', 'Stat costs remain RNG', 'No order request or storage write occurs in source acquisition']};
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}
