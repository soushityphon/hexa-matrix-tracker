import assert from 'node:assert/strict';
import {acquireScouterOrder} from '../scouter-order-acquisition.js';
import {scouterRequestContext} from '../scouter-request-context.js';
import {discoverySelection} from '../scouter-discovery.js';
// Synthetic job, profile and policy. This does not clear any live template.
const hexa={character_class:'테스트',skillCore1:'1',hexaStat:0,hexaStat_opened:false,hexaSkill:{skillCore1:1},hexaSkill_general:{generalCore1:0}};
const payload={myHexa:structuredClone(hexa),userStat:{hexa:structuredClone(hexa),stat:{myClass:'테스트',attack:42},isGMS:false},sole:false,id:'PRIVATE_ID'};
const catalogue={job:'테스트',selection:discoverySelection('KMS','Heroic'),skills:[{coreId:'skillCore1',sourceName:'Origin',icon:'https://maplescouter.com/hexaskill/Test_1.png',costs:{freeBaseLevel:1,levels:Array.from({length:30},(_,i)=>({level:i+1,erda:1,frags:3}))}}]};
const response={class_hexa:[['Origin',3,'/hexaskill/Test_1.png',2,6,2,6,1.5,1.01,'skillCore1','Origin 1→3']],privateProfile:'PRIVATE_RESPONSE'};
let calls=0, sent;
const options={apiKey:'PRIVATE_KEY',validatePrepared:()=>true,fetchImpl:async(url,init)=>{calls++;sent=JSON.parse(init.body);assert.match(url,/class=/);assert.equal(init.credentials,'omit');assert.equal(init.redirect,'error');return Response.json(response);}};
const result=await acquireScouterOrder(payload,catalogue,options);
assert.equal(calls,1);
assert.deepEqual(result.requestContext,await scouterRequestContext(sent));
assert.equal(result.steps[0].fd.checkpointGainPercent,0.3);
assert.equal(result.publishable,false);
assert.deepEqual(result.reviewedOverrides,{});
assert.match(result.provenance.response.sha256,/^[a-f0-9]{64}$/);
assert(Number.isFinite(Date.parse(result.provenance.response.capturedAt)));
for(const secret of ['PRIVATE_ID','PRIVATE_KEY','PRIVATE_RESPONSE']) assert(!JSON.stringify(result).includes(secret));
for(const validatePrepared of [undefined,()=>false,()=>{throw new Error('PRIVATE_POLICY');}]) {
  calls=0;
  await assert.rejects(()=>acquireScouterOrder(payload,catalogue,{...options,validatePrepared}),error=>!error.message.includes('PRIVATE'));
  assert.equal(calls,0);
}
const dirty=structuredClone(payload);dirty.myHexa.hexaStat=3;
calls=0;
await assert.rejects(()=>acquireScouterOrder(dirty,catalogue,options));
await assert.rejects(()=>acquireScouterOrder(payload,{...catalogue,job:'other'},options));
assert.equal(calls,0);
const mutable=structuredClone(payload), mutableCat=structuredClone(catalogue);
await acquireScouterOrder(mutable,mutableCat,{...options,validatePrepared:async(body,cat)=>{
  assert(Object.isFrozen(body.myHexa));assert(Object.isFrozen(cat.skills));
  mutable.userStat.stat.attack=999;mutableCat.skills[0].sourceName='changed';return true;
}});
assert.equal(sent.userStat.stat.attack,42);
for(const status of [429,430,500]) {
  calls=0;
  await assert.rejects(()=>acquireScouterOrder(payload,catalogue,{...options,fetchImpl:async()=>{calls++;return new Response('PRIVATE_REJECTION',{status});}}),new RegExp(String(status)));
  assert.equal(calls,1);
}
for(const bad of [{...response,class:'other'},{...response,class_hexa:[]},{...response,class_hexa:response.class_hexa.map(r=>r.map((v,i)=>i===3?99:v))}]) await assert.rejects(()=>acquireScouterOrder(payload,catalogue,{...options,fetchImpl:async()=>Response.json(bad)}));
await assert.rejects(()=>acquireScouterOrder(payload,catalogue,{...options,fetchImpl:async()=>{throw new Error('PRIVATE_KEY');}}),error=>!error.message.includes('PRIVATE'));
await assert.rejects(()=>acquireScouterOrder(payload,catalogue,{...options,timeoutMs:10,fetchImpl:()=>new Promise(()=>{})}),/timed out/);
await assert.rejects(()=>acquireScouterOrder(payload,catalogue,{...options,timeoutMs:10,validatePrepared:()=>new Promise(()=>{})}),/timed out/);
let cancelled=false;
await assert.rejects(()=>acquireScouterOrder(payload,catalogue,{...options,timeoutMs:10,fetchImpl:async()=>new Response(new ReadableStream({cancel(){cancelled=true;}}))}),/timed out/);
assert(cancelled);
for(const headers of [{},{'Content-Length':'1'},{'Content-Length':'3000001'}]) await assert.rejects(()=>acquireScouterOrder(payload,catalogue,{...options,fetchImpl:async()=>new Response(new Uint8Array(3000001),{headers})}));
await assert.rejects(()=>acquireScouterOrder(payload,catalogue,{...options,fetchImpl:async()=>new Response('not json PRIVATE_RESPONSE')}),error=>!error.message.includes('PRIVATE'));
console.log('Bounded Scouter order acquisition tests passed');
for (const region of ['GMS','KMS']) for (const world of ['Heroic','Interactive']) {
  const selected=structuredClone(payload);selected.userStat.isGMS=region==='GMS';selected.sole=world==='Interactive';
  const chosen={...catalogue,selection:discoverySelection(region,world)};
  const acquired=await acquireScouterOrder(selected,chosen,options);
  assert.equal(acquired.requestContext.region,region);assert.equal(acquired.requestContext.world,world);
  assert.deepEqual(acquired.requestContext,await scouterRequestContext(sent));
}
const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(response)));
assert.equal(result.provenance.response.sha256,Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join(''));
const original=JSON.stringify(payload);
await assert.rejects(()=>acquireScouterOrder(payload,catalogue,{...options,validatePrepared:body=>{body.myHexa.skillCore1='2';return true;}}));
assert.equal(JSON.stringify(payload),original);
