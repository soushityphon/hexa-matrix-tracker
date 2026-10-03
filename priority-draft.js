import {renSkillKey,renNode} from './ren-priority.js';
import { NODES, PRIORITIES, PRIORITY_LABELS, PRIORITY_SOURCES, PRIORITY_SETTINGS } from './data.js';

const byShort = new Map(NODES.map(node => [node.short, node]));
const statNames = new Set(['HEXA Stat I', 'HEXA Stat II', 'HEXA Stat III']);
const statIconPattern = /^https:\/\/open\.api\.nexon\.com\/static\/maplestory\/skill\/icon\/[A-Za-z0-9_-]+$/;

export function parseSteps(text, extraSkills = []) {
  const seen = new Map();
  const extra = new Set(extraSkills);
  return text.split(/\r?\n/).map((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return null;
    const match = trimmed.match(/^(.+?)\s*[,\t]\s*(\d+)$/);
    if (!match) throw new Error(`Line ${index + 1}: use Skill, level`);
    const skill = match[1].trim();
    const level = Number(match[2]);
    if (!byShort.has(skill) && !extra.has(skill) && !statNames.has(skill)) throw new Error(`Line ${index + 1}: unknown skill ${skill}`);
    const max = statNames.has(skill) ? 20 : 30;
    if (level < 1 || level > max) throw new Error(`Line ${index + 1}: ${skill} must be level 1 to ${max}`);
    if (statNames.has(skill) && level !== 20) throw new Error(`Line ${index + 1}: HEXA Stats use level 20 checkpoints`);
    if (level <= (seen.get(skill) || 0)) throw new Error(`Line ${index + 1}: ${skill} checkpoints must increase`);
    seen.set(skill, level);
    return { skill, level };
  }).filter(Boolean);
}

