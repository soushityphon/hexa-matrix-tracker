import assert from 'node:assert/strict';
import {scouterPolicySnapshot,inspectScouterRequestPolicy,createScouterRequestPolicy} from '../scouter-request-policy.js';
import {acquireReviewedScouterOrder} from '../scouter-order-acquisition.js';
import {discoverySelection} from '../scouter-discovery.js';

// Synthetic fixtures and server reviews, never evidence for a live job.
const job='테스트';
const skills=['skillCore1','masteryCore1','generalCore1','generalCore2'].map(coreId=>({coreId,sourceName:coreId,
  icon:`https://maplescouter.com/hexaskill/${coreId}.png`,costs:{freeBaseLevel:coreId==='skillCore1'?1:0,
    levels:Array.from({length:30},(_,i)=>({level:i+1,erda:1,frags:3}))}}));
const catalogue={job,selection:discoverySelection('KMS','Heroic'),skills,placeholders:[{coreId:'skillCore4',sourceName:'Placeholder'}]};
const hexa={character_class:job,skillCore1:'1',masteryCore1:'0',generalCore2:'0',skillCore4:'0',hexaStat:0,hexaStat_opened:false,
  hexaSkill:{skillCore1:1,masteryCore1:0},hexaSkill_general:{generalCore1:0,generalCore2:0},
  hexaSkill_used:{sole_Erda:0,sole_ErdaPrice:0}};
const payload={myHexa:structuredClone(hexa),userStat:{hexa:structuredClone(hexa),stat:{myClass:job,attack:42,passiveSkillLevelUp:1},isGMS:false},
  sole:false,specEff:{attack:0.1},merType:1,start:true,cycle:'3',id:'PRIVATE_ID'};
async function syntheticReview(body=payload,source=catalogue) {
  const snapshot=await scouterPolicySnapshot(body,source);
  return {schema:1,job:snapshot.job,region:snapshot.region,world:snapshot.world,...snapshot,
    benchmarkEvidence:{kind:'genuine-job-profile-and-efficiencies',job:snapshot.job,region:snapshot.region,
      benchmarkFingerprint:snapshot.benchmarkFingerprint,profileSha256:'a'.repeat(64),efficienciesSha256:'b'.repeat(64),capturedAt:'2026-09-30T00:00:00Z'},
    resetEvidence:{kind:'controlled-all-three-stat-reset',job:snapshot.job,region:snapshot.region,world:snapshot.world,
      preparedBodyFingerprint:snapshot.preparedBodyFingerprint,resetFingerprint:snapshot.resetFingerprint,
      responseSha256:'c'.repeat(64),capturedAt:'2026-09-30T00:00:00Z',zeroToTwentyStats:[1,2,3]}};
}
const review=await syntheticReview();
assert.deepEqual(await inspectScouterRequestPolicy(payload,catalogue,review),{passed:true,blockers:[],publishable:false});
assert.equal(await createScouterRequestPolicy(review)(payload,catalogue),true);
// The reviewed asymmetric inventory must pass without adding top General 1 or
// a nested placeholder. Passive-skill statistics are preserved, not reset.
assert.equal(payload.userStat.stat.passiveSkillLevelUp,1);
for(const change of [
  p=>{delete p.myHexa.masteryCore1;},p=>{delete p.userStat.hexa.hexaSkill_general.generalCore1;},
  p=>{p.myHexa.skillCore9='0';},p=>{p.userStat.hexa.hexaSkill.skillCore4=0;},
  p=>{p.myHexa.generalCore1='0';},p=>{p.myHexa.hiddenLevel=0;},p=>{p.userStat.newOption=false;},
  p=>{p.specEff.attack+=0.01;},p=>{p.userStat.stat.attack++;},p=>{p.userStat.stat.passiveSkillLevelUp=0;},
  p=>{p.myHexa.hexaSkill_used.sole_ErdaPrice++;},p=>{p.start=false;},p=>{p.merType=2;},p=>{p.cycle='4';},
  p=>{p.userStat.hexa.character_class='렌';},p=>{p.specEff.attack=Infinity;},p=>{p.id='OTHER_PRIVATE_ID';}
]) {
  const changed=structuredClone(payload);change(changed);
  const inspected=await inspectScouterRequestPolicy(changed,catalogue,review);
  assert.equal(inspected.passed,false);
  for(const secret of ['PRIVATE','OTHER','attack','hiddenLevel']) assert(!JSON.stringify(inspected).includes(secret));
}
for(const change of [r=>{delete r.benchmarkEvidence;},r=>{delete r.resetEvidence;},r=>{r.world='Interactive';},
  r=>{r.benchmarkEvidence.job='렌';},r=>{r.resetEvidence.region='GMS';},r=>{r.resetEvidence.zeroToTwentyStats=[1,2];},
  r=>{r.resetEvidence.zeroToTwentyStats=[1,2,2];},r=>{r.benchmarkEvidence.capturedAt='bad';},
  r=>{r.resetEvidence.responseSha256='bad';},r=>{r.catalogueFingerprint='d'.repeat(64);},r=>{r.requestShape={};},
  r=>{r.preparedBodyFingerprint='d'.repeat(64);},r=>{r.benchmarkEvidence.efficienciesSha256=null;}
]) {
  const changed=structuredClone(review);change(changed);
  assert.equal((await inspectScouterRequestPolicy(payload,catalogue,changed)).passed,false);
}
assert.equal((await inspectScouterRequestPolicy(payload,catalogue,undefined)).passed,false);
const changedSource=structuredClone(catalogue);changedSource.skills[0].sourceName='new source name';
assert.equal((await inspectScouterRequestPolicy(payload,changedSource,review)).passed,false);
const brokenSource=structuredClone(catalogue);brokenSource.skills.push(null);
assert.equal((await inspectScouterRequestPolicy(payload,brokenSource,review)).passed,false);
const boundReview=structuredClone(review), policy=createScouterRequestPolicy(boundReview);
boundReview.benchmarkEvidence.job='changed';
assert.equal(await policy(payload,catalogue),true);

