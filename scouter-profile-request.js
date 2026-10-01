// Server-only. Build from a genuine profile, never a renamed job template.
import { discoverySelection } from './scouter-discovery.js';
import { scouterRequestContext } from './scouter-request-context.js';
const record = value => value && typeof value === 'object' && !Array.isArray(value);
const coreKey = /^(?:skillCore|masteryCore|reinCore|generalCore)[1-9]\d*$/;
function finiteJSON(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (Array.isArray(value)) {value.forEach(finiteJSON);return;}
  if (record(value)) {Object.values(value).forEach(finiteJSON);return;}
  throw new Error('Profile must contain finite JSON data');
}
function checkInventory(group, required, optional, numeric) {
  if (!record(group) || required.some(key => !Object.hasOwn(group,key))) throw new Error('Profile core inventory is incomplete');
  for (const [key,value] of Object.entries(group)) {
    if (!required.includes(key) && !optional.includes(key)) throw new Error('Profile contains an unreviewed core');
    const valid = numeric ? Number.isInteger(value) : typeof value === 'string' && /^(?:0|[1-9]\d*)$/.test(value);
    if (!valid || Number(value)<0 || Number(value)>30 || (optional.includes(key) && Number(value)!==0)) throw new Error('Profile core level is invalid');
  }
}
/** Private output. A prepared request is not proof of regional order support. */
export function prepareRankedProfileRequest(profile, ranking, catalogue, {sourceRegion, region, world, allWorlds}) {
  finiteJSON(profile);finiteJSON(ranking);finiteJSON(catalogue);
  const selection=discoverySelection(region,world);
  if (!['KMS','GMS'].includes(sourceRegion) || allWorlds !== true) throw new Error('Explicit all-world ranking context required');
  const info=profile?.userApiData?.info, stat=profile?.userStat?.stat;
  if (!record(info) || !record(stat) || ranking?.ranking!==1 || ranking.job!==catalogue?.job ||
      ranking.name!==info.character_name || info.character_class!==catalogue.job || stat.myClass!==catalogue.job ||
      ranking.level!==info.character_level || !Number.isInteger(info.character_level) || info.character_level<260 ||
      profile.userStat.isGMS!==(sourceRegion==='GMS')) throw new Error('Rank 1 profile identity or source context differs');
  if (!Array.isArray(catalogue.skills) || !Array.isArray(catalogue.placeholders)) throw new Error('Source catalogue inventory required');
  const active=catalogue.skills.map(skill=>skill.coreId), placeholders=catalogue.placeholders.map(skill=>skill.coreId);
  if (new Set([...active,...placeholders]).size!==active.length+placeholders.length || [...active,...placeholders].some(key=>!coreKey.test(key)) || !active.includes('skillCore1')) throw new Error('Source catalogue core identity is invalid');
  const topRequired=[...active.filter(key=>key!=='generalCore1'),...placeholders];
  const top=profile.userStat.hexa;
  if (!record(top) || !Number.isInteger(top.hexaStat) || top.hexaStat<0 || top.hexaStat>3 ||
      Object.keys(top).some(key=>!coreKey.test(key) && key!=='hexaStat')) throw new Error('Profile HEXA schema needs review');
  checkInventory(Object.fromEntries(Object.entries(top).filter(([key])=>coreKey.test(key))),topRequired,[],false);
  if (placeholders.some(key=>Number(top[key])!==0)) throw new Error('Profile placeholder must remain empty');
  const api=profile.userApiData;
  checkInventory(api.hexaSkill,active.filter(key=>!key.startsWith('generalCore')),placeholders.filter(key=>!key.startsWith('generalCore')),true);
  checkInventory(api.hexaSkill_general,active.filter(key=>key.startsWith('generalCore')),placeholders.filter(key=>key.startsWith('generalCore')),true);
  if (typeof api.hexaStat_opened!=='boolean' || !record(api.hexaSkill_used) ||
      Object.keys(api.hexaSkill_used).sort().join(',')!=='sole_Erda,sole_ErdaPrice' ||
      Object.values(api.hexaSkill_used).some(value=>!Number.isFinite(value)||value<0)) throw new Error('Profile HEXA material schema needs review');
  const specEff=profile.calculatedData?.specEfficiency;
  if (!record(specEff) || !Object.keys(specEff).length || Object.values(specEff).some(value=>!Number.isFinite(value))) throw new Error('Genuine profile efficiencies required');
  // Mirrors public character-store merge. Preserve character statistics,
  // level, genuine world and material-price fields. Only HEXA levels and the
  // explicit calculation-region/material selectors change.
  const userStat=structuredClone(profile.userStat);
  userStat.hexa={...structuredClone(top),character_class:catalogue.job,
    ...Object.fromEntries(['hexaSkill','hexaSkill_general','hexaSkill_used','hexaStat_opened'].map(key=>[key,structuredClone(api[key])]))};
  for(const key of Object.keys(userStat.hexa)) if(coreKey.test(key)) userStat.hexa[key]=key==='skillCore1'?'1':'0';
  for(const group of ['hexaSkill','hexaSkill_general']) for(const key of Object.keys(userStat.hexa[group])) userStat.hexa[group][key]=key==='skillCore1'?1:0;
  userStat.hexa.hexaStat=0;userStat.hexa.hexaStat_opened=false;
  userStat.isGMS=selection.isGMS;
  // Current enhancement, full linkage, no Surge, cycle 3, standard benchmark.
  // Public frontend passes an empty custom-character ID for its default view.
  return {myHexa:structuredClone(userStat.hexa),specEff:structuredClone(specEff),sole:selection.sole,
    merType:1,start:true,cycle:'3',userStat,id:''};
}
export async function rankedProfileRequestContext(body, sourceRegion) {
  const context=await scouterRequestContext(body);
  if (!['GMS','KMS'].includes(sourceRegion)) throw new Error('Profile source region required');
  return {...context,provenance:'rank-1-public-profile-and-calculated-efficiencies',benchmarkSourceRegion:sourceRegion,
    semanticValidation:'regional-order-and-three-stat-response-verification-required'};
}
