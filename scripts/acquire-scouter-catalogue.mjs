import {createHash} from 'node:crypto';
import {discoverSkillMetadata,discoverCostSchedules,discoverIconOverrides,discoverySelection} from '../scouter-discovery.js';

const [job,region,world] = process.argv.slice(2);
if (!job) throw new Error('Usage: node scripts/acquire-scouter-catalogue.mjs JOB GMS|KMS Heroic|Interactive');
const selection=discoverySelection(region,world);
async function read(url) {
  const response=await fetch(url,{signal:AbortSignal.timeout(25000)});
  if (!response.ok) throw new Error(`Scouter source returned ${response.status}; stop without retries`);
  const text=await response.text();
  if (text.length>3000000) throw new Error('Source exceeds inspection limit');
  return {text,provenance:{url:response.url,capturedAt:new Date().toISOString(),sha256:createHash('sha256').update(text).digest('hex')}};
}
const page=await read('https://maplescouter.com/ko/hexa');
const paths=[...new Set([...page.text.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m=>m[1]))].filter(p=>p.startsWith('/_next/static/chunks/'));
// These module locations are hints only. Current HTML supplies the file hashes.
paths.sort((a,b)=>Number(!/\/(6352|7717)-|\/app\/.*hexa\/page-/.test(a))-Number(!/\/(6352|7717)-|\/app\/.*hexa\/page-/.test(b)));
let metadata,costs,icons;
for(const path of paths.slice(0,45)) {
  const chunk=await read(new URL(path,'https://maplescouter.com').href);
  if (!metadata && chunk.text.includes('91178:')) metadata={...chunk,catalogue:discoverSkillMetadata(chunk.text,job)};
  if (!costs && chunk.text.includes('60937:')) costs={...chunk,schedules:discoverCostSchedules(chunk.text)};
  if (/\/app\/.*hexa\/page-/.test(path)) icons={...chunk,overrides:discoverIconOverrides(chunk.text)};
  if (metadata && costs && icons) break;
}
if (!metadata || !costs || !icons) throw new Error('Required public modules not found; schema investigation needed');
const catalogue=metadata.catalogue;
for(const skill of catalogue.skills) {
  if (!costs.schedules[skill.coreId]) throw new Error(`Missing cost schedule for ${skill.coreId}`);
  skill.costs=costs.schedules[skill.coreId];
}
console.log(JSON.stringify({schema:1,namespace:'isolated-scouter-discovery',selection,...catalogue,
  provenance:{page:page.provenance,metadata:metadata.provenance,costs:costs.provenance,icons:icons.provenance},
  sourceIconOverrides:icons.overrides,
  reviewedOverrides:{},orders:[],fd:[],publishable:false,
  limitations:['Region/patch availability requires a validated region-specific order','Stat costs remain RNG','No order request or storage write occurs in this acquisition command']},null,2));