export function validateDraft(draft) {
  if(draft?.job==='렌')return validateRenDraft(draft);
  if (!draft || !Object.hasOwn(PRIORITIES, draft.sourceMode || draft.mode)) throw new Error('Choose an existing source priority');
  if (draft.isNew && (Object.hasOwn(PRIORITIES, draft.mode) || !/^[a-z0-9_]+$/.test(draft.mode))) throw new Error('New priority ID is invalid or already exists');
  if (!draft.isNew && draft.mode !== (draft.sourceMode || draft.mode)) throw new Error('Existing priority ID does not match its source');
  if (typeof draft.name !== 'string' || !draft.name.trim()) throw new Error('Enter a priority name');
  if (!Array.isArray(draft.steps) || !draft.steps.length) throw new Error('Import an order before saving this priority');
  const types = new Set(['Skill', 'Skill II', 'Mastery', 'V', 'Common', 'Common II']);
  const groups = { Skill: 'Skill Nodes', 'Skill II': 'Skill Nodes', Mastery: 'Mastery Nodes', V: 'Enhancement Nodes', Common: 'Common Nodes', 'Common II': 'Common Nodes' };
  const newNodes = (draft.newNodes || []).map(node => {
    if (!node || !node.short?.trim() || !node.name?.trim() || !types.has(node.type) || !/^https:\/\/maplescouter\.com\/hexaskill\/[\w/.-]+\.png$/.test(node.icon)) {
      throw new Error('Each new skill needs a short label, display name, type and Maple Scouter image');
    }
    const id = node.short.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (!id) throw new Error('Use a short label with Latin letters or numbers');
    return { id, short: node.short.trim(), name: node.name.trim(), type: node.type, group: groups[node.type], icon: node.icon, sourceName: String(node.sourceName || ''), coreId: String(node.coreId || '') };
  });
  const statIcons = {};
  for (const [skill, icon] of Object.entries(draft.statIcons || {})) {
    if (!statNames.has(skill) || !statIconPattern.test(icon)) throw new Error(`Invalid HEXA Stat icon for ${skill}`);
    statIcons[skill] = icon;
  }
  const shorts = newNodes.map(node => node.short);
  if (new Set(shorts).size !== shorts.length || new Set(newNodes.map(node => node.id)).size !== newNodes.length || shorts.some(short => byShort.has(short) || statNames.has(short)) || newNodes.some(node => NODES.some(existing => existing.id === node.id))) throw new Error('New skill short labels must be unique');
  const capturedCosts = draft.capturedCosts === undefined ? undefined : validateCapturedCosts(draft.capturedCosts);
  const steps = parseSteps(draft.steps.map(step => `${step.skill}, ${step.level}`).join('\n'), shorts);
  for (let index = 0; index < steps.length; index++) {
    const { fdGain, fdFrom, sourceCost } = draft.steps[index];
    const previousLevel = steps.slice(0, index).reverse().find(step => step.skill === steps[index].skill)?.level ?? (steps[index].skill === 'Apotheosis' ? 1 : 0);
    if (sourceCost !== undefined) {
      if (statNames.has(steps[index].skill) || !sourceCost || sourceCost.from !== previousLevel ||
          !Number.isInteger(sourceCost.erda) || sourceCost.erda < 0 ||
          !Number.isInteger(sourceCost.frags) || sourceCost.frags < 0) {
        throw new Error(`Invalid Scouter transition cost at step ${index + 1}`);
      }
      if (capturedCosts) {
        const expected = capturedCosts[steps[index].skill]?.levels.slice(previousLevel, steps[index].level).reduce((total, cost) => ({ erda: total.erda + cost.erda, frags: total.frags + cost.frags }), { erda: 0, frags: 0 });
        if (!expected || expected.erda !== sourceCost.erda || expected.frags !== sourceCost.frags) {
          throw new Error(`Scouter cost differs from its captured level schedule at step ${index + 1}; review the schedule before saving`);
        }
      }
      steps[index] = { ...steps[index], sourceCost: { from: previousLevel, erda: sourceCost.erda, frags: sourceCost.frags } };
    }
    if (fdGain === undefined && fdFrom === undefined) continue;
    if (statNames.has(steps[index].skill) || !Number.isFinite(fdGain) || fdGain < 0 || !Number.isInteger(fdFrom) || fdFrom < 0 || fdFrom >= steps[index].level) throw new Error(`Invalid source FD at step ${index + 1}`);
    const previousFdLevel = steps.slice(0, index).reverse().find(step => step.skill === steps[index].skill)?.level || 0;
    // Existing captures use zero for the first Origin step. Fresh scans use
    // its actual level-one baseline. Accept both without rewriting saved data.
    const firstOrigin = steps[index].skill === 'Apotheosis' && previousFdLevel === 0;
    if (fdFrom !== previousFdLevel && !(firstOrigin && fdFrom === 1)) throw new Error(`Source FD transition does not match step ${index + 1}`);
    steps[index] = { ...steps[index], fdFrom, fdGain };
  }
  if (capturedCosts && steps.some(step=>!statNames.has(step.skill) && !capturedCosts[step.skill])) throw new Error('Missing captured level schedule');
  const patch = PRIORITY_SETTINGS[draft.sourceMode || draft.mode].patch;
  if (steps.some(step => step.skill === 'Taotie') && patch !== 'taotie') throw new Error('Taotie steps need the Taotie patch');
  if (steps.some(step => step.skill === 'Lotus') && patch === 'hecate') throw new Error('Lotus steps are not in the Hecate patch');
  const names = {};
  const shortNames = {};
  for (const node of NODES) {
    const name = draft.names?.[node.short];
    if (typeof name !== 'string' || !name.trim()) throw new Error(`Enter a display name for ${node.short}`);
    names[node.short] = name.trim();
    // Older saved imports did not have a separate priority-list label.
    const shortName = draft.shortNames?.[node.short] ?? node.short;
    if (typeof shortName !== 'string' || !shortName.trim()) throw new Error(`Enter a short display name for ${node.short}`);
    shortNames[node.short] = shortName.trim();
  }
  const metadata = {};
  if (draft.pairId !== undefined) {
    if (typeof draft.pairId !== 'string' || !/^[a-z0-9_]+$/.test(draft.pairId) || !['GMS','KMS'].includes(draft.sourceRegion) || typeof draft.pairName !== 'string' || !draft.pairName.trim() || typeof draft.createdAt !== 'string' || !Number.isFinite(Date.parse(draft.createdAt))) throw new Error('Invalid priority pair metadata');
    Object.assign(metadata, {pairId:draft.pairId, pairName:draft.pairName.trim(), sourceRegion:draft.sourceRegion, createdAt:draft.createdAt});
  }
  for (const skill of statNames) {
    for (const [field, target] of [['names', names], ['shortNames', shortNames]]) {
      const value = draft[field]?.[skill];
      if (value !== undefined) { if (typeof value !== 'string' || !value.trim() || value.length > 120) throw new Error('Invalid Stat display name'); target[skill] = value.trim(); }
    }
  }
  const tags = {}, skillCategories = {};
  for (const node of [...NODES, ...[...statNames].map(short=>({short}))]) {
    if (draft.tags?.[node.short] !== undefined) {
      if (typeof draft.tags[node.short] !== 'string' || draft.tags[node.short].length > 120) throw new Error('Invalid skill tag');
      tags[node.short] = draft.tags[node.short];
    }
    if (draft.skillCategories?.[node.short] !== undefined) {
      if (!['Skill','Mastery','Enhancement','Common','HEXA Stat'].includes(draft.skillCategories[node.short])) throw new Error('Invalid skill category');
      skillCategories[node.short] = draft.skillCategories[node.short];
    }
  }
  return { ...(capturedCosts ? {capturedCosts,costProvenance:validateCostProvenance(draft.costProvenance)} : {}), tags, skillCategories, ...metadata, schema: 4, mode: draft.mode, sourceMode: draft.sourceMode || draft.mode, isNew: draft.isNew === true, enabled: draft.enabled === true, name: draft.name.trim(), source: String(draft.source || '').trim(), names, shortNames, steps, newNodes, statIcons };
}

