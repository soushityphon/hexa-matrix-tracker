import { NODES, STAT_ICONS, PRIORITY_SETTINGS } from './data.js';
import { validateDraft } from './priority-draft.js';

export const categories = ['Skill', 'Mastery', 'Enhancement', 'Common', 'HEXA Stat'];
export const defaultTags = { Apotheosis:'Origin', Ascent:'Ascent', Harmony:'M1', Basics:'M2', Talisman:'M3', Scroll:'M4' };
const categoryFor = node => ({'Skill Nodes':'Skill','Mastery Nodes':'Mastery','Enhancement Nodes':'Enhancement','Common Nodes':'Common','HEXA Stat':'HEXA Stat'})[node.group];
export function trackerSkill(source) {
  const number = /^hexastat([123])$/i.exec(source.coreId)?.[1];
  if (number) return {short:['HEXA Stat I','HEXA Stat II','HEXA Stat III'][Number(number)-1],group:'HEXA Stat'};
  return NODES.find(node => node.icon === (source.effectiveIcon || source.icon) || (node.short === 'Hecate' && source.coreId === 'generalCore2') || (node.short === 'Janus' && source.coreId === 'generalCore1'));
}
export function mergeSkills(catalogue, previous = [], drafts = {}) {
  const byCore = new Map(previous.map(row => [row.coreId, row]));
  const rows = [...previous];
  for (const raw of catalogue.skills) {
    const source = {...raw, ...(catalogue.sourceIconOverrides?.[raw.coreId] ? {effectiveIcon:catalogue.sourceIconOverrides[raw.coreId]} : {})};
    const existing = byCore.get(source.coreId);
    // Refresh source data without changing owner fields, including inactive rows.
    if (existing) { Object.assign(existing, { source }); continue; }
    const node = trackerSkill(source);
    const values = node ? Object.values(drafts).map(draft => ({name:draft.names?.[node.short] || '', shortName:draft.shortNames?.[node.short] || node.short})) : [];
    const unique = [...new Set(values.map(value => JSON.stringify(value)))].map(value => JSON.parse(value));
    rows.push({ coreId:source.coreId, source, name:unique.length === 1 ? unique[0].name : '', shortName:unique.length === 1 ? unique[0].shortName : '', category:values.length && node ? categoryFor(node) : (node?.group === 'HEXA Stat' ? 'HEXA Stat' : ''), tag:node ? defaultTags[node.short] || '' : '', conflicts:unique.length > 1 ? unique : [] });
  }
  return rows;
}
export function validateSkills(value) {
  if (value?.job !== '호영' || !Array.isArray(value.rows) || !value.rows.length || value.rows.length > 100) throw new Error('Hoyoung skill review required');
  const seen = new Set();
  const rows = value.rows.map(row => {
    if (!/^(?:(skillCore|masteryCore|reinCore|generalCore)\d+|hexastat[123])$/.test(row.coreId) || seen.has(row.coreId)) throw new Error('Invalid or duplicate skill identity');
    seen.add(row.coreId);
    const source = row.source;
    if (source?.coreId !== row.coreId || typeof source.sourceName !== 'string' || !(/^https:\/\/maplescouter\.com\/hexaskill\/[\w/.-]+\.png$/.test(source.icon) || (/^hexastat[123]$/.test(row.coreId) && /^https:\/\/open\.api\.nexon\.com\/static\/maplestory\/skill\/icon\/[A-Za-z0-9_-]+$/.test(source.icon)))) throw new Error('Invalid Scouter skill identity');
    for (const field of ['name','shortName','tag']) if (typeof row[field] !== 'string' || row[field].length > 120) throw new Error('Skill fields must be at most 120 characters');
    if ((/^hexastat/.test(row.coreId) && row.category !== 'HEXA Stat') || (!/^hexastat/.test(row.coreId) && row.category === 'HEXA Stat') || (row.category !== '' && !categories.includes(row.category))) throw new Error('Choose a valid skill category');
    // Retain every detected level cost for the reviewed catalogue.
    if (source.effectiveIcon && !/^https:\/\/maplescouter\.com\/hexaskill\/[\w/.-]+\.png$/.test(source.effectiveIcon)) throw new Error('Invalid source icon override');
    if (source.costs && (source.costs.levels?.length !== 30 || source.costs.levels.some((cost,i) => cost.level !== i+1 || !Number.isSafeInteger(cost.erda) || cost.erda < 0 || !Number.isSafeInteger(cost.frags) || cost.frags < 0))) throw new Error('Invalid source level costs');
    return {coreId:row.coreId, source, name:row.name.trim(), shortName:row.shortName.trim(), tag:row.tag.trim(), category:row.category};
  });
  return {schema:1, job:'호영', rows};
}
export function applySkills(drafts, review) {
  if (!review) return drafts;
  const rows = validateSkills(review).rows;
  return Object.fromEntries(Object.entries(drafts).map(([id,draft]) => {
    const names = {...draft.names}, shortNames = {...draft.shortNames}, tags = {...draft.tags}, skillCategories = {...draft.skillCategories};
    for (const row of rows) {
      const node = trackerSkill(row.source);
      if (!node || !row.name || !row.shortName || !row.category) continue;
      // Class identity is independent of region and priority version.
      names[node.short] = row.name; shortNames[node.short] = row.shortName; tags[node.short] = row.tag; skillCategories[node.short] = row.category;
    }
    return [id,{...draft,names,shortNames,tags,skillCategories}];
  }));
}
export function validatePair(value) {
  if (!value || !/^[a-z0-9_]+$/.test(value.id) || !value.name?.trim() || value.name.length > 120 || typeof value.enabled !== 'boolean' || !['GMS','KMS'].includes(value.region)) throw new Error('Enter a pair name and choose availability');
  const patch = value.region === 'GMS' ? 'lotus' : 'taotie';
  const createdAt = value.createdAt || new Date().toISOString();
  const drafts = ['heroic','interactive'].map(world => validateDraft({ ...value.orders?.[world], mode:`${value.id}_${world}`, sourceMode:`${patch}_${world}`, isNew:true, name:`${value.name.trim()} | ${world === 'heroic' ? 'Heroic' : 'Interactive'}`, enabled:value.enabled, pairId:value.id, pairName:value.name.trim(), sourceRegion:value.region, createdAt }));
  return drafts;
}
export function priorityGroups(drafts) {
  const groups = new Map();
  for (const draft of Object.values(drafts)) {
    const id = draft.pairId || draft.mode;
    if (!groups.has(id)) groups.set(id,{id,name:draft.pairName || draft.name,createdAt:draft.createdAt || draft.source?.match(/\d{4}-\d{2}-\d{2}/)?.[0] || '',drafts:[]});
    groups.get(id).drafts.push(draft);
  }
  return [...groups.values()].sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
}
export function orderMatches(steps, world, drafts) {
  return Object.values(drafts).filter(draft => PRIORITY_SETTINGS[draft.sourceMode]?.world === world && draft.steps.length === steps.length && draft.steps.every((step,i)=>step.skill === steps[i].skill && step.level === steps[i].level));
}

