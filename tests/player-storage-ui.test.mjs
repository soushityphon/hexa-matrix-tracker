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
async function boot(storage={},failure=null){
  if(win)await win.happyDOM.abort();
  win=new Window({url:'https://test.example/'});
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
URL.createObjectURL=oldCreate;URL.revokeObjectURL=oldRevoke;
await win.happyDOM.abort();
console.log('Player storage app: blocked reads/writes, damaged records, reset and class switching pass');
