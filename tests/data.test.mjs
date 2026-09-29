import {COSTS,NODES,PRIORITIES,PRIORITY_SETTINGS,STAT_ICONS} from '../data.js';
import {activeNodes,combinedSourceGain,displayPriorityRows,matrixTotals,nextCheckpoint,priorityRows,rangeCost,statRemainingCost,taotieCatchUp} from '../planner.js';
import {readFileSync} from 'node:fs';
const assert=(x,m)=>{if(!x)throw new Error(m)};
const assertEqual=(actual,expected,message)=>assert(JSON.stringify(actual)===JSON.stringify(expected),message);
for(const [type,rows] of Object.entries(COSTS)){assert(rows.length===30,`${type} must have 30 levels`);for(const [i,c] of rows.entries()){assert(Number.isFinite(c.erda)&&Number.isFinite(c.frags),`${type} level ${i+1} invalid`)}}
const names=new Set(NODES.map(n=>n.short));
const matrixGroups={
  'Skill Nodes':[['Apotheosis','Sage: Apotheosis'],['Ascent','Heavenly World'],['Taotie','Sage: Liberated Taotie']],
  'Mastery Nodes':[['Harmony','Universal Harmony'],['Basics','Basics Mastery'],['Talisman','Talisman: Clone & Ghost'],['Scroll','Scroll: Vortex & Butterfly']],
  'Enhancement Nodes':[['Rampage','Sage: Maximum Clone Rampage'],['Tiger','Scroll: Tiger of Songyu'],['Wrath of Gods','Sage: Wrath of Gods'],['Apparition','Sage: Three Paths Apparition']],
  'Common Nodes':[['Janus','Sol Janus'],['Hecate','Sol Hecate'],['Lotus','Lotus Flower']]
};
assert(JSON.stringify(NODES.map(({group,short,name})=>[group,short,name]))===JSON.stringify(Object.entries(matrixGroups).flatMap(([group,nodes])=>nodes.map(([short,name])=>[group,short,name]))),'current matrix follows the confirmed Scouter core layout');
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
const adjacent=[{skill:'Harmony',level:1},{skill:'Harmony',level:6},{skill:'Tiger',level:1},{skill:'Harmony',level:7},{skill:'HEXA Stat I',level:20}];
const adjacentUnmet=displayPriorityRows({Harmony:0},'taotie_heroic',adjacent);
assert(adjacentUnmet.length===4&&adjacentUnmet[0].level===6&&adjacentUnmet[0].endIndex===2&&adjacentUnmet[0].cost.frags===rangeCost('Harmony',0,6).frags,'adjacent unmet checkpoints merge with full intermediate cost');
const compact=displayPriorityRows({Harmony:3},'taotie_heroic',adjacent);
assert(compact.length===5&&compact[0].done&&compact[1].level===6&&compact[1].index===2&&compact[1].endIndex===2,'completed checkpoints stay separate and retain source positions');
assert(compact[1].cost.frags===rangeCost('Harmony',3,6).frags,'remaining row sums intermediate level costs');
assert(compact[3].skill==='Harmony'&&compact[3].level===7,'unmet intervening skills prevent merging');
assertEqual(compact[4].cost,{erda:5,frags:10,rng:true},'locked HEXA Stat I includes its fixed unlock and variable upgrades');
assert(adjacent.length===5&&nextCheckpoint({Harmony:3},'taotie_heroic',adjacent).next.level===6,'display compaction leaves exact source order and next checkpoint intact');
const interrupted=[{skill:'Scroll',level:2},{skill:'Hecate',level:1},{skill:'Scroll',level:4},{skill:'Tiger',level:1},{skill:'Scroll',level:6}];
const separated=displayPriorityRows({Scroll:0,Hecate:0},'taotie_heroic',interrupted);
assert(separated.length===5&&separated[0].level===2&&separated[2].level===4,'an unmet skill separates Scroll checkpoints');
const bridged=displayPriorityRows({Scroll:0,Hecate:1},'taotie_heroic',interrupted);
assert(bridged.length===4&&bridged[0].level===4&&bridged[0].index===1&&bridged[0].endIndex===3,'completed Hecate does not split a remaining Scroll run');
assert(bridged[1].done&&bridged[1].skill==='Hecate'&&bridged[2].skill==='Tiger'&&bridged[3].level===6,'full view retains completed rows and unmet Tiger separates later Scroll');
assert(bridged[0].cost.frags===rangeCost('Scroll',0,4).frags,'bridged cost sums all levels from the entered level');
const partialBridge=displayPriorityRows({Scroll:2,Hecate:1},'taotie_heroic',interrupted);
assert(partialBridge[0].done&&partialBridge[2].level===4&&partialBridge[2].cost.frags===rangeCost('Scroll',2,4).frags,'completed Scroll remains visible in full view and partial cost starts at level 2');
assert(nextCheckpoint({Scroll:0,Hecate:1},'taotie_heroic',interrupted).next.level===2&&interrupted[2].level===4,'display grouping preserves the first actionable step and source order');
const mixed=[{skill:'Harmony',level:1},{skill:'Ascent',level:1},{skill:'Harmony',level:6},{skill:'Rampage',level:1},{skill:'Harmony',level:7},{skill:'Lotus',level:1},{skill:'HEXA Stat I',level:20},{skill:'Hecate',level:1},{skill:'HEXA Stat I',level:20}];
const mixedRows=displayPriorityRows({Ascent:1,Rampage:1,Lotus:1,Hecate:1},'taotie_heroic',mixed);
assert(mixedRows.filter(row=>!row.done).length===2&&mixedRows[0].skill==='Harmony'&&mixedRows[0].level===7,'completed Skill, Enhancement and Common checkpoints do not split Mastery');
assertEqual(mixedRows.find(row=>row.skill==='HEXA Stat I').cost,{erda:5,frags:10,rng:true},'completed Common checkpoint does not split HEXA Stat unlock plus RNG rows');
assert(mixedRows.filter(row=>row.done).length===4,'full view retains completed checkpoints for Hide completed off');
const outOfOrder={Harmony:0,Talisman:30,Scroll:30,Hecate:30};
const recommendation=nextCheckpoint(outOfOrder,'taotie_heroic');
assert(recommendation.next.skill==='Harmony'&&recommendation.next.level===1,'next upgrade ignores later completed nodes');
assert(recommendation.completed>recommendation.index,'progress counts checkpoints completed out of order');
const pending=priorityRows(outOfOrder,'taotie_heroic').filter(row=>!row.done);
assert(pending[0].skill==='Harmony'&&pending.every(row=>row.skill!=='Talisman'&&row.skill!=='Scroll'&&row.skill!=='Hecate'),'remaining priority removes completed nodes anywhere');
const partial=priorityRows({Harmony:4,Talisman:1,Scroll:1,Hecate:1},'taotie_heroic');
assert(partial.find(row=>row.skill==='Harmony'&&row.level===6).cost.frags===48,'checkpoint cost starts at actual level even when upgrades were out of order');
const statOrder=[{skill:'HEXA Stat I',level:20},{skill:'HEXA Stat II',level:20},{skill:'HEXA Stat III',level:20}];
assertEqual(statRemainingCost('HEXA Stat I',{}),{erda:5,frags:10,rng:true});
assertEqual(statRemainingCost('HEXA Stat II',{}),{erda:10,frags:200,rng:true});
assertEqual(statRemainingCost('HEXA Stat III',{}),{erda:15,frags:350,rng:true});
assertEqual(statRemainingCost('HEXA Stat II',{}, {'HEXA Stat II':true}),{erda:0,frags:0,rng:true},'unlocked level zero owes only variable levelling costs');
assertEqual(statRemainingCost('HEXA Stat III',{'HEXA Stat III':4}),{erda:0,frags:0,rng:true},'positive levels imply unlock for old saved progress');
const statRows=displayPriorityRows({},'lotus_heroic',statOrder);
assertEqual(statRows.map(row=>[row.cost.erda,row.cost.frags]),[[5,10],[10,200],[15,350]],'each Stat keeps its own unlock cost');
assertEqual(displayPriorityRows({},'lotus_heroic',statOrder,{'HEXA Stat II':true})[1].cost,{erda:0,frags:0,rng:true},'separate unlocked control removes the fixed cost');
const withoutStats=matrixTotals({},'lotus_heroic',false,{},[]);
const withStats=matrixTotals({},'lotus_heroic',false,{},statOrder);
assertEqual(withStats.remaining.erda-withoutStats.remaining.erda,30);
assertEqual(withStats.remaining.frags-withoutStats.remaining.frags,560);
assertEqual(withStats.percent,withoutStats.percent,'completion percentage keeps its existing fixed skill calculation');
const statUnlockedTotals=matrixTotals({},'lotus_heroic',false,{'HEXA Stat I':true},statOrder);
assertEqual(statUnlockedTotals.spent.erda-withoutStats.spent.erda,5);
assertEqual(statUnlockedTotals.spent.frags-withoutStats.spent.frags,10);
assertEqual(statUnlockedTotals.remaining.frags-withoutStats.remaining.frags,550);
assert(matrixTotals({Janus:1},'lotus_heroic').spent.frags===0,'Sol Janus excluded by default');
assert(matrixTotals({Janus:1},'lotus_heroic',true).spent.frags===125,'Sol Janus included when selected');
assert(matrixTotals({},'lotus_heroic').spent.frags===0,'Apotheosis starts at level 1 without charging its unlock');
assert(matrixTotals({Apotheosis:1},'lotus_heroic').spent.erda===0,'Apotheosis level 1 is the initial baseline');
assert(matrixTotals({Apotheosis:2},'lotus_heroic').spent.frags===30,'later Apotheosis levels count from the initial baseline');
import { compareDraft, currentDraft, parseSteps, validateDraft } from '../priority-draft.js';
import { inspectScouterResponse, resolveScouterResponse } from '../scouter-import.js';
import { extractScouterOrder } from '../scouter-extract.js';
import { loadPreview, previewCatalog, matchingPriorityVersion, withCapturedGains } from '../preview-priorities.js';
import { LOTUS_GAINS } from '../source-gains.js';
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
assert(resolved.steps[0].fdGain===0.3&&resolved.steps[0].fdFrom===0,'Scouter efficiency becomes whole-step FD gain');
assert(!Object.hasOwn(resolved.steps[1],'fdGain'),'HEXA Stat does not receive estimated FD');
const withFd=validateDraft({...currentDraft('lotus_heroic'),steps:[{skill:'Harmony',level:1,fdFrom:0,fdGain:8.288333}]});
assert(withFd.steps[0].fdGain===8.288333,'validated draft retains source FD');
let invalidFd=false;try{validateDraft({...currentDraft('lotus_heroic'),steps:[{skill:'Harmony',level:1,fdFrom:1,fdGain:8}]})}catch{invalidFd=true}
assert(invalidFd,'incorrect transition must be rejected');
assert(resolved.steps[2].skill==='New Skill'&&validateDraft({...currentDraft('taotie_heroic'),steps:resolved.steps,newNodes:resolved.newNodes,statIcons:resolved.statIcons}).newNodes[0].group==='Skill Nodes','new skill type and name pass review');
assert(validateDraft({...currentDraft('lotus_heroic'),statIcons:resolved.statIcons}).statIcons['HEXA Stat III']===statIcon,'draft preserves verified stat icon');
const sourceRows={standard:'허수아비',class_hexa:[
  ['Harmony',1,'/hexaskill/Hoyeong_2.png',3,50,3,50,0,0,'masteryCore1','0→1',0],
  ['Harmony',6,'/hexaskill/Hoyeong_2.png',5,101,8,151,0,0,'masteryCore1','1→6',0]
]};
const extraction=extractScouterOrder(sourceRows,'taotie_heroic');
assert(extraction.count===2&&extraction.validation.issues.length===0,'extractor checks source checkpoint and cumulative costs');
assert(extraction.rows[1].materials.frags===101&&extraction.comparison.firstDifference===2,'extractor retains checkpoint costs and compares order');
assert(extractScouterOrder(sourceRows,'lotus_interactive').comparison.firstDifference===1,'extractor compares against an empty saved order');
assert(extractScouterOrder({...sourceRows,class_hexa:[sourceRows.class_hexa[0], [...sourceRows.class_hexa[1].slice(0,4), 100, ...sourceRows.class_hexa[1].slice(5)]]},'taotie_heroic').validation.issues.some(issue=>issue.kind==='material-cost'),'extractor flags incorrect source checkpoint cost');
assert(rangeCost('Ascent',0,1).frags===100,'Ascent uses its confirmed 5 Sol Erda / 100 Fragment unlock');
const captured=JSON.parse(readFileSync(new URL('../data/scouter-kms-taotie-fragment-extracted-2026-09-28.json',import.meta.url)));
assert(JSON.stringify(STAT_ICONS)===JSON.stringify(captured.statIcons),'HEXA Stat icons match the extracted KMS source');
const browserData=new Map();
const storage={getItem:key=>browserData.get(key)??null};
const disabled={...currentDraft('lotus_heroic'),enabled:false};
browserData.set('hexa-priority-preview-v1',JSON.stringify({lotus_heroic:disabled}));
assert(!previewCatalog(loadPreview(storage)).settings.lotus_heroic.enabled,'old browser preview remains available to migrate');
const localOrder={...currentDraft('lotus_interactive'),mode:'lotus_interactive_20260929',sourceMode:'lotus_interactive',isNew:true,name:'GMS Lotus Sol Erda test',enabled:true,steps:[{skill:'Harmony',level:1},{skill:'HEXA Stat I',level:20}]};
const localCatalog=previewCatalog({[localOrder.mode]:validateDraft(localOrder)});
assert(localCatalog.priorities[localOrder.mode].length===2&&localCatalog.settings[localOrder.mode].world==='interactive','new named version is available for the correct world');
assert(matchingPriorityVersion(localOrder.steps,'lotus_interactive',{[localOrder.mode]:localOrder})===localOrder.mode,'saved order matches its material context');
assert(matchingPriorityVersion(localOrder.steps,'lotus_heroic',{[localOrder.mode]:localOrder})===null,'a different material does not match');
const savedSameAsGitHub={...currentDraft('lotus_heroic'),name:'Saved Scouter Lotus',enabled:true};
assert(matchingPriorityVersion(PRIORITIES.lotus_heroic,'lotus_heroic',{lotus_heroic:savedSameAsGitHub})==='lotus_heroic','saved imported order is matched');
const savedNamedVersion={...nextVersion,name:'Saved named import'};
assert(matchingPriorityVersion(PRIORITIES.lotus_heroic,'lotus_heroic',{[savedNamedVersion.mode]:savedNamedVersion})===savedNamedVersion.mode,'a named saved version wins over an identical repository capture');
assert(matchingPriorityVersion(PRIORITIES.lotus_heroic,'lotus_heroic',{})===null,'repository capture cannot match without a saved import');
assert(nextCheckpoint({},localOrder.sourceMode,localCatalog.priorities[localOrder.mode]).next.skill==='Harmony','preview priority keeps exact checkpoint order');
assertEqual(priorityRows({},localOrder.sourceMode,localCatalog.priorities[localOrder.mode])[1].cost,{erda:5,frags:10,rng:true},'preview HEXA Stat checkpoint includes fixed unlock plus RNG');
assertEqual(previewCatalog({}),{priorities:{},labels:{},settings:{},sources:{}},'empty or failed shared storage has no runtime priority baseline');
assertEqual(Object.keys(previewCatalog({[localOrder.mode]:localOrder}).priorities),[localOrder.mode],'only saved imports are registered');
assert(!previewCatalog({lotus_heroic:disabled}).settings.lotus_heroic.enabled,'disabled saved versions stay hidden');
for (const mode of ['lotus_heroic','lotus_interactive']) {
  const steps=LOTUS_GAINS[mode].map(([skill,level])=>({skill,level}));
  const captured=withCapturedGains({sourceMode:mode,steps});
  assert(Math.abs(captured.steps[0].fdGain-8.288333)<0.00001,`${mode} exact captured order gets the first source gain`);
  assert(withCapturedGains({sourceMode:mode,steps:[...steps].reverse()}).steps[0].fdGain===undefined,`${mode} different order cannot inherit source gain`);
  const firstRow=displayPriorityRows({},mode,captured.steps)[0];
  assert(Math.abs(combinedSourceGain(captured.steps,firstRow,0)-captured.steps[0].fdGain)<1e-8,'full source transition has FD');
  assert(combinedSourceGain(captured.steps,firstRow,1)===null,'completed source transition has no remaining FD');
}
const joined=[{skill:'Harmony',level:1,fdFrom:0,fdGain:8},{skill:'Talisman',level:1,fdFrom:0,fdGain:2},{skill:'Harmony',level:6,fdFrom:1,fdGain:3}];
const joinedRow=displayPriorityRows({Talisman:1},'lotus_heroic',joined)[0];
assert(Math.abs(combinedSourceGain(joined,joinedRow,0)-11.24)<1e-8,'combined FD compounds complete source steps');
assert(combinedSourceGain(joined,joinedRow,2)===null,'partial source range does not claim a whole gain');
assert(combinedSourceGain([{skill:'Harmony',level:1,fdFrom:0,fdGain:8},{skill:'Harmony',level:6,fdFrom:1}],{...joinedRow,index:1,endIndex:2},0)===null,'missing source gain blocks a combined estimate');
console.log('Data validation passed');
