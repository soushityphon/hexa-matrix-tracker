// Server-side only. Never include this module in the browser asset list.
// Hash the prepared body, not an unreset template or client-supplied context.
const coreKey = /^(?:skillCore|masteryCore|reinCore|generalCore)[1-9]\d*$/;
const record = value => value && typeof value === 'object' && !Array.isArray(value);
function canonical(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (record(value)) return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  throw new Error('Request context requires finite JSON data');
}
async function fingerprint(scope, value) {
  const bytes = new TextEncoder().encode(canonical({schema:1, scope, value}));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2,'0')).join('');
}
function baseline(hexa) {
  if (!record(hexa) || hexa.hexaStat !== 0 || hexa.hexaStat_opened !== false || hexa.skillCore1 !== '1') throw new Error('Request context requires a prepared reset body');
  const result = {hexaStat:0, hexaStat_opened:false, cores:{}};
  for (const [key,value] of Object.entries(hexa)) if (coreKey.test(key)) {
    if (value !== (key === 'skillCore1' ? '1' : '0')) throw new Error('Request context requires reset cores');
    result.cores[key] = value;
  }
  for (const group of ['hexaSkill','hexaSkill_general']) {
    if (!record(hexa[group])) throw new Error('Request context requires nested cores');
    result[group] = {};
    for (const [key,value] of Object.entries(hexa[group])) {
      if (!coreKey.test(key) || value !== (key === 'skillCore1' ? 1 : 0)) throw new Error('Request context requires reset nested cores');
      result[group][key] = value;
    }
  }
  if (hexa.hexaSkill.skillCore1 !== 1) throw new Error('Request context requires nested Origin');
  return result;
}
export async function scouterRequestContext(payload) {
  // Clone and validate the full JSON body before any asynchronous hashing.
  const body = JSON.parse(canonical(payload));
  const job = body?.myHexa?.character_class;
  if (typeof job !== 'string' || !job || body?.userStat?.hexa?.character_class !== job || body?.userStat?.stat?.myClass !== job || typeof body.userStat.isGMS !== 'boolean' || typeof body.sole !== 'boolean') throw new Error('Request context requires matching class and explicit selectors');
  const reset = {myHexa:baseline(body.myHexa), userStatHexa:baseline(body.userStat.hexa)};
  // Keep every non-HEXA option, statistic and identifier in the conservative
  // benchmark hash. A change can make context differ, never falsely equal.
  // Material selection is separate so both priorities can share a benchmark.
  const benchmark = structuredClone(body);
  delete benchmark.myHexa;
  delete benchmark.userStat.hexa;
  delete benchmark.sole;
  return {
    fingerprintSchema:1, job, region:body.userStat.isGMS?'GMS':'KMS', world:body.sole?'Interactive':'Heroic',
    benchmarkFingerprint:await fingerprint('benchmark',benchmark),
    resetFingerprint:await fingerprint('reset',reset),
    preparedBodyFingerprint:await fingerprint('prepared-body',body),
    provenance:'configured-server-template',
    semanticValidation:'not-established-by-fingerprints'
  };
}
