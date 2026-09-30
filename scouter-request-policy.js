// Server-only. Reviews must come from trusted server configuration, never a
// browser body. This verifies a reviewed request; it cannot create evidence.
import {scouterRequestContext} from './scouter-request-context.js';

const coreKey = /^(?:skillCore|masteryCore|reinCore|generalCore)[1-9]\d*$/;
const record = value => value && typeof value === 'object' && !Array.isArray(value);
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const date = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
const sameKeys = (actual, expected) => JSON.stringify([...actual].sort()) === JSON.stringify([...expected].sort());
function freeze(value) {
  if (value && typeof value === 'object') {Object.values(value).forEach(freeze); Object.freeze(value);}
  return value;
}
function shape(value, path = '$', output = {}) {
  output[path] = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
  if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) shape(child, `${path}/${JSON.stringify(key)}`, output);
  return output;
}
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (record(value)) return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  if (value === null || ['string','boolean'].includes(typeof value) || (typeof value === 'number' && Number.isFinite(value))) return value;
  throw new Error('Finite source data required');
}
async function hash(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(canonical({schema:1,scope:'policy-catalogue',value})));
  const result = await crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(result), b => b.toString(16).padStart(2,'0')).join('');
}

// An inspection snapshot is NOT a review. Keep it private until its complete
// field semantics, genuine benchmark construction and reset evidence are checked.
export async function scouterPolicySnapshot(payload, catalogue) {
  const body = structuredClone(payload), source = structuredClone(catalogue);
  return {...await scouterRequestContext(body), requestShape:shape(body), catalogueFingerprint:await hash(source)};
}

export async function inspectScouterRequestPolicy(payload, catalogue, review) {
  const blockers = new Set();
  const block = code => blockers.add(code);
  // Snapshot all three inputs before hashing. No caller mutation can change the
  // reviewed evidence or the fields that passed this inspection.
  let body, source, approved, snapshot;
  try {
    body = structuredClone(payload); source = structuredClone(catalogue); approved = structuredClone(review);
    if (approved !== undefined) canonical(approved);
    snapshot = await scouterPolicySnapshot(body, source);
  } catch { return {passed:false, blockers:['invalid-prepared-data'], publishable:false}; }
  const {job,region,world} = snapshot;
  if (source?.job !== job || source?.selection?.region !== region || source?.selection?.world !== world ||
      source.selection.isGMS !== body.userStat.isGMS || source.selection.sole !== body.sole ||
      source.selection.material !== (body.sole ? 'Sol Erda' : 'Fragments')) block('selection-conflict');

  // The observed frontend intentionally omits top-level General 1 (Janus).
  // Nested groups contain released metadata cores; top level also has explicit
  // empty placeholders. Do not demand symmetric inventories or add missing keys.
  const skills = source?.skills, placeholders = source?.placeholders;
  if (!Array.isArray(skills) || !Array.isArray(placeholders)) block('catalogue-inventory');
  else {
    const active = skills.map(s => s?.coreId), empty = placeholders.map(s => s?.coreId), all = [...active,...empty];
    if (all.some(key => !coreKey.test(key)) || new Set(all).size !== all.length || !active.includes('skillCore1')) block('catalogue-inventory');
    const top = all.filter(key => coreKey.test(key) && key !== 'generalCore1');
    const nested = active.filter(key => coreKey.test(key) && !key.startsWith('generalCore'));
    const general = active.filter(key => coreKey.test(key) && key.startsWith('generalCore'));
    for (const hexa of [body.myHexa,body.userStat.hexa]) {
      if (!sameKeys(Object.keys(hexa).filter(key => coreKey.test(key)),top) ||
          !sameKeys(Object.keys(hexa.hexaSkill),nested) || !sameKeys(Object.keys(hexa.hexaSkill_general),general)) block('incomplete-core-inventory');
    }
  }
  // Check concrete current wrapper options independently of evidence hashes.
  // Other options require a new source-backed policy, not silent acceptance.
  if (!sameKeys(Object.keys(body),['myHexa','specEff','sole','merType','start','cycle','userStat','id']) ||
      body.start !== true || body.merType !== 1 || body.cycle !== '3' || typeof body.id !== 'string' || !body.id ||
      !record(body.specEff) || !Object.keys(body.specEff).length || Object.values(body.specEff).some(v => typeof v !== 'number' || !Number.isFinite(v))) block('request-options');

  if (approved?.schema !== 1 || approved.job !== job || approved.region !== region || approved.world !== world) block('missing-scoped-review');
  if (!record(approved?.requestShape) || JSON.stringify(canonical(approved.requestShape)) !== JSON.stringify(canonical(snapshot.requestShape))) block('unreviewed-field-shape');
  for (const key of ['preparedBodyFingerprint','benchmarkFingerprint','resetFingerprint','catalogueFingerprint']) {
    if (!digest(approved?.[key]) || approved[key] !== snapshot[key]) block('reviewed-context-mismatch');
  }
  const benchmark = approved?.benchmarkEvidence;
  if (benchmark?.kind !== 'genuine-job-profile-and-efficiencies' || benchmark.job !== job || benchmark.region !== region ||
      benchmark.benchmarkFingerprint !== snapshot.benchmarkFingerprint || !digest(benchmark.profileSha256) || !digest(benchmark.efficienciesSha256) ||
      !date(benchmark.capturedAt)) block('genuine-benchmark-evidence-required');
  const reset = approved?.resetEvidence;
  if (reset?.kind !== 'controlled-all-three-stat-reset' || reset.job !== job || reset.region !== region || reset.world !== world ||
      reset.preparedBodyFingerprint !== snapshot.preparedBodyFingerprint || reset.resetFingerprint !== snapshot.resetFingerprint ||
      !digest(reset.responseSha256) || !date(reset.capturedAt) || !Array.isArray(reset.zeroToTwentyStats) ||
      !sameKeys(reset.zeroToTwentyStats,[1,2,3])) block('scoped-stat-reset-evidence-required');
  // Only fixed codes leave. No raw private fields, paths, identifiers or review
  // records appear in errors/output. Hashes are equality checks, not authenticity.
  return {passed:blockers.size === 0, blockers:[...blockers], publishable:false};
}

export function createScouterRequestPolicy(review) {
  // Capturing a server review is the trust boundary. This factory must never be
  // called with browser-provided assertions. No production review is seeded.
  let approved;
  try { approved = freeze(structuredClone(review)); }
  catch { throw new Error('Scouter server review configuration invalid'); }
  return async (payload,catalogue) => (await inspectScouterRequestPolicy(payload,catalogue,approved)).passed;
}
