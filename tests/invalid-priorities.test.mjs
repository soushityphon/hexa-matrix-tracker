import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';
import worker from '../worker.js';
import { currentDraft } from '../priority-draft.js';
import { validatePair } from '../admin-panel-model.js';
import { renDraftFromCapture } from '../ren-priority.js';
import { reconstructScouterOrder, discoverySelection } from '../scouter-discovery.js';

const sqlite=new DatabaseSync(':memory:');
for(const file of ['0000_priority_preview.sql','0001_admin_skills.sql'])sqlite.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
const DB={prepare(sql){let values=[];return {bind(...args){values=args;return this;},async all(){return {results:sqlite.prepare(sql).all(...values)};},async first(){return sqlite.prepare(sql).get(...values)||null;},async run(){return {meta:{changes:Number(sqlite.prepare(sql).run(...values).changes)}};}};},async batch(statements){sqlite.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());sqlite.exec('COMMIT');return results;}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
const env={DB,ADMIN_EMAIL:'owner@example.test'},headers={'oai-authenticated-user-email':'owner@example.test','Content-Type':'application/json'};
const call=(method,value,path='/api/admin-panel',owner=true)=>worker.fetch(new Request('https://test.example'+path,{method,headers:owner?headers:{},...(value===undefined?{}:{body:JSON.stringify(value)})}),env);
const base=currentDraft('lotus_heroic');
const pair=id=>({id,name:id,region:'GMS',enabled:false,orders:{heroic:base,interactive:base}});
const valid=validatePair(pair('good'));
for(const draft of valid)sqlite.prepare('INSERT INTO priority_preview VALUES (?, ?, ?)').run(draft.mode,JSON.stringify(draft),'old-date');
const evidence=JSON.parse(readFileSync(new URL('../data/scouter-ren-kms-heroic-response-2026-10-01.json',import.meta.url)));
const catalogue={...evidence.catalogue,provenance:{costs:{...evidence.catalogue.provenance.costs,capturedAt:'2026-10-01T00:00:00Z'}}};
const candidate=reconstructScouterOrder(evidence.response,catalogue,discoverySelection('KMS','Heroic'),catalogue.sourceIconOverrides);
candidate.provenance={response:{capturedAt:'2026-10-01T00:00:00Z',sha256:'b'.repeat(64)}};
const renBase=renDraftFromCapture(candidate,catalogue);
const ren=validatePair({job:'렌',id:'ren_good',name:'Ren test',region:'KMS',enabled:false,orders:{heroic:renBase,interactive:{...renBase,sourceMode:'ren_kms_interactive'}}})[0];
sqlite.prepare('INSERT INTO priority_preview VALUES (?, ?, ?)').run(ren.mode,JSON.stringify(ren),'ren-date');
const badStep={...base,steps:[{skill:'Harmony',level:31}]};
const broken=new Map([
 ['broken_heroic','{bad JSON with private-looking text'],['null_record','null'],['number_record','42'],['array_record','[]'],
 ['shape_record',JSON.stringify({...base,steps:[null]})],['step_record',JSON.stringify(badStep)],
 ['identity_record',JSON.stringify(base)],['<img src=x onerror=alert(1)>','{'],
 ['good_interactive','{broken counterpart']
]);
for(const [mode,raw] of broken)sqlite.prepare('INSERT INTO priority_preview VALUES (?, ?, ?) ON CONFLICT(mode) DO UPDATE SET draft_json=excluded.draft_json').run(mode,raw,'damaged-date');
const before=()=>sqlite.prepare('SELECT * FROM priority_preview ORDER BY mode').all();
const initial=before();
for(const job of ['호영','렌']){
 const response=await call('GET',undefined,'/api/admin-panel?job='+encodeURIComponent(job));assert.equal(response.status,200);
 const state=await response.json();assert.equal(state.invalidRecords.length,broken.size);
 assert.equal(Object.keys(state.drafts).length,1);assert.equal(Object.values(state.drafts)[0].job || '호영',job);
 assert.match(state.invalidRecords.find(row=>row.mode==='identity_record').reason,/ID/);
 assert.match(state.invalidRecords.find(row=>row.mode==='shape_record').reason,/shape/);
 assert(!JSON.stringify(state.invalidRecords).includes('private-looking'));
}
assert.deepEqual(before(),initial);
for(const [mode,raw] of broken){
 const path='/api/admin-panel?record='+encodeURIComponent(mode);
 assert.equal((await call('GET',undefined,path,false)).status,403);
 const response=await call('GET',undefined,path);assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
 const backup=await response.json();assert.equal(backup.type,'hexa-invalid-priority-record');assert.equal(backup.mode,mode);assert.equal(backup.draft_json,raw);
}
assert.equal((await call('GET',undefined,'/api/admin-panel?record=good_heroic')).status,404);
assert.equal((await call('POST',pair('broken'))).status,400);
assert.equal((await call('POST',{legacyDraft:{...base,mode:'broken_heroic',sourceMode:base.mode,isNew:true}})).status,400);
assert.equal((await call('POST',{restoreSnapshot:{schema:1,type:'hexa-tracker-backup',priorities:[{mode:'broken_heroic',draft_json:JSON.stringify({...base,mode:'broken_heroic',sourceMode:base.mode,isNew:true})}],skills:[]}})).status,400);
assert.equal((await call('PATCH',{id:'broken_heroic',enabled:true})).status,400);
assert.equal((await call('DELETE',{id:'broken_heroic'})).status,400);
assert.equal((await call('PUT',{draft:{...base,mode:'broken_heroic',sourceMode:base.mode,isNew:true}},'/api/priority-preview')).status,409);
assert.equal((await call('DELETE',{mode:'broken_heroic'},'/api/priority-preview')).status,409);
assert.deepEqual(before(),initial);
assert.equal((await call('PATCH',{priorityRevision:(await (await call('GET')).json()).priorityRevisions.good,id:'good',name:'Still manageable',enabled:false})).status,200);
assert.equal((await call('POST',pair('fresh'))).status,200);
assert.equal((await call('DELETE',{id:'fresh',priorityRevision:(await (await call('GET')).json()).priorityRevisions.fresh})).status,200);
assert.equal((await call('PUT',{skillsRevision:(await (await call('GET')).json()).skillsRevision,job:'호영',rows:[{coreId:'masteryCore1',source:{coreId:'masteryCore1',sourceName:'Harmony',icon:'https://maplescouter.com/hexaskill/HY_3.png'},name:'Harmony',shortName:'Harmony',category:'Mastery',tag:'M1'}]})).status,200);
assert.equal((await call('PATCH',{priorityRevision:(await (await call('GET',undefined,'/api/admin-panel?job='+encodeURIComponent('렌'))).json()).priorityRevisions[ren.pairId],id:ren.pairId,name:'Ren remains manageable',enabled:false})).status,200);
const publicState=await (await call('GET',undefined,'/api/priority-preview',false)).json();
for(const mode of broken.keys())assert(!Object.hasOwn(publicState.drafts,mode));
assert(!JSON.stringify(publicState).includes('invalidRecords'));
const maintenance=await (await call('GET',undefined,'/api/admin-maintenance')).json();
for(const [mode,raw] of broken)assert.equal(maintenance.priorities.find(row=>row.mode===mode).draft_json,raw);
for(const [mode,raw] of broken)assert.equal(sqlite.prepare('SELECT draft_json FROM priority_preview WHERE mode=?').get(mode).draft_json,raw);
const failed=await worker.fetch(new Request('https://test.example/api/admin-panel',{headers}),{...env,DB:{prepare(){throw new Error('private backend message');}}});
assert.equal(failed.status,503);assert(! (await failed.text()).includes('private backend'));

