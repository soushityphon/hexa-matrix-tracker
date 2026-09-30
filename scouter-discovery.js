// Read public source as data. Never evaluate downloaded JavaScript.
const coreKey = /^(skillCore|masteryCore|reinCore|generalCore)([1-9]\d*)$/;
const own = (object, key) => Object.hasOwn(object || {}, key);

function objectLiteral(source, start) {
  let depth = 0, quoted = false, escaped = false;
  for (let i = start; i < source.length; i++) {
    const c = source[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error('Incomplete source object');
}

// This subset accepts only literal records and primitive values, never expressions.
function literalRecord(source) {
  let offset = 0;
  function read() {
    while (/\s/.test(source[offset] || '') && offset < source.length) offset++;
    if (source[offset] === '"') {
      const match = /^"(?:[^"\\]|\\.)*"/.exec(source.slice(offset));
      if (!match) throw new Error('Invalid source string');
      offset += match[0].length;
      return JSON.parse(match[0]);
    }
    if (source[offset] === '{') {
      offset++;
      const result = Object.create(null);
      if (source[offset] === '}') { offset++; return result; }
      while (true) {
        const keyMatch = /^[\p{L}\p{N}_$]+/u.exec(source.slice(offset));
        const key = source[offset] === '"' ? read() : keyMatch?.[0];
        if (!key) throw new Error('Unknown source key syntax');
        if (keyMatch && source[offset] !== '"') offset += key.length;
        if (own(result, key)) throw new Error('Duplicate source key');
        if (source[offset++] !== ':') throw new Error('Expected source colon');
        result[key] = read();
        if (source[offset] === '}') { offset++; return result; }
        if (source[offset++] !== ',') throw new Error('Expected source comma');
      }
    }
    const match = /^(?:!0|!1|true|false|null|-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)/i.exec(source.slice(offset));
    if (!match) throw new Error('Non-literal source value');
    offset += match[0].length;
    return match[0] === '!0' ? true : match[0] === '!1' ? false : JSON.parse(match[0]);
  }
  const result = read();
  if (offset !== source.length) throw new Error('Trailing source expression');
  return result;
}

export function discoverSkillMetadata(source, job) {
  const start = source.indexOf('91178:');
  if (start < 0) throw new Error('Scouter job metadata module missing');
  const module = objectLiteral(source, source.indexOf('{', start));
  function group(name) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = new RegExp(`(?:^|[,{])(?:${escaped}|"${escaped}"):({)`).exec(module);
    if (!match) throw new Error(`Scouter job metadata missing: ${name}`);
    return literalRecord(objectLiteral(module, match.index + match[0].length - 1));
  }
  const shared = group('공용'), specific = group(job), skills = [], placeholders = [];
  for (const [key, value] of Object.entries({...shared, ...specific})) {
    const match = coreKey.exec(key);
    if (!match || typeof value.title !== 'string' || typeof value.url !== 'string') throw new Error('Unrecognised skill metadata');
    if (!value.url) { placeholders.push({coreId: key, sourceName: value.title}); continue; }
    if (!value.url.startsWith('/hexaskill/') || value.url.includes('..')) throw new Error('Unrecognised Scouter icon path');
    const category = {skillCore:'Skill',masteryCore:'Mastery',reinCore:'Enhancement',generalCore:'Common'}[match[1]];
    const tag = key === 'skillCore1' ? 'Origin' : key === 'skillCore2' ? 'Ascent' : match[1] === 'masteryCore' ? `M${match[2]}` : null;
    skills.push({coreId:key, sourceName:value.title, icon:new URL(value.url,'https://maplescouter.com').href, category, coreNumber:Number(match[2]), tag, shared:own(shared,key), availability:'frontend-candidate'});
  }
  if (!skills.some(s => s.coreId === 'skillCore1')) throw new Error('Origin metadata missing');
  return {job, skills, placeholders};
}

