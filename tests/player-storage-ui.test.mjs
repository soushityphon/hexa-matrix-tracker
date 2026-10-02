import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';
import { NODES, STAT_ICONS } from '../data.js';
import { currentDraft } from '../priority-draft.js';
import { validatePair } from '../admin-panel-model.js';
import { reconstructScouterOrder, discoverySelection } from '../scouter-discovery.js';
import { renDraftFromCapture, renCatalogueFromDrafts } from '../ren-priority.js';
import {createPlayerBackup} from '../player-backup.js';

const stats=Object.keys(STAT_ICONS);
const statSteps=stats.map(skill=>({skill,level:20}));
const harmony=NODES.find(node=>node.short==='Harmony');
const costs={freeBaseLevel:0,levels:Array.from({length:30},(_,i)=>({erda:i+2,frags:(i+1)**2+10}))};
const base={...currentDraft('lotus_heroic'),steps:[...statSteps,{skill:'Harmony',level:2,fdFrom:0,fdGain:1.25}],
  statIcons:STAT_ICONS,capturedCosts:{Harmony:costs},
  costProvenance:{capturedAt:'2026-10-01T00:00:00Z',resources:[{url:'https://maplescouter.com/test.js',sha256:'a'.repeat(64)}]}};
const pair=(job,id,orders)=>Object.fromEntries(validatePair({job,id,name:id,region:'GMS',enabled:true,orders}).map(draft=>[draft.mode,draft]));
const hy=pair('호영','pair_lines',{heroic:base,interactive:base});
Object.assign(hy,pair('호영','pair_hidden',{heroic:{...base,steps:[statSteps[0],{skill:'Harmony',level:2}]},interactive:base}));
const evidence=JSON.parse(readFileSync(new URL('../data/scouter-ren-kms-heroic-response-2026-10-01.json',import.meta.url)));
const catalogue={...evidence.catalogue,provenance:{costs:{...evidence.catalogue.provenance.costs,capturedAt:'2026-10-01T00:00:00Z'}}};
const candidate=reconstructScouterOrder(evidence.response,catalogue,discoverySelection('GMS','Heroic'),catalogue.sourceIconOverrides);
candidate.provenance={response:{capturedAt:'2026-10-01T00:00:00Z',sha256:'b'.repeat(64)}};
const renBase=renDraftFromCapture(candidate,catalogue);
// Synthetic ordering for a small UI test, schedules remain captured evidence.
renBase.steps=[...statSteps,{skill:'ren_skillCore1',level:2,sourceCost:{from:1,...renBase.capturedCosts.ren_skillCore1.levels[1]}}];
const ren=pair('렌','pair_ren_lines',{heroic:renBase,interactive:{...renBase,sourceMode:'ren_gms_interactive'}});
const models={hoyoung:{nodes:[{...harmony,costs:costs.levels}],stats:stats.map(short=>({short,name:short,icon:STAT_ICONS[short]}))},ren:renCatalogueFromDrafts(ren)};
const drafts={hoyoung:hy,ren};
models.hoyoung.nodes[0].sourceKey='masteryCore1';
models.hoyoung.stats.forEach((node,index)=>node.sourceKey='hexaStat'+(index+1));
const hyKey='hexa-tracker-hoyoung-v1',renKey='hexa-tracker-ren-v1';
let win;
const tick=()=>new Promise(resolve=>setTimeout(resolve,20));
async function boot(storage={},failure=null,locks={request:(_name,run)=>run()}){
  if(win)await win.happyDOM.abort();
  win=new Window({url:'https://test.example/'});
  Object.defineProperty(win.navigator,'locks',{value:locks});
  win.document.write(readFileSync(new URL('../index.html',import.meta.url),'utf8').replace(/<script[^>]*>[\s\S]*?<\/script>/g,''));
  for(const key of ['window','document','location','localStorage','Event'])globalThis[key]=key==='window'?win:win[key];
  globalThis.Option=function(text,value){const option=document.createElement('option');option.textContent=text;option.value=value;return option;};
  globalThis.confirm=()=>true;
  for(const [key,value] of Object.entries(storage))localStorage.setItem(key,value);
  const actualStorage=win.localStorage;
  globalThis.localStorage={
    getItem:key=>{if(failure==='read')throw new Error('blocked');return actualStorage.getItem(key);},
    setItem:(key,value)=>{if(failure==='write')throw new Error('quota');actualStorage.setItem(key,value);},
    removeItem:key=>actualStorage.removeItem(key)
  };
  globalThis.fetch=async url=>{
    const job=new URL(url,'https://test.example').searchParams.get('job')==='렌'?'ren':'hoyoung';
    return Response.json(url.startsWith('/api/tracker-catalogue')?models[job]:{drafts:drafts[job]});
  };
  await import('../matrix-app.js?test='+Math.random());await tick();
}
const $=selector=>document.querySelector(selector);
const row=skill=>[...document.querySelectorAll('[data-stat]')].find(el=>el.dataset.stat===skill).closest('.stat-row');
const fields=skill=>[...row(skill).querySelectorAll('[data-stat-line]')];
function enter(skill,index,value){
  const field=fields(skill)[index];field.value=String(value);field.dispatchEvent(new Event('input',{bubbles:true}));
}
function split(skill,levels){levels.forEach((value,index)=>enter(skill,index,value));}
function change(selector,value){const el=$(selector);el.value=value;el.dispatchEvent(new Event('change',{bubbles:true}));}
const state=key=>JSON.parse(localStorage.getItem(key));
const snapshot=()=>Object.fromEntries([hyKey,renKey,'hexa-tracker-class-v1','hexa-tracker-animations-v1'].map(key=>[key,localStorage.getItem(key)]).filter(([,value])=>value!==null));


