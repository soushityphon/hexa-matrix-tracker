import assert from 'node:assert/strict';
import {scouterRequestContext} from '../scouter-request-context.js';

const hexa = {character_class:'호영', skillCore1:'1', masteryCore1:'0', hexaStat:0, hexaStat_opened:false,
  hexaSkill:{skillCore1:1, masteryCore1:0}, hexaSkill_general:{generalCore1:0}};
const payload = {myHexa:structuredClone(hexa), userStat:{hexa:structuredClone(hexa),stat:{myClass:'호영',attack:12345},isGMS:false},
  sole:false, specEff:{attack:0.12},start:true,cycle:'3',merType:1,id:'PRIVATE_CHARACTER_ID'};
const raw = JSON.stringify(payload);
const base = await scouterRequestContext(payload);
assert.equal(JSON.stringify(payload),raw,'Fingerprinting must not mutate the outgoing request');
const reverse = value => Array.isArray(value)?value.map(reverse):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).reverse().map(([k,v])=>[k,reverse(v)])):value;
assert.deepEqual(await scouterRequestContext(reverse(payload)),base);
for (const field of ['benchmarkFingerprint','resetFingerprint','preparedBodyFingerprint']) assert.match(base[field],/^[a-f0-9]{64}$/);
assert.equal(base.semanticValidation,'not-established-by-fingerprints');
assert(!JSON.stringify(base).includes('PRIVATE_CHARACTER_ID'));
assert(!JSON.stringify(base).includes('12345'));
const material = await scouterRequestContext({...payload,sole:true});
assert.equal(material.world,'Interactive');
assert.equal(material.benchmarkFingerprint,base.benchmarkFingerprint);
assert.equal(material.resetFingerprint,base.resetFingerprint);
assert.notEqual(material.preparedBodyFingerprint,base.preparedBodyFingerprint);
for (const change of [p=>{p.userStat.stat.attack++;},p=>{p.specEff.attack++;},p=>{p.start=false;},p=>{p.cycle='4';},p=>{p.id='OTHER_PRIVATE_ID';},p=>{p.userStat.isGMS=true;}]) {
  const changed = structuredClone(payload); change(changed);
  const context = await scouterRequestContext(changed);
  assert.notEqual(context.benchmarkFingerprint,base.benchmarkFingerprint);
  assert.equal(context.resetFingerprint,base.resetFingerprint);
}
const inventory = structuredClone(payload);
inventory.myHexa.skillCore2='0';inventory.myHexa.hexaSkill.skillCore2=0;
assert.notEqual((await scouterRequestContext(inventory)).resetFingerprint,base.resetFingerprint);
for (const change of [p=>{p.myHexa.skillCore1='2';},p=>{p.userStat.hexa.hexaStat=3;},p=>{p.userStat.hexa.hexaStat_opened=true;},p=>{p.myHexa.hexaSkill.masteryCore1=1;},p=>{p.userStat.hexa.character_class='렌';},p=>{p.specEff.attack=Infinity;},p=>{p.userStat.isGMS='false';},p=>{p.sole=undefined;}]) {
  const invalid = structuredClone(payload); change(invalid);
  await assert.rejects(()=>scouterRequestContext(invalid));
}
console.log('Server request context validation passed');
