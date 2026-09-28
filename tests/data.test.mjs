import {COSTS,NODES,PRIORITIES} from '../data.js';
import {activeNodes,matrixTotals,nextCheckpoint,rangeCost,taotieCatchUp} from '../planner.js';
const assert=(x,m)=>{if(!x)throw new Error(m)};
for(const [type,rows] of Object.entries(COSTS)){assert(rows.length===30,`${type} must have 30 levels`);for(const [i,c] of rows.entries()){assert(Number.isFinite(c.erda)&&Number.isFinite(c.frags),`${type} level ${i+1} invalid`)}}
const names=new Set(NODES.map(n=>n.short));
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
console.log('Data validation passed');