const win=new Window({url:'https://test.example/priority-review.html'});
win.document.write(readFileSync(new URL('../priority-review.html',import.meta.url),'utf8').replace(/<script[^>]*>[\s\S]*?<\/script>/g,''));
for(const key of ['window','document','sessionStorage','Event'])globalThis[key]=key==='window'?win:win[key];
globalThis.Option=function(text,value){const node=document.createElement('option');node.textContent=text;node.value=value;return node;};
let downloaded;const originalCreate=URL.createObjectURL;URL.createObjectURL=blob=>{downloaded=blob;return 'blob:test';};
const requests=[];globalThis.fetch=async(url,options={})=>{requests.push(url);return call(options.method || 'GET',options.body?JSON.parse(options.body):undefined,url);};
await import('../priority-review.js?invalid-record-test');
assert.equal(document.querySelectorAll('.invalid-priorities article').length,broken.size);
assert.equal(document.querySelector('.invalid-priorities img'),null);
assert.match(document.querySelector('#status').textContent,/ready/);
assert(document.querySelector('#registered').textContent.includes('Still manageable'));
assert.equal(document.querySelector('#grab').disabled,false);
document.querySelector('.invalid-priorities button').click();await new Promise(resolve=>setTimeout(resolve,30));
assert(downloaded);const download=JSON.parse(await downloaded.text());assert.equal(download.draft_json,broken.get(download.mode));
document.querySelector('#ren-tab').click();await new Promise(resolve=>setTimeout(resolve,30));
assert(document.querySelector('#registered').textContent.includes('Ren remains manageable'));
assert.equal(document.querySelectorAll('.invalid-priorities article').length,broken.size);
// Retain a dirty class's original revision even when switching away and back.
const settle=()=>new Promise(resolve=>setTimeout(resolve,30));
document.querySelector('#hoyoung-tab').click();await settle();
let nameInput=document.querySelector('#skills input');nameInput.value='Unsaved tab name';nameInput.dispatchEvent(new Event('input'));
const peer=await (await call('GET')).json();peer.skills.rows[0].name='Peer saved name';
assert.equal((await call('PUT',{...peer.skills,skillsRevision:peer.skillsRevision})).status,200);
document.querySelector('#ren-tab').click();await settle();document.querySelector('#hoyoung-tab').click();await settle();
document.querySelector('#save-skills').click();await settle();
assert.match(document.querySelector('#status').textContent,/changed in another tab/);
assert.equal(document.querySelector('#skills input').value,'Unsaved tab name');
assert.equal((await (await call('GET')).json()).skills.rows[0].name,'Peer saved name');
globalThis.confirm=()=>false;
document.querySelector('#load-latest-skills').click();await settle();
assert.equal(document.querySelector('#skills input').value,'Unsaved tab name');
globalThis.confirm=()=>true;
const normalFetch=globalThis.fetch;globalThis.fetch=async()=>new Response('Temporary failure',{status:503});
document.querySelector('#load-latest-skills').click();await settle();
assert.equal(document.querySelector('#skills input').value,'Unsaved tab name');
assert.match(document.querySelector('#status').textContent,/Temporary failure/);
globalThis.fetch=normalFetch;
document.querySelector('#load-latest-skills').click();await settle();
assert.equal(document.querySelector('#skills input').value,'Peer saved name');
for(const name of ['Reviewed latest name','Second reviewed save']) {
  nameInput=document.querySelector('#skills input');nameInput.value=name;nameInput.dispatchEvent(new Event('input'));
  document.querySelector('#save-skills').click();await settle();
  assert.match(document.querySelector('#status').textContent,/Skills saved/);
  assert.equal((await (await call('GET')).json()).skills.rows[0].name,name);
}
console.log('Admin DOM retains conflicted drafts across class reloads; cancelled/failed latest loads preserve edits and reviewed saves recover');
const cardNamed=name=>[...document.querySelectorAll('#registered .registered-row')].find(card=>card.querySelector('strong')?.textContent===name);
const action=(card,name)=>[...card.querySelectorAll('button')].find(button=>button.textContent===name);
const staleCard=cardNamed('Still manageable');assert(staleCard);
const latestGood=await (await call('GET')).json();
assert.equal((await call('PATCH',{id:'good',name:'Peer priority',priorityRevision:latestGood.priorityRevisions.good})).status,200);
let prefill;globalThis.prompt=(_label,value)=>{prefill=value;return 'Unsaved priority name';};
action(staleCard,'Rename').click();await settle();
assert.match(document.querySelector('#status').textContent,/Priority changed in another tab/);
assert.equal((await (await call('GET')).json()).drafts.good_heroic.pairName,'Peer priority');
// A rejected delete or availability action keeps every peer row too.
const peerRows=sqlite.prepare('SELECT * FROM priority_preview WHERE mode LIKE ? ORDER BY mode').all('good_%');
for(const label of ['Delete','Make available']) {
  action(staleCard,label).click();await settle();
  assert.match(document.querySelector('#status').textContent,/Priority changed in another tab/);
  assert.deepEqual(sqlite.prepare('SELECT * FROM priority_preview WHERE mode LIKE ? ORDER BY mode').all('good_%'),peerRows);
}
nameInput=document.querySelector('#skills input');nameInput.value='Dirty skills kept';nameInput.dispatchEvent(new Event('input'));
document.querySelector('#pair-name').value='Captured pair draft kept';
globalThis.fetch=async()=>new Response('Priority refresh failed',{status:503});
document.querySelector('#load-latest-priorities').click();await settle();
assert.match(document.querySelector('#status').textContent,/Priority refresh failed/);
assert(cardNamed('Still manageable'));assert.equal(document.querySelector('#skills input').value,'Dirty skills kept');
globalThis.fetch=normalFetch;
document.querySelector('#load-latest-priorities').click();await settle();
assert(cardNamed('Peer priority'));assert.equal(document.querySelector('#skills input').value,'Dirty skills kept');
assert.equal(document.querySelector('#pair-name').value,'Captured pair draft kept');
action(cardNamed('Peer priority'),'Rename').click();await settle();
assert.equal(prefill,'Unsaved priority name');assert.match(document.querySelector('#status').textContent,/Priority name saved/);
const renamedGood=await (await call('GET')).json();
for(const draft of Object.values(renamedGood.drafts).filter(draft=>draft.pairId==='good'))assert.equal(draft.pairName,'Unsaved priority name');
assert.equal(sqlite.prepare('SELECT draft_json FROM priority_preview WHERE mode = ?').get('good_interactive').draft_json,broken.get('good_interactive'));
assert.equal(document.querySelector('#skills input').value,'Dirty skills kept');
console.log('Priority admin DOM rejects stale rename/availability/delete and retains entered names, skill edits and pair drafts through latest-load failure/recovery');
URL.createObjectURL=originalCreate;await win.happyDOM.abort();sqlite.close();
console.log('Damaged priority isolation, raw recovery, collision protection, class management and admin DOM checks passed');