await boot({[hyKey]:JSON.stringify({mode:'pair_lines_heroic',levels:{Harmony:1},owned:42})},'write');
assert.equal(document.querySelectorAll('[data-node]').length,1);
assert.equal($('#priority-sync').textContent,'');
assert.match($('#save-status').textContent,/Changes are not saved/);
const field=$('[data-node]');field.value='2';field.dispatchEvent(new Event('input',{bubbles:true}));
assert.equal(field.value,'2');assert.equal(state(hyKey).levels.Harmony,1);
change('#class','ren');await tick();change('#class','hoyoung');await tick();
assert.equal($('[data-node]').value,'2');assert.equal($('#owned').value,'42');
for(const raw of ['42','null','[]','{bad',JSON.stringify({statLines:{x:42}}),JSON.stringify({levels:[]})]) {
 await boot({[hyKey]:raw});
 assert.equal(document.querySelectorAll('[data-node]').length,1);
 assert.equal($('#priority-sync').textContent,'');assert.match($('#save-status').textContent,/original record is preserved/);
 const input=$('[data-node]');input.value='2';input.dispatchEvent(new Event('input',{bubbles:true}));
 $('#reset').click();assert.equal(localStorage.getItem(hyKey),raw);
 change('#class','ren');await tick();change('#class','hoyoung');await tick();assert.equal(localStorage.getItem(hyKey),raw);
}
await boot({},'read');assert.equal(document.querySelectorAll('[data-node]').length,1);assert.equal($('#priority-sync').textContent,'');assert.match($('#save-status').textContent,/could not be read/);
change('#class','ren');await tick();assert.ok(document.querySelectorAll('[data-node]').length);
await win.happyDOM.abort();
await boot({[hyKey]:JSON.stringify({levels:{Harmony:1},owned:42}),[renKey]:JSON.stringify({owned:7})});
const downloads=[];
const oldCreate=URL.createObjectURL,oldRevoke=URL.revokeObjectURL;
URL.createObjectURL=blob=>{downloads.push(blob);return 'blob:test';};URL.revokeObjectURL=()=>{};
win.HTMLAnchorElement.prototype.click=function(){};
$('#export-progress').click();await tick();
const exported=JSON.parse(await downloads[0].text());assert.equal(exported.classes.Hoyeong.progress.levels.masteryCore1,1);
const incoming=createPlayerBackup({hoyoung:{levels:{Harmony:2},owned:99,perday:8}},models);
async function importFile(value){
  Object.defineProperty($('#import-progress-file'),'files',{configurable:true,value:[{size:100,text:async()=>JSON.stringify(value)}]});
  $('#import-progress-file').dispatchEvent(new Event('change'));await tick();
}
await importFile(incoming);
assert.match($('#backup-status').textContent,/Imported/);assert.equal($('#owned').value,'99');assert.equal($('[data-node]').value,'2');
assert.equal(state(renKey).owned,7);assert.equal(JSON.parse(await downloads[1].text()).classes.Hoyeong.progress.owned,42);
assert.deepEqual(state(hyKey).infographicUndo,{});
const prior=localStorage.getItem(hyKey);globalThis.confirm=()=>false;
await importFile(incoming);assert.equal(localStorage.getItem(hyKey),prior);assert.equal(downloads.length,2);
globalThis.confirm=()=>true;incoming.classes.Hoyeong.progress.levels.masteryCore1=31;
await importFile(incoming);assert.match($('#backup-status').textContent,/failed/);assert.equal(localStorage.getItem(hyKey),prior);assert.equal(downloads.length,2);
// A refresh that starts during confirmation must prevent in-flight replacement.
incoming.classes.Hoyeong.progress.levels.masteryCore1=1;
globalThis.confirm=()=>{win.dispatchEvent(new Event('focus'));return true;};
await importFile(incoming);
assert.match($('#backup-status').textContent,/Tracker data changed during import/);
assert.equal(state(hyKey).levels.Harmony,2);assert.equal(state(hyKey).owned,99);
assert.equal(downloads.length,2);
// External writes pause the affected class, preserve the current view and offer
// a session-only recovery download without replacing the newer save.
let lockQueue=Promise.resolve();
const locks={request:(_name,run)=>{const result=lockQueue.then(run);lockQueue=result.catch(()=>{});return result;}};
await boot({[hyKey]:JSON.stringify({levels:{Harmony:1},owned:42}),[renKey]:JSON.stringify({owned:7})},null,locks);
win.HTMLAnchorElement.prototype.click=function(){};
const localRaw=localStorage.getItem(hyKey),localValue=JSON.parse(localRaw);
const newer={...localValue,levels:{...localValue.levels,Harmony:2},owned:88};
localStorage.setItem(hyKey,JSON.stringify(newer));
win.dispatchEvent(new win.StorageEvent('storage',{key:hyKey}));
assert.equal($('#save-conflict').hidden,false);assert.match($('#conflict-message').textContent,/Hoyoung.*another tab/);
assert.equal($('[data-node]').value,'1');assert.equal($('#owned').value,'42');
assert.equal($('[data-node]').disabled,true);assert.equal($('#reset').disabled,true);assert.equal($('#import-progress').disabled,true);
$('#view-infographic').click();$('#view-tracker').click();await tick();
assert.equal(localStorage.getItem(hyKey),JSON.stringify(newer));
change('#class','ren');await tick();assert.equal($('#save-conflict').hidden,true);
change('#class','hoyoung');await tick();assert.equal($('#save-conflict').hidden,false);assert.equal($('[data-node]').value,'1');assert.equal($('#owned').value,'42');assert.equal($('[data-node]').disabled,true);
const count=downloads.length;$('#export-tab-progress').click();await tick();
assert.equal(downloads.length,count+1);const recovery=JSON.parse(await downloads.at(-1).text());
assert.deepEqual(Object.keys(recovery.classes),['Hoyeong']);assert.equal(recovery.classes.Hoyeong.progress.levels.masteryCore1,1);
assert.equal(recovery.classes.Hoyeong.progress.owned,42);assert.equal(localStorage.getItem(hyKey),JSON.stringify(newer));
globalThis.confirm=()=>false;$('#load-latest-save').click();await tick();assert.equal($('#save-conflict').hidden,false);assert.equal($('[data-node]').value,'1');
globalThis.confirm=()=>true;$('#load-latest-save').click();await tick();assert.equal($('#save-conflict').hidden,true);
assert.equal($('[data-node]').value,'2');assert.equal($('#owned').value,'88');assert.equal($('#undo-progress').disabled,true);assert.equal($('#reset').disabled,false);
// Another cached class conflicts independently without pausing this class.
localStorage.setItem(renKey,JSON.stringify({owned:9}));win.dispatchEvent(new win.StorageEvent('storage',{key:renKey}));
assert.equal($('#save-conflict').hidden,true);change('#class','ren');await tick();assert.equal($('#owned').value,'7');assert.match($('#conflict-message').textContent,/Ren.*another tab/);
$('#load-latest-save').click();await tick();assert.equal($('#owned').value,'9');assert.equal($('#save-conflict').hidden,true);
change('#class','hoyoung');await tick();
// Missing events cannot bypass the guard through a synthetic mutation or Reset.
localStorage.setItem(hyKey,JSON.stringify({...newer,owned:99}));
change('#owned',123);await tick();assert.equal(JSON.parse(localStorage.getItem(hyKey)).owned,99);assert.equal($('#save-conflict').hidden,false);
$('#load-latest-save').click();await tick();assert.equal($('#owned').value,'99');
// An invalid Stat draft remains visible until the user agrees to discard it.
enter(stats[0],0,11);const draftField=fields(stats[0])[0];assert.equal(draftField.value,'11');
localStorage.setItem(hyKey,JSON.stringify({...JSON.parse(localStorage.getItem(hyKey)),owned:100}));
win.dispatchEvent(new win.StorageEvent('storage',{key:hyKey}));win.dispatchEvent(new Event('focus'));await tick();
assert.equal(fields(stats[0])[0].value,'11');
let prompted=0;globalThis.confirm=()=>{prompted++;return false;};$('#load-latest-save').click();await tick();assert.equal(prompted,1);assert.equal(fields(stats[0])[0].value,'11');
globalThis.confirm=()=>true;$('#load-latest-save').click();await tick();assert.equal(fields(stats[0])[0].value,'0');assert.equal($('#owned').value,'100');
// Malformed external saves never replace the retained view or raw record.
localStorage.setItem(hyKey,'42');win.dispatchEvent(new win.StorageEvent('storage',{key:hyKey}));
$('#load-latest-save').click();await tick();assert.equal(localStorage.getItem(hyKey),'42');assert.equal($('#owned').value,'100');assert.equal($('#save-conflict').hidden,false);
// External clear/Reset can be explicitly adopted as the existing baseline.
localStorage.removeItem(hyKey);win.dispatchEvent(new win.StorageEvent('storage',{key:null}));
$('#load-latest-save').click();await tick();assert.equal($('#save-conflict').hidden,true);assert.equal($('[data-node]').value,'0');
// Import rechecks the other class inside its lock, even after confirmation
// and safety preparation. No stale backup download or replacement is allowed.
await boot({[hyKey]:JSON.stringify({levels:{Harmony:1},owned:42}),[renKey]:JSON.stringify({owned:7})},null,locks);
win.HTMLAnchorElement.prototype.click=function(){};
const request=locks.request;let race=true;
locks.request=(name,run)=>{
  if(race){race=false;request(name,()=>localStorage.setItem(renKey,JSON.stringify({owned:77})));}
  return request(name,run);
};
const beforeRaceDownloads=downloads.length;
await importFile(createPlayerBackup({hoyoung:{levels:{Harmony:2},owned:99}},models));
assert.match($('#backup-status').textContent,/import failed/);assert.equal(downloads.length,beforeRaceDownloads);
assert.equal(JSON.parse(localStorage.getItem(hyKey)).owned,42);assert.equal(JSON.parse(localStorage.getItem(renKey)).owned,77);
$('#export-progress').click();await tick();assert.match($('#backup-status').textContent,/could not be exported/);assert.equal(downloads.length,beforeRaceDownloads);
locks.request=request;
// Without the browser lock capability, edits remain in memory and cannot overwrite a save.
await boot({[hyKey]:JSON.stringify({levels:{Harmony:1},owned:42})},null,null);
change('#owned',101);await tick();assert.equal(JSON.parse(localStorage.getItem(hyKey)).owned,42);assert.match($('#save-status').textContent,/not saved/);
URL.createObjectURL=oldCreate;URL.revokeObjectURL=oldRevoke;
await win.happyDOM.abort();
console.log('Player storage app: blocked reads/writes, damaged records, reset and class switching pass');