export function currentDraft(mode) {
  return { schema: 4, mode, sourceMode: mode, isNew: false, enabled: PRIORITY_SETTINGS[mode].enabled, name: PRIORITY_LABELS[mode], source: PRIORITY_SOURCES[mode], names: Object.fromEntries(NODES.map(node => [node.short, node.name])), shortNames: Object.fromEntries(NODES.map(node => [node.short, node.short])), steps: PRIORITIES[mode], newNodes: [], statIcons: {} };
}

export function compareDraft(draft, current = PRIORITIES[draft.sourceMode || draft.mode] || []) {
  const changedNames = NODES.filter(node => draft.names[node.short] !== node.name || (draft.shortNames?.[node.short] ?? node.short) !== node.short).length;
  const changedSteps = draft.steps.filter((step, index) => step.skill !== current[index]?.skill || step.level !== current[index]?.level).length;
  return { changedNames, changedSteps, lengthDifference: draft.steps.length - current.length };
}

// Exact source schedules are snapshots, never inferred from checkpoint totals.
export function validateCapturedCosts(value,extraNodes=[]) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !Object.keys(value).length || Object.keys(value).length > 100) throw new Error('Invalid captured level schedules');
  const result = {};
  for (const [skill, schedule] of Object.entries(value)) {
    if ((!byShort.has(skill) && !extraNodes.some(node=>node.short===skill)) || !schedule || schedule.freeBaseLevel !== (extraNodes.find(node=>node.short===skill)?.initialLevel ?? (skill === 'Apotheosis' ? 1 : 0)) || !Array.isArray(schedule.levels) || schedule.levels.length !== 30) throw new Error('Invalid captured skill schedule');
    result[skill] = {freeBaseLevel:schedule.freeBaseLevel, levels:schedule.levels.map(cost=>{
      if (!cost || !Number.isSafeInteger(cost.erda) || cost.erda < 0 || !Number.isSafeInteger(cost.frags) || cost.frags < 0) throw new Error('Invalid captured level cost');
      return {erda:cost.erda,frags:cost.frags};
    })};
  }
  return result;
}
function validateCostProvenance(value) {
  if (!value || typeof value !== 'object' || !Number.isFinite(Date.parse(value.capturedAt)) || !Array.isArray(value.resources) || !value.resources.length) throw new Error('Captured cost provenance required');
  return {capturedAt:value.capturedAt,resources:value.resources.map(row=>{
    if (typeof row.url !== 'string' || !row.url.startsWith('https://maplescouter.com/') || !/^[a-f0-9]{64}$/.test(row.sha256)) throw new Error('Invalid captured cost provenance');
    return {url:row.url,sha256:row.sha256};
  })};
}