let calls=0;
const rows=[['skillCore1',3,'/hexaskill/skillCore1.png',2,6,2,6,1,1.01,'skillCore1','Origin 1→3']];
for(let i=1;i<=3;i++) rows.push([`Stat ${i}`,20,`https://open.api.nexon.com/static/maplestory/skill/icon/stat${i}`,0,0,2,6,0,1,`hexaStat${i}`,'Stat 0→20']);
const options={review,apiKey:'PRIVATE_KEY',fetchImpl:async()=>{calls++;return Response.json({class_hexa:rows,privateProfile:'PRIVATE_RESPONSE'});}};
const result=await acquireReviewedScouterOrder(payload,catalogue,options);
assert.equal(calls,1);assert.equal(result.semanticReview,'matched-server-review');assert.equal(result.publishable,false);
for(const secret of ['PRIVATE_ID','PRIVATE_KEY','PRIVATE_RESPONSE']) assert(!JSON.stringify(result).includes(secret));
calls=0;
await assert.rejects(()=>acquireReviewedScouterOrder(payload,catalogue,{...options,review:undefined,validatePrepared:()=>true}));
assert.equal(calls,0,'A caller callback cannot bypass the concrete policy');
await assert.rejects(()=>acquireReviewedScouterOrder(payload,catalogue,{...options,fetchImpl:async()=>Response.json({class_hexa:rows.slice(0,3)})}),/reconstruction validation/);
// Four synthetic reviews demonstrate scoping, not regional game support.
for(const region of ['GMS','KMS']) for(const world of ['Heroic','Interactive']) {
  const body=structuredClone(payload);body.userStat.isGMS=region==='GMS';body.sole=world==='Interactive';
  const source={...catalogue,selection:discoverySelection(region,world)};
  assert.equal((await inspectScouterRequestPolicy(body,source,await syntheticReview(body,source))).passed,true);
  if(region!=='KMS'||world!=='Heroic') assert.equal((await inspectScouterRequestPolicy(body,source,review)).passed,false);
}
console.log('Concrete server request policy tests passed');