export function trackerCatalogue(review) {
  const result = {nodes:[], stats:[], pending:0};
  if (!review) return result;
  for (const row of validateSkills(review).rows) {
    const known = trackerSkill(row.source);
    if (!known || !row.name || !row.shortName || !row.category) {result.pending++; continue;}
    if (row.category === 'HEXA Stat') {
      result.stats.push({short:known.short,name:row.name,shortName:row.shortName,icon:row.source.icon,tag:row.tag}); continue;
    }
    if (!row.source.costs?.levels?.length) {result.pending++; continue;}
    result.nodes.push({...known,name:row.name,shortName:row.shortName,icon:row.source.effectiveIcon || row.source.icon,tag:row.tag,
      group:{Skill:'Skill Nodes',Mastery:'Mastery Nodes',Enhancement:'Enhancement Nodes',Common:'Common Nodes'}[row.category],
      costs:row.source.costs.levels.map(({erda,frags})=>({erda,frags})),initialLevel:row.source.costs.freeBaseLevel});
  }
  return result;
}
export function requireOrderSkills(drafts, review) {
  const model=trackerCatalogue(review), keys=new Set([...model.nodes,...model.stats].map(node=>node.short));
  if (drafts.some(draft=>draft.enabled && draft.steps.some(step=>!keys.has(step.skill)))) throw new Error('Save Skills with long/short names, categories and detected costs before making this priority available');
}
