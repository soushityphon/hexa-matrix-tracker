import assert from 'node:assert/strict';
import {prepareRankedProfileRequest,rankedProfileRequestContext} from '../scouter-profile-request.js';
// Synthetic evidence for validation only. No real profile or benchmark fixture.
const catalogue={job:'렌',skills:['skillCore1','skillCore2','masteryCore1','reinCore1','generalCore1','generalCore2'].map(coreId=>({coreId})),placeholders:[{coreId:'skillCore4'},{coreId:'generalCore4'}]};
const ranking={ranking:1,name:'synthetic-profile',job:'렌',level:287};
const profile={userApiData:{info:{character_name:ranking.name,character_class:'렌',character_level:287},hexaSkill:{skillCore1:17,skillCore2:9,masteryCore1:8,reinCore1:7,skillCore4:0},hexaSkill_general:{generalCore1:4,generalCore2:6,generalCore4:0},hexaSkill_used:{sole_Erda:123,sole_ErdaPrice:456},hexaStat_opened:true},userStat:{stat:{myClass:'렌',characterLevel:287,passiveSkillLevelUp:2},hexa:{skillCore1:'17',skillCore2:'9',skillCore4:'0',masteryCore1:'8',reinCore1:'7',generalCore2:'6',generalCore4:'0',hexaStat:3},isGMS:false,world:'synthetic-world',options:{price:789}},calculatedData:{specEfficiency:{gain:0.013,negative:-0.2}}};
const original=structuredClone(profile);
for(const region of ['GMS','KMS'])for(const world of ['Heroic','Interactive']){
 const options={sourceRegion:'KMS',region,world,allWorlds:true};
 const body=prepareRankedProfileRequest(profile,ranking,catalogue,options);
 assert.equal(body.userStat.stat.characterLevel,287);assert.equal(body.userStat.stat.passiveSkillLevelUp,2);
 assert.equal(body.userStat.world,profile.userStat.world);assert.deepEqual(body.specEff,profile.calculatedData.specEfficiency);
 assert.equal(body.userStat.isGMS,region==='GMS');assert.equal(body.sole,world==='Interactive');
 assert.equal(body.id,'');assert.equal(body.start,true);assert.equal(body.merType,1);assert.equal(body.cycle,'3');
 for(const hexa of [body.myHexa,body.userStat.hexa]){
  assert.equal(hexa.character_class,'렌');assert.equal(hexa.hexaStat,0);assert.equal(hexa.hexaStat_opened,false);
  for(const [key,value]of Object.entries(hexa))if(/Core\d+$/.test(key))assert.equal(value,key==='skillCore1'?'1':'0');
  for(const group of ['hexaSkill','hexaSkill_general'])for(const [key,value]of Object.entries(hexa[group]))assert.equal(value,key==='skillCore1'?1:0);
  assert.deepEqual(hexa.hexaSkill_used,profile.userApiData.hexaSkill_used);
 }
 const context=await rankedProfileRequestContext(body,'KMS');assert.equal(context.benchmarkSourceRegion,'KMS');assert.equal(context.region,region);
 assert.equal(context.semanticValidation,'regional-order-and-three-stat-response-verification-required');
 assert(!JSON.stringify(context).includes(ranking.name));
 body.userStat.stat.characterLevel=1;body.myHexa.hexaSkill.skillCore1=30;assert.deepEqual(profile,original);
}
const options={sourceRegion:'KMS',region:'KMS',world:'Heroic',allWorlds:true};
for(const mutate of [
 p=>{p.userStat.stat.myClass='호영';},p=>{p.userApiData.info.character_class='호영';},
 p=>{p.userStat.isGMS=true;},p=>{delete p.userApiData.hexaSkill.skillCore1;},
 p=>{p.userApiData.hexaSkill.skillCore4=1;},p=>{p.userStat.hexa.skillCore4='1';},p=>{p.userStat.hexa.newStatLevel=20;},
 p=>{p.userApiData.hexaSkill_general.generalCore99=0;},p=>{p.calculatedData.specEfficiency.gain=null;},
 p=>{p.userStat.hexa.masteryCore1='31';},p=>{p.userApiData.hexaStat_opened=1;},
 p=>{p.userApiData.hexaSkill_used.unknown=1;},p=>{p.userStat.hexa.hexaStat=4;}
]){const changed=structuredClone(profile);mutate(changed);assert.throws(()=>prepareRankedProfileRequest(changed,ranking,catalogue,options));}
for(const changed of [{...ranking,ranking:2},{...ranking,name:'other'},{...ranking,level:288},{...ranking,job:'호영'}])assert.throws(()=>prepareRankedProfileRequest(profile,changed,catalogue,options));
assert.throws(()=>prepareRankedProfileRequest(profile,ranking,catalogue,{...options,allWorlds:false}));
assert.throws(()=>prepareRankedProfileRequest(profile,ranking,catalogue,{...options,sourceRegion:'GMS'}));
console.log('Ranked profile request tests passed, synthetic data only');
