import {COSTS,NODES,PRIORITIES} from '../data.js';
import {activeNodes,matrixTotals,nextCheckpoint,priorityRows,rangeCost,taotieCatchUp} from '../planner.js';
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
for(const [mode,steps] of Object.entries(PRIORITIES)){assert(steps.length>0,`${mode} empty`);for(const s of steps){assert(names.has(s.skill)||s.skill.startsWith('HEXA Stat'),`${mode}: unknown skill ${s.skill}`);assert(s.level>=1&&s.level<=(s.skill.startsWith('HEXA Stat')?20:30),`${mode}: invalid level ${s.level}`)}}
assert(Object.keys(PRIORITIES).length===4,'current Lotus and future Taotie Heroic/Interactive priorities required');
for(const [mode,steps] of Object.entries(PRIORITIES)){
  for(const stat of ['HEXA Stat I','HEXA Stat II','HEXA Stat III']){
    assert(steps.filter(step=>step.skill===stat&&step.level===20).length===1,`${mode}: ${stat} should occur once`);
  }
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
assert(matrixTotals({Taotie:1},'taotie_heroic').spent.frags===140,'future node included in preview totals');
const caughtUp={Harmony:6,Talisman:4,Scroll:5,Hecate:1,'HEXA Stat I':20,Taotie:0};
assert(taotieCatchUp(caughtUp,'taotie_heroic')?.target===1,'Taotie catch-up target follows completed existing checkpoints');
assert(taotieCatchUp(caughtUp,'taotie_heroic')?.cost.frags===140,'Taotie catch-up includes unlock fragments');
const rows=priorityRows({},'lotus_heroic');
assert(rows.length===PRIORITIES.lotus_heroic.length,'priority table must show every checkpoint');
assert(rows[0].skill==='Harmony'&&rows[0].cost.frags===50,'first priority row includes unlock cost');
const harmonySix=rows.find(row=>row.skill==='Harmony'&&row.level===6);
assert(harmonySix.cost.frags===101,'later checkpoint costs only intervening levels');
assert(rows.find(row=>row.skill==='HEXA Stat I').cost===null,'stat priority has no fixed cost');
assert(priorityRows({Harmony:6},'lotus_heroic')[0].done,'entered levels mark rows complete');
const outOfOrder={Harmony:0,Talisman:30,Scroll:30,Hecate:30};
const recommendation=nextCheckpoint(outOfOrder,'lotus_heroic');
assert(recommendation.next.skill==='Harmony'&&recommendation.next.level===1,'next upgrade ignores later completed nodes');
assert(recommendation.completed>recommendation.index,'progress counts checkpoints completed out of order');
const pending=priorityRows(outOfOrder,'lotus_heroic').filter(row=>!row.done);
assert(pending[0].skill==='Harmony'&&pending.every(row=>row.skill!=='Talisman'&&row.skill!=='Scroll'&&row.skill!=='Hecate'),'remaining priority removes completed nodes anywhere');
const partial=priorityRows({Harmony:4,Talisman:1,Scroll:1,Hecate:1},'lotus_heroic');
assert(partial.find(row=>row.skill==='Harmony'&&row.level===6).cost.frags===48,'checkpoint cost starts at actual level even when upgrades were out of order');
assert(matrixTotals({Janus:1},'lotus_heroic').spent.frags===0,'Sol Janus excluded by default');
assert(matrixTotals({Janus:1},'lotus_heroic',true).spent.frags===125,'Sol Janus included when selected');
import { compareDraft, currentDraft, parseSteps, validateDraft } from '../priority-draft.js';
const draft=validateDraft(currentDraft('lotus_heroic'));
assert(draft.steps.length===PRIORITIES.lotus_heroic.length,'review draft includes the current priority');
assert(compareDraft(draft).changedSteps===0,'unchanged draft has no step changes');
assert(parseSteps('Harmony, 1\nHarmony, 6\nHEXA Stat I, 20').length===3,'draft parser accepts valid checkpoints');
for (const invalid of ['Harmony, 6\nHarmony, 1','Not a skill, 1','HEXA Stat I, 19']) {
  let rejected=false;
  try { parseSteps(invalid); } catch { rejected=true; }
  assert(rejected,`draft parser should reject ${invalid}`);
}
console.log('Data validation passed');