export function discoverCostSchedules(source) {
  const start = source.indexOf('60937:');
  if (start < 0) throw new Error('Scouter cost module missing');
  const module = objectLiteral(source, source.indexOf('{', start));
  const arrays = Object.create(null);
  for (const match of module.matchAll(/\b([a-zA-Z_$][\w$]*)=\[([\d,eE.+-]+)\]/g)) {
    const values = match[2].split(',').map(Number);
    if (values.length !== 31 || values[0] !== 0 || values.some((v,i) => !Number.isSafeInteger(v) || v < 0 || (i && v < values[i-1]))) throw new Error('Invalid cumulative cost schedule');
    arrays[match[1]] = values;
  }
  const schedules = Object.create(null);
  const entries = [...module.matchAll(/\{key:"([^"]+)",sole:([\w$]+),piece:([\w$]+),affectsSpec:(!(?:0|1))(?:,freeBaseLv:(\d+))?\}/g)];
  if (!entries.length) throw new Error('Scouter core schedule bindings missing');
  for (const [,key,erdaName,fragmentName,affectsSpec,freeBase] of entries) {
    const erda = arrays[erdaName], frags = arrays[fragmentName];
    if (!coreKey.test(key) || own(schedules,key) || !erda || !frags) throw new Error('Invalid source schedule binding');
    const freeBaseLevel = Number(freeBase || 0);
    if (freeBaseLevel !== (key === 'skillCore1' ? 1 : 0)) throw new Error('Unrecognised free baseline');
    schedules[key] = {coreId:key, freeBaseLevel, affectsBossing:affectsSpec === '!0', cumulative:{erda,frags},
      levels:erda.slice(1).map((v,i)=>({level:i+1,erda:v-erda[i],frags:frags[i+1]-frags[i]})), verification:'frontend-observed'};
  }
  // Detect changed binding syntax rather than silently losing a schedule.
  const mentioned = [...module.matchAll(/\{key:"([^"]+)",sole:/g)].map(m=>m[1]);
  if (mentioned.length !== entries.length) throw new Error('Unrecognised source schedule syntax');
  return schedules;
}

export function discoverIconOverrides(source) {
  const overrides = Object.create(null);
  for (const match of source.matchAll(/\b[\w$]+=\{(?=(?:skillCore|masteryCore|reinCore|generalCore)\d+:"\/hexaskill\/)/g)) {
    const record=literalRecord(objectLiteral(source,match.index+match[0].length-1));
    for (const [key,path] of Object.entries(record)) {
      if (!coreKey.test(key) || typeof path !== 'string' || !path.startsWith('/hexaskill/') || path.includes('..')) throw new Error('Invalid source icon override');
      const icon=new URL(path,'https://maplescouter.com').href;
      if (own(overrides,key) && overrides[key] !== icon) throw new Error('Conflicting source icon overrides');
      overrides[key]=icon;
    }
  }
  return overrides;
}

// Only a small allowlist leaves the private profile workflow.
export function inspectStatEvidence(profile, expectedJob) {
  const info = profile?.userApiData?.info;
  const stats = profile?.userSpecialData?.userHexaStatData;
  const scalar = profile?.userStat?.hexa?.hexaStat;
  const opened = profile?.userApiData?.hexaStat_opened;
  if (info?.character_class !== expectedJob || !Number.isInteger(info.character_level) || !Array.isArray(stats) ||
      !Number.isInteger(scalar) || scalar < 0 || typeof opened !== 'boolean' || typeof profile?.userStat?.isGMS !== 'boolean') throw new Error('Incomplete genuine Stat evidence');
  const cores = stats.map((stat,index) => {
    const levels = [stat.main_stat_level,stat.sub_stat_level_1,stat.sub_stat_level_2];
    if (levels.some(v=>!Number.isInteger(v)||v<0||v>10) || !Number.isInteger(stat.stat_grade) || stat.stat_grade < 0 || stat.stat_grade > 20 || levels.reduce((a,b)=>a+b,0) !== stat.stat_grade) throw new Error('Invalid Stat record');
    // Scouter's tooltip labels these by array index, not slot_id (often all 0).
    return {number:index+1, levels, grade:stat.stat_grade};
  });
  return {job:expectedJob, characterLevel:info.character_level, region:profile.userStat.isGMS ? 'GMS' : 'KMS', scalar, opened, cores,
    allThreeInvested:cores.length === 3 && cores.every(c=>c.grade>0),
    observedEmpty:cores.length === 0 && scalar === 0 && opened === false,
    backendResetProven:false};
}

export function discoverySelection(region, world) {
  if (!['GMS','KMS'].includes(region) || !['Heroic','Interactive'].includes(world)) throw new Error('Choose GMS/KMS and Heroic/Interactive');
  return {region,world,isGMS:region==='GMS',sole:world==='Interactive',material:world==='Interactive'?'Sol Erda':'Fragments'};
}

// Core IDs, not edited display names, identify this isolated reconstruction.
// iconOverrides must come from separately inspected source, never guessed aliases.
export function reconstructScouterOrder(response, catalogue, selection, iconOverrides = {}) {
  if (!Array.isArray(response?.class_hexa) || !response.class_hexa.length) throw new Error('Missing Scouter order');
  selection = discoverySelection(selection?.region, selection?.world);
  for (const field of ['standard','patch','class','character_class']) {
    if (response[field] != null && typeof response[field] !== 'string') throw new Error('Invalid source context');
  }
  if (response.hexa_updated != null && typeof response.hexa_updated !== 'boolean') throw new Error('Invalid source update flag');
  const previous = new Map(catalogue.skills.map(s=>[s.coreId,s.costs?.freeBaseLevel || 0]));
  const issues = [], steps = [];
  let cumulativeErda = 0, cumulativeFrags = 0;
  response.class_hexa.forEach((row,index)=>{
    if (!Array.isArray(row) || row.length < 11) throw new Error('Incomplete source checkpoint');
    const [sourceName,rawLevel,rawIcon,erda,frags,sumErda,sumFrags,efficiency,multiplier,coreId,transition] = row;
    if (typeof sourceName !== 'string' || typeof rawIcon !== 'string' || typeof coreId !== 'string' ||
        typeof transition !== 'string' || ![erda,frags,sumErda,sumFrags].every(n=>Number.isSafeInteger(n)&&n>=0)) throw new Error('Invalid source checkpoint fields');
    cumulativeErda += erda; cumulativeFrags += frags;
    if (cumulativeErda !== sumErda || cumulativeFrags !== sumFrags) issues.push({position:index+1,kind:'cumulative-materials'});
    const stat = /^hexaStat([1-6])$/i.exec(coreId);
    const skill = catalogue.skills.find(s=>s.coreId===coreId);
    const icon = new URL(rawIcon.replace(/^\.\//,'/'),'https://maplescouter.com').href;
    const from = previous.get(coreId) || 0;
    const level = stat ? 20 : rawLevel;
    if (!Number.isInteger(rawLevel)) throw new Error('Invalid raw checkpoint level');
    const validFD = Number.isFinite(efficiency) && efficiency >= 0 && Number.isFinite(multiplier) && multiplier > 0;
    if (!validFD) issues.push({position:index+1,kind:'invalid-fd-fields'});
    const step = {position:index+1,coreId,sourceName,icon,from,level,rawLevel,transition,
      sourceMaterials:{erda,frags},cumulative:{erda:sumErda,frags:sumFrags},
      fd:{efficiencyPer30Fragments:validFD?efficiency:null,relativeFactor:validFD?multiplier:null,interpretation:'observed-field-7-and-8'}};
    if (stat) {
      if (!/^https:\/\/open\.api\.nexon\.com\/static\/maplestory\/skill\/icon\/[A-Za-z0-9_-]+$/.test(icon)) throw new Error('Invalid Stat icon');
      step.materialBasis='RNG estimate';
      if (Number(stat[1])>3) issues.push({position:index+1,kind:'unverified-future-stat'});
      if (from || !transition.endsWith('0→20')) issues.push({position:index+1,kind:'unverified-stat-baseline'});
    } else {
      if (!skill || sourceName!==skill.sourceName || icon!==(iconOverrides[coreId]||skill.icon)) issues.push({position:index+1,kind:'response-identity'});
      if (!Number.isInteger(level) || level <= from || level > 30) throw new Error('Invalid skill checkpoint level');
      const costs=skill?.costs?.levels.slice(from,level);
      if (!costs || costs.length!==level-from) issues.push({position:index+1,kind:'missing-level-costs'});
      else if (costs.reduce((n,c)=>n+c.erda,0)!==erda || costs.reduce((n,c)=>n+c.frags,0)!==frags) issues.push({position:index+1,kind:'checkpoint-cost'});
      step.materialBasis='fixed checkpoint';
      if (validFD) step.fd.checkpointGainPercent=efficiency*frags/30;
    }
    previous.set(coreId,level); steps.push(step);
  });
  const reportedClass=response.class??response.character_class??null;
  if (reportedClass!==null && reportedClass!==catalogue.job) issues.push({kind:'returned-class'});
  return {schema:1,namespace:'isolated-scouter-discovery',job:catalogue.job,selection,
    source:{standard:response.standard??null,patch:response.patch??null,hexaUpdated:response.hexa_updated??null,reportedClass},
    steps,issues,reviewedOverrides:{},publishable:false};
}
