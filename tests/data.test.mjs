import {COSTS,NODES,PRIORITIES,PRIORITY_SETTINGS} from '../data.js';
import {activeNodes,matrixTotals,nextCheckpoint,priorityRows,rangeCost,taotieCatchUp} from '../planner.js';
import {readFileSync} from 'node:fs';
const assert=(x,m)=>{if(!x)throw new Error(m)};
for(const [type,rows] of Object.entries(COSTS)){assert(rows.length===30,`${type} must have 30 levels`);for(const [i,c] of rows.entries()){assert(Number.isFinite(c.erda)&&Number.isFinite(c.frags),`${type} level ${i+1} invalid`)}}
const names=new Set(NODES.map(n=>n.short));
const sheetGroups={
  'Skill Nodes':[['Taotie','Sage: Liberated Taotie'],['Ascent','Heavenly World'],['Apotheosis','Sage: Apotheosis']],
  'Mastery Nodes':[['Scroll','Scroll: Vortex & Butterfly'],['Talisman','Talisman: Clone & Ghost'],['Basics','Basics Mastery'],['Harmony','Universal Harmony']],
  'Enhancement Nodes':[['Rampage','Sage: Maximum Clone Rampage'],['Tiger','Scroll: Tiger of Songyu'],['Wrath of Gods','Sage: Wrath of Gods'],['Apparition','Sage: Three Paths Apparition']],
  'Common Nodes':[['Janus','Sol Janus'],['Hecate','Sol Hecate'],['Lotus','Lotus Flower']]
};
assert(JSON.stringify(NODES.map(({group,short,name})=>[group,short,name]))===JSON.stringify(Object.entries(sheetGroups).flatMap(([group,nodes])=>nodes.map(([short,name])=>[group,short,name]))),'node labels and in-game order match the spreadsheet');
for(const [mode,steps] of Object.entries(PRIORITIES)){for(const s of steps){assert(names.has(s.skill)||s.skill.startsWith('HEXA Stat'),`${mode}: unknown skill ${s.skill}`);assert(s.level>=1&&s.level<=(s.skill.startsWith('HEXA Stat')?20:30),`${mode}: invalid level ${s.level}`)}}
assert(Object.keys(PRIORITIES).length===6,'Hecate, Lotus and Taotie Heroic/Interactive priorities required');
assert(Object.keys(PRIORITIES).every(mode=>PRIORITY_SETTINGS[mode]),'every priority has visibility and patch metadata');
assert(!PRIORITY_SETTINGS.hecate_heroic.enabled&&!PRIORITY_SETTINGS.lotus_interactive.enabled,'unverified priorities are hidden');
for(const mode of ['hecate_heroic','hecate_interactive','lotus_interactive']) assert(PRIORITIES[mode].length===0,`${mode}: unverified order must remain unpublished`);
const gms=JSON.parse(readFileSync(new URL('../data/scouter-gms-2026-09-28.json',import.meta.url)));
assert(JSON.stringify(PRIORITIES.lotus_heroic)===JSON.stringify(gms.steps.map(([skill,level])=>({skill,level}))),'Lotus Heroic matches captured GMS order');
assert(PRIORITIES.lotus_heroic.some(step=>step.skill==='Lotus')&&PRIORITIES.lotus_heroic.every(step=>step.skill!=='Taotie'),'GMS Lotus includes Lotus but no Taotie');
assert(PRIORITIES.taotie_heroic.length===178&&PRIORITIES.taotie_interactive.length===78,'Maple Scouter KMS checkpoint counts');
const scouter=JSON.parse(readFileSync(new URL('../data/scouter-kms-2026-09-28.json',import.meta.url)));
const iconToSkill=Object.fromEntries(NODES.filter(n=>n.short!=='Janus').map(n=>[(n.short==='Hecate'?'G':'H')+n.icon.match(/_(\d+)\.png$/)[1],n.short]));
for(const [world,mode] of [['heroic','taotie_heroic'],['interactive','taotie_interactive']]){
  const sourceSteps=scouter[world].split(' ').map(entry=>{const [id,level]=entry.split(':');return {skill:iconToSkill[id],level:Number(level)}});
  assert(JSON.stringify(PRIORITIES[mode])===JSON.stringify(sourceSteps),`${mode}: published order must match Maple Scouter capture`);
}
for(const [mode,steps] of Object.entries(PRIORITIES)){
  const active=new Set(activeNodes(mode).map(node=>node.short));
  assert(steps.every(step=>step.skill.startsWith('HEXA Stat')||active.has(step.skill)),`${mode}: inaccessible node`);
  const full=Object.fromEntries(activeNodes(mode).map(node=>[node.short,30]));
  Object.assign(full,{'HEXA Stat I':20,'HEXA Stat II':20,'HEXA Stat III':20});
  assert(nextCheckpoint(full,mode).next===null,`${mode}: maxed nodes should complete priority`);
  assert(matrixTotals(full,mode).percent===100,`${mode}: maxed nodes should have 100% completion`);
}
assert(rangeCost('Harmony',0,1).frags===50,'Mastery unlock cost');
assert(rangeCost('Harmony',1,6).frags===101,'Mastery intermediate cost');
assert(matrixTotals({Harmony:1},'lotus_heroic').spent.frags===50,'spent cost should use entered level');
assert(matrixTotals({Taotie:30},'lotus_heroic').spent.frags===0,'future node excluded from current GMS totals');
assert(matrixTotals({Lotus:30},'hecate_heroic').spent.frags===0,'Lotus excluded from Hecate totals');
assert(PRIORITIES.taotie_heroic.some(step=>step.skill==='Lotus')&&PRIORITIES.taotie_heroic.some(step=>step.skill==='Hecate'),'Taotie order contains older skills');
assert(matrixTotals({Taotie:1},'taotie_heroic').spent.frags===140,'future node included in preview totals');
const caughtUp={Harmony:6,Talisman:2,Apparition:1,Hecate:1,Taotie:0};
assert(taotieCatchUp(caughtUp,'taotie_heroic')?.target===1,'Taotie catch-up target follows completed existing checkpoints');
assert(taotieCatchUp(caughtUp,'taotie_heroic')?.cost.frags===140,'Taotie catch-up includes unlock fragments');
const rows=priorityRows({},'taotie_heroic');
assert(rows.length===PRIORITIES.taotie_heroic.length,'priority table must show every checkpoint');
assert(rows[0].skill==='Harmony'&&rows[0].cost.frags===50,'first priority row includes unlock cost');
const harmonySix=rows.find(row=>row.skill==='Harmony'&&row.level===6);
assert(harmonySix.cost.frags===101,'later checkpoint costs only intervening levels');
assert(priorityRows({Harmony:6},'taotie_heroic')[0].done,'entered levels mark rows complete');
const outOfOrder={Harmony:0,Talisman:30,Scroll:30,Hecate:30};
const recommendation=nextCheckpoint(outOfOrder,'taotie_heroic');
assert(recommendation.next.skill==='Harmony'&&recommendation.next.level===1,'next upgrade ignores later completed nodes');
assert(recommendation.completed>recommendation.index,'progress counts checkpoints completed out of order');
const pending=priorityRows(outOfOrder,'taotie_heroic').filter(row=>!row.done);
assert(pending[0].skill==='Harmony'&&pending.every(row=>row.skill!=='Talisman'&&row.skill!=='Scroll'&&row.skill!=='Hecate'),'remaining priority removes completed nodes anywhere');
const partial=priorityRows({Harmony:4,Talisman:1,Scroll:1,Hecate:1},'taotie_heroic');
assert(partial.find(row=>row.skill==='Harmony'&&row.level===6).cost.frags===48,'checkpoint cost starts at actual level even when upgrades were out of order');
assert(matrixTotals({Janus:1},'lotus_heroic').spent.frags===0,'Sol Janus excluded by default');
assert(matrixTotals({Janus:1},'lotus_heroic',true).spent.frags===125,'Sol Janus included when selected');
import { compareDraft, currentDraft, parseSteps, validateDraft } from '../priority-draft.js';
import { inspectScouterResponse, resolveScouterResponse } from '../scouter-import.js';
const draft=validateDraft(currentDraft('taotie_heroic'));
assert(draft.steps.length===PRIORITIES.taotie_heroic.length,'review draft includes the current priority');
assert(compareDraft(draft).changedSteps===0,'unchanged draft has no step changes');
const nextVersion=validateDraft({...currentDraft('lotus_heroic'),mode:'lotus_heroic_20260928',sourceMode:'lotus_heroic',isNew:true,enabled:false,name:'Next GMS order'});
assert(nextVersion.isNew&&!nextVersion.enabled&&nextVersion.steps.length===PRIORITIES.lotus_heroic.length,'new version preserves the prior order and visibility choice');
assert(parseSteps('Harmony, 1\nHarmony, 6\nHEXA Stat I, 20').length===3,'draft parser accepts valid checkpoints');
for (const invalid of ['Harmony, 6\nHarmony, 1','Not a skill, 1','HEXA Stat I, 19']) {
  let rejected=false;
  try { parseSteps(invalid); } catch { rejected=true; }
  assert(rejected,`draft parser should reject ${invalid}`);
}
const statIcon='https://open.api.nexon.com/static/maplestory/skill/icon/KAPCLAPBMA';
const sample={class_hexa:[['화중군자 VI',1,'/hexaskill/Hoyeong_11.png',4,90,4,90,0.1,0.5,'generalCore3','0→1',0],['헥사스탯3: 떡작',1,statIcon,0,0,0,0,0,0,'hexastat3','0→1',0],['새 스킬',1,'/hexaskill/Hoyeong_99.png',4,90,8,180,0.1,0.6,'skillCore3','0→1',0]]};
const inspected=inspectScouterResponse(sample);
assert(inspected.unknown.length===1&&inspected.steps[0].skill==='Lotus','import maps known skill image and flags unfamiliar image');
assert(inspected.steps[1].skill==='HEXA Stat III'&&inspected.steps[1].level===20&&inspected.statIcons['HEXA Stat III']===statIcon,'HEXA Stat maps to a max-level checkpoint and retains its icon');
let blocked=false;try{resolveScouterResponse(inspected)}catch{blocked=true}
assert(blocked,'new skill needs admin naming');
const resolved=resolveScouterResponse(inspected,{[inspected.unknown[0].key]:{short:'New Skill',name:'New Skill Name',type:'Skill II'}});
assert(resolved.steps[2].skill==='New Skill'&&validateDraft({...currentDraft('taotie_heroic'),steps:resolved.steps,newNodes:resolved.newNodes,statIcons:resolved.statIcons}).newNodes[0].group==='Skill Nodes','new skill type and name pass review');
assert(validateDraft({...currentDraft('lotus_heroic'),statIcons:resolved.statIcons}).statIcons['HEXA Stat III']===statIcon,'draft preserves verified stat icon');
console.log('Data validation passed');
