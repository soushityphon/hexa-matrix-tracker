import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {NODES} from '../../data.js';
import {CAPTURED_GAINS} from '../../source-gains.js';
import {matrixLocations} from './matrix-model.mjs';
const read=n=>JSON.parse(readFileSync(new URL('../../data/'+n,import.meta.url)));
const hy=read('scouter-kms-taotie-fragment-extracted-2026-09-28.json');
const ids=new Map(hy.rows.map(r=>[r.skill,r.coreId]));ids.set('Janus','generalCore1');
const category={'Skill Nodes':'Skill','Mastery Nodes':'Mastery','Enhancement Nodes':'Enhancement','Common Nodes':'Common'};
const hySkills=NODES.map(n=>({...n,coreId:ids.get(n.short),category:category[n.group]}));
assert.ok(hySkills.every(s=>s.coreId));
const ren=read('scouter-ren-catalogue-2026-10-01.json').skills;
const captures=read('scouter-ren-additional-captures-2026-10-01.json').captures;
captures.push({region:'KMS',world:'Heroic',response:read('scouter-ren-kms-heroic-response-2026-10-01.json').response});
let checked=0;
function check(skills,available,label){
 available.add('generalCore1');const slots=matrixLocations(skills,available);
 assert.equal(slots.length,18);assert.equal(new Set(slots.map(s=>s.id)).size,18);
 for(const id of available)if(!/^hexastat/i.test(id))assert.ok(slots.some(s=>s.available&&s.skill.coreId===id),label+' missing '+id);
 assert.deepEqual(slots.filter(s=>s.available).map(s=>s.id),matrixLocations([...skills].reverse(),available).filter(s=>s.available).map(s=>s.id));
 const expected=label.startsWith('GMS')?['skill_3','skill_4','skill_5','skill_6','common_4']:['skill_4','skill_5','skill_6','common_4'];
 assert.deepEqual(slots.filter(s=>!s.available).map(s=>s.id),expected);
 checked++;return slots;
}
for(const world of ['heroic','interactive'])for(const region of ['GMS','KMS']){const mode=(region==='GMS'?'lotus':'taotie')+'_'+world;check(hySkills,new Set(CAPTURED_GAINS[mode].map(([skill])=>ids.get(skill)).filter(Boolean)),region+' Hoyoung '+world);}
for(const c of captures)check(ren,new Set(c.response.class_hexa.map(r=>r[9])),c.region+' Ren '+c.world);
assert.equal(matrixLocations(hySkills,new Set()).filter(s=>s.available).length,0);
assert.throws(()=>matrixLocations([{coreId:'masteryCore1',category:'Skill'}],new Set()),/mismatch/);
assert.throws(()=>matrixLocations([{coreId:'skillCore7',category:'Skill'}],new Set()),/No agreed position/);
assert.throws(()=>matrixLocations([hySkills[0],hySkills[0]],new Set()),/Duplicate/);
console.log(`Mapping passes: ${checked} retained class/region/world orders; 18 slots each; source order reversal stable. HEXA Stats remain unmapped by owner geometry.`);
