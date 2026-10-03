import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {discoverSkillMetadata, discoverCostSchedules} from '../scouter-discovery.js';

// Inputs are freshly acquired public chunks, not canonical repository snapshots.
// Output is an isolated candidate catalogue, with no D1 or browser writes.
const [job, metadataPath, costsPath, capturedAt, metadataUrl, costsUrl] = process.argv.slice(2);
if (!job || !metadataPath || !costsPath || !capturedAt || !metadataUrl || !costsUrl) throw new Error('Usage: node scripts/discover-scouter-source.mjs JOB METADATA_JS COSTS_JS CAPTURED_AT METADATA_URL COSTS_URL');
if (!Number.isFinite(Date.parse(capturedAt))) throw new Error('Valid capture date required');
const read = (path,url) => {
  const parsed = new URL(url);
  if (parsed.origin !== 'https://maplescouter.com' || !parsed.pathname.startsWith('/_next/static/chunks/')) throw new Error('Scouter public chunk URL required');
  const content = readFileSync(path,'utf8');
  return {content, provenance:{url,capturedAt,sha256:createHash('sha256').update(content).digest('hex')}};
};
const metadata = read(metadataPath,metadataUrl), costs = read(costsPath,costsUrl);
const catalogue = discoverSkillMetadata(metadata.content,job), schedules = discoverCostSchedules(costs.content);
for (const skill of catalogue.skills) {
  if (!schedules[skill.coreId]) throw new Error(`Missing schedule: ${skill.coreId}`);
  skill.costs = schedules[skill.coreId];
}
console.log(JSON.stringify({schema:1, namespace:'isolated-scouter-discovery', ...catalogue,
  provenance:{metadata:metadata.provenance,costs:costs.provenance},
  reviewedOverrides:{}, orders:[], fd:[], publishable:false,
  limitations:['Region and patch availability need order verification','Stat costs remain RNG; no fixed roll schedule acquired','Backend Stat reset semantics require controlled verification','Priority and FD acquisition is not yet connected']},null,2));
