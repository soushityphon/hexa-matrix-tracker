import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {renDraftFromCapture,renCatalogueFromDrafts} from '../ren-priority.js';
import {reconstructScouterOrder,discoverySelection} from '../scouter-discovery.js';
import {validateDraft} from '../priority-draft.js';
import {validatePair,applySkills,mergeSkills} from '../admin-panel-model.js';
import {previewCatalog} from '../preview-priorities.js';
import worker from '../worker.js';
const read=file=>JSON.parse(readFileSync(new URL('../data/'+file,import.meta.url),'utf8'));
const first=read('scouter-ren-kms-heroic-response-2026-10-01.json');
const rest=read('scouter-ren-additional-captures-2026-10-01.json');
// Dated response evidence. Test acquisition provenance is explicit and synthetic.
const catalogue={...first.catalogue,provenance:{costs:{url:first.catalogue.provenance.costs.url,sha256:first.catalogue.provenance.costs.sha256,capturedAt:'2026-10-01T00:00:00Z'}}};
const captures=[{region:'KMS',world:'Heroic',response:first.response},...rest.captures];
const orders={};
for(const capture of captures){
 const candidate=reconstructScouterOrder(capture.response,catalogue,discoverySelection(capture.region,capture.world),catalogue.sourceIconOverrides);
 assert.deepEqual(candidate.issues,[]);
 candidate.provenance={response:{capturedAt:'2026-10-01T00:00:00Z',sha256:'a'.repeat(64)}};
 orders[capture.region] ||= {};orders[capture.region][capture.world.toLowerCase()]=renDraftFromCapture(candidate,catalogue);
}
const pairs={};
for(const region of ['GMS','KMS']){
 const drafts=validatePair({job:'렌',id:'pair_ren_'+region.toLowerCase(),name:'Ren '+region,region,enabled:false,orders:orders[region]});
 pairs[region]=drafts;
 assert(drafts.every(draft=>!draft.enabled&&draft.job==='렌'));
 for(const draft of drafts){assert.deepEqual(validateDraft(draft),draft);assert.equal(draft.capturedCosts.ren_skillCore1.freeBaseLevel,1);}
 const publicModel=renCatalogueFromDrafts(Object.fromEntries(drafts.map(draft=>[draft.mode,draft])),null);
 assert.equal(publicModel.nodes.length,14);assert.equal(publicModel.stats.length,3);
 const settings=previewCatalog(Object.fromEntries(drafts.map(draft=>[draft.mode,draft]))).settings;
 assert(Object.values(settings).every(value=>value.class==='ren'));
}
const draft=pairs.KMS[0];
const changed=structuredClone(draft);changed.steps[0].sourceCost.frags++;
assert.throws(()=>validateDraft(changed),/captured schedule/);
const missingFD=structuredClone(draft);delete missingFD.steps[0].fdGain;delete missingFD.steps[0].fdFrom;
assert(!Object.hasOwn(validateDraft(missingFD).steps[0],'fdGain'));
assert.throws(()=>validatePair({job:'호영',id:'bad',name:'Mixed',region:'KMS',enabled:false,orders:orders.KMS}),/selected class/);
const sourceRows=mergeSkills(catalogue,[],{});
const review={job:'렌',rows:sourceRows.map(row=>({...row,name:'Reviewed '+row.coreId,shortName:row.coreId,category:row.source.category,tag:''}))};
const overlaid=applySkills({[draft.mode]:draft},review)[draft.mode];
assert.deepEqual(overlaid.steps,draft.steps);assert.deepEqual(overlaid.capturedCosts,draft.capturedCosts);
assert.equal(overlaid.tags.ren_skillCore1,'');assert.equal(overlaid.names.ren_skillCore1,'Reviewed skillCore1');

const sqlite=new DatabaseSync(':memory:');
for(const file of ['0000_priority_preview.sql','0001_admin_skills.sql'])sqlite.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
const DB={prepare(sql){let values=[];return {bind(...args){values=args;return this;},async all(){return {results:sqlite.prepare(sql).all(...values)};},async first(){return sqlite.prepare(sql).get(...values)||null;},async run(){return {meta:{changes:Number(sqlite.prepare(sql).run(...values).changes)}};}};},async batch(statements){sqlite.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());sqlite.exec('COMMIT');return results;}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
const env={DB,ADMIN_EMAIL:'owner@example.test'},headers={'oai-authenticated-user-email':'owner@example.test','Content-Type':'application/json'};
const call=(method,value,path='/api/admin-panel')=>worker.fetch(new Request('https://test.example'+path,{method,headers,...(value===undefined?{}:{body:JSON.stringify(value)})}),env);
const changePriority=async(method,value)=>{const state=await (await call('GET',undefined,'/api/admin-panel?job='+encodeURIComponent('렌'))).json();return call(method,{...value,priorityRevision:state.priorityRevisions[value.id]});};
for(const region of ['GMS','KMS']){
 const pair={job:'렌',id:'pair_ren_'+region.toLowerCase(),name:'Ren '+region,region,enabled:false,orders:orders[region]};
 let r=await call('POST',pair);assert.equal(r.status,200,await r.text());
 r=await changePriority('PATCH',{id:pair.id,enabled:true});assert.equal(r.status,200,await r.text());
}
let state=await (await call('GET',undefined,'/api/admin-panel?job='+encodeURIComponent('렌'))).json();assert.equal(Object.keys(state.drafts).length,4);
assert.deepEqual((await (await call('GET')).json()).drafts,{});
const before=structuredClone(state.drafts);
assert.equal((await changePriority('PATCH',{id:'pair_ren_kms',name:'My Ren update'})).status,200);
state=await (await call('GET',undefined,'/api/admin-panel?job='+encodeURIComponent('렌'))).json();
assert.deepEqual(state.drafts.pair_ren_kms_heroic.steps,before.pair_ren_kms_heroic.steps);assert.deepEqual(state.drafts.pair_ren_kms_heroic.capturedCosts,before.pair_ren_kms_heroic.capturedCosts);
const visible=await (await worker.fetch(new Request('https://test.example/api/priority-preview?job='+encodeURIComponent('렌')),env)).json();assert.equal(Object.keys(visible.drafts).length,4);assert(Object.values(visible.drafts).every(draft=>draft.enabled));
const model=await (await worker.fetch(new Request('https://test.example/api/tracker-catalogue?job='+encodeURIComponent('렌')),env)).json();assert.equal(model.nodes.length,14);
const snapshot=await (await call('GET',undefined,'/api/admin-maintenance')).json();
assert.equal((await changePriority('DELETE',{id:'pair_ren_gms'})).status,200);assert.equal((await changePriority('DELETE',{id:'pair_ren_kms'})).status,200);
let r=await call('POST',{restoreSnapshot:snapshot});assert.equal(r.status,200,await r.text());
state=await (await call('GET',undefined,'/api/admin-panel?job='+encodeURIComponent('렌'))).json();assert(Object.values(state.drafts).every(draft=>!draft.enabled));
assert.deepEqual(state.drafts.pair_ren_kms_heroic.steps,before.pair_ren_kms_heroic.steps);
console.log('Four Ren captures: save, availability, review overlays, exact costs/FD, rename, backup and restore passed');