export function draftSettings(draft) {
  if(draft.job==='렌')return {class:'ren',patch:draft.sourceRegion.toLowerCase(),world:draft.sourceMode.endsWith('_heroic')?'heroic':'interactive',enabled:draft.enabled};
  return {...PRIORITY_SETTINGS[draft.sourceMode],class:'hoyoung'};
}
function validateRenDraft(draft) {
  if(!/^ren_(?:gms|kms)_(?:heroic|interactive)$/.test(draft.sourceMode)||!['GMS','KMS'].includes(draft.sourceRegion)||!draft.sourceMode.startsWith('ren_'+draft.sourceRegion.toLowerCase()+'_')||!draft.isNew||typeof draft.mode!=='string'||!/^[a-z0-9_]+$/.test(draft.mode)||typeof draft.name!=='string'||!draft.name.trim())throw new Error('Invalid Ren priority identity');
  if(!Array.isArray(draft.sourceSkills)||!draft.sourceSkills.length||draft.sourceSkills.length>100)throw new Error('Ren source skills required');
  const sourceSkills=draft.sourceSkills.map(source=>{
    const node=renNode(source);
    if(!node?.group||typeof source.sourceName!=='string'||!source.sourceName||!/^https:\/\/maplescouter\.com\/hexaskill\/[\w/.-]+\.png$/.test(source.icon)||source.freeBaseLevel!==(source.coreId==='skillCore1'?1:0))throw new Error('Invalid Ren source skill');
    return {coreId:source.coreId,sourceName:source.sourceName,icon:source.icon,category:source.category,freeBaseLevel:source.freeBaseLevel};
  });
  const nodes=sourceSkills.map(renNode),keys=new Set(nodes.map(node=>node.short));
  if(keys.size!==nodes.length)throw new Error('Duplicate Ren source skill');
  const capturedCosts=validateCapturedCosts(draft.capturedCosts,nodes);
  if(Object.keys(capturedCosts).some(key=>!keys.has(key))||nodes.some(node=>!capturedCosts[node.short]))throw new Error('Ren captured schedule inventory differs');
  if(!Array.isArray(draft.steps)||!draft.steps.length||draft.steps.length>1000)throw new Error('Ren order required');
  const previous=new Map(nodes.map(node=>[node.short,node.initialLevel]));
  const steps=draft.steps.map(step=>{
    const stat=statNames.has(step.skill),from=previous.get(step.skill)||0;
    if((!stat&&!keys.has(step.skill))||!Number.isInteger(step.level)||step.level<=from||step.level>(stat?20:30)||(stat&&step.level!==20))throw new Error('Invalid Ren checkpoint');
    previous.set(step.skill,step.level);
    if(stat)return {skill:step.skill,level:20};
    const cost=capturedCosts[step.skill].levels.slice(from,step.level).reduce((sum,c)=>({erda:sum.erda+c.erda,frags:sum.frags+c.frags}),{erda:0,frags:0});
    if(step.sourceCost?.from!==from||step.sourceCost.erda!==cost.erda||step.sourceCost.frags!==cost.frags)throw new Error('Ren checkpoint differs from its captured schedule');
    const fd={};
    if(step.fdGain!==undefined||step.fdFrom!==undefined){if(!Number.isFinite(step.fdGain)||step.fdGain<0||step.fdFrom!==from)throw new Error('Invalid Ren captured FD');Object.assign(fd,{fdGain:step.fdGain,fdFrom:step.fdFrom});}
    return {skill:step.skill,level:step.level,sourceCost:{from,...cost},...fd};
  });
  const statIcons={};for(const [skill,icon] of Object.entries(draft.statIcons || {})){if(!statNames.has(skill)||!statIconPattern.test(icon))throw new Error('Invalid Ren Stat icon');statIcons[skill]=icon;}
  if(steps.some(step=>statNames.has(step.skill)&&!statIcons[step.skill]))throw new Error('Missing Ren Stat icon');
  const statObservations=(draft.statObservations || []).map(row=>{
    if(!statNames.has(row.skill)||row.materialBasis!=='RNG estimate'||!['erda','frags'].every(key=>Number.isSafeInteger(row.sourceMaterials?.[key])&&row.sourceMaterials[key]>=0)||!((row.fd?.efficiencyPer30Fragments==null&&row.fd?.relativeFactor==null)||(Number.isFinite(row.fd?.efficiencyPer30Fragments)&&row.fd.efficiencyPer30Fragments>=0&&Number.isFinite(row.fd?.relativeFactor)&&row.fd.relativeFactor>0)))throw new Error('Invalid Ren Stat observation');
    return {skill:row.skill,sourceMaterials:{erda:row.sourceMaterials.erda,frags:row.sourceMaterials.frags},fd:{efficiencyPer30Fragments:row.fd.efficiencyPer30Fragments,relativeFactor:row.fd.relativeFactor,interpretation:row.fd.interpretation},materialBasis:'RNG estimate'};
  });
  const names={},shortNames={},tags={},skillCategories={};
  for(const key of [...keys,...statNames])for(const [field,target] of [['names',names],['shortNames',shortNames],['tags',tags],['skillCategories',skillCategories]])if(draft[field]?.[key]!==undefined){const value=draft[field][key];if(typeof value!=='string'||value.length>120||(field==='skillCategories'&&!['Skill','Mastery','Enhancement','Common','HEXA Stat'].includes(value)))throw new Error('Invalid Ren review field');target[key]=value;}
  if(typeof draft.pairId!=='string'||!/^[a-z0-9_]+$/.test(draft.pairId)||typeof draft.pairName!=='string'||!draft.pairName.trim()||!Number.isFinite(Date.parse(draft.createdAt)))throw new Error('Invalid Ren pair metadata');
  return {schema:5,job:'렌',sourceMode:draft.sourceMode,mode:draft.mode,isNew:true,name:draft.name.trim(),enabled:draft.enabled===true,pairId:draft.pairId,pairName:draft.pairName.trim(),sourceRegion:draft.sourceRegion,createdAt:draft.createdAt,source:String(draft.source || ''),sourceSkills,capturedCosts,costProvenance:validateCostProvenance(draft.costProvenance),steps,statIcons,statObservations,names,shortNames,tags,skillCategories,newNodes:[],captureProvenance:structuredClone(draft.captureProvenance || {}),requestContext:structuredClone(draft.requestContext || {})};
}
