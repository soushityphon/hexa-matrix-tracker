import assert from 'node:assert/strict';
import { STAT_FD_ROWS, statProgress, validateStatLines, restoreStatLines } from '../hexa-stat.js';
import { nextCheckpoint, matrixTotals, setTrackerCatalogue, STAT_UNLOCK_COSTS } from '../planner.js';

// Independent transcription of issue #23 A/B/C/E percentage values.
const expected = [
  [4,8,8,3.022],[4,9,7,3.047],[3,9,8,3.054],[2,9,9,3.061],
  [4,10,6,3.073],[3,10,7,3.080],[2,10,8,3.086],[1,10,9,3.093],
  [0,10,10,3.099],[5,8,7,3.151],[5,9,6,3.177],[5,10,5,3.209],
  [6,7,7,3.287],[6,8,6,3.295],[6,9,5,3.309],[6,10,4,3.325],
  [7,7,6,3.490],[7,8,5,3.498],[7,9,4,3.504],[7,10,3,3.511],
  [8,6,6,3.854],[8,7,5,3.862],[8,8,4,3.876],[8,9,3,3.876],
  [8,10,2,3.882],[9,6,5,4.225],[9,7,4,4.232],[9,8,3,4.239],
  [9,9,2,4.245],[9,10,1,4.251],[10,5,5,4.755],[10,6,4,4.762],
  [10,7,3,4.770],[10,8,2,4.776],[10,9,1,4.783],[10,10,0,4.789]
];
assert.deepEqual(STAT_FD_ROWS, expected);
for (const [p,s,t,fd] of expected) {
  assert.equal(statProgress([p,s,t]).fd, fd);
  assert.equal(statProgress([p,t,s]).fd, fd);
}
let completeCount=0;
for(let p=0;p<=10;p++)for(let s=0;s<=10;s++)for(let t=0;t<=10;t++){
  const total=p+s+t, checked=validateStatLines([p,s,t]);
  assert.equal(checked.valid,total<=20);
  if(total<20)assert.equal(statProgress([p,s,t]).fd,null);
  if(total===20){completeCount++;assert.notEqual(statProgress([p,s,t]).fd,null);}
}
assert.equal(completeCount,66); // All ordered level-20 distributions are covered.
for(const lines of [[-1,0,0],[11,0,0],[1.5,0,0],['6',8,6],[NaN,0,0],[Infinity,0,0],[10,10,1],[],null]){
  assert.equal(validateStatLines(lines).valid,false);
  assert.deepEqual(statProgress(lines,17),{total:17,fd:null,hasLines:false});
}
assert.deepEqual(restoreStatLines(undefined,20),[null,null,null]);
assert.deepEqual(restoreStatLines(undefined,0),[0,0,0]);
assert.deepEqual(restoreStatLines([11,5,4],20),[null,null,null]);
assert.deepEqual(restoreStatLines([6,null,6],20),[6,null,6]);
assert.deepEqual(statProgress([6,null,6],20),{total:20,fd:null,hasLines:false});
assert.deepEqual(statProgress([6,8,5],20),{total:19,fd:null,hasLines:true});

const stats=Object.keys(STAT_UNLOCK_COSTS);
const order=stats.map(skill=>({skill,level:20}));
setTrackerCatalogue([]);
const before=matrixTotals({},'lotus_heroic',false,{},order);
assert.deepEqual(before.remaining,{erda:30,frags:560});
const totals=Object.fromEntries(stats.map(skill=>[skill,statProgress([6,8,6]).total]));
assert.equal(nextCheckpoint(totals,'lotus_heroic',order).next,null);
const after=matrixTotals(totals,'lotus_heroic',false,{},order);
assert.deepEqual(after.spent,before.remaining);
assert.equal(after.percent,before.percent);
totals[stats[1]]=19;
assert.equal(nextCheckpoint(totals,'lotus_heroic',order).next.skill,stats[1]);
console.log('HEXA Stat: exact 36 averages, all 66 distributions, bounds, legacy totals, priority and fixed unlock costs passed');
