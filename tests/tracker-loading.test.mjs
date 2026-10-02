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
async function boot(storage={},network=null){
  if(win)await win.happyDOM.abort();
  win=new Window({url:'https://test.example/'});
  win.document.write(readFileSync(new URL('../index.html',import.meta.url),'utf8').replace(/<script[^>]*>[\s\S]*?<\/script>/g,''));
  for(const key of ['window','document','location','localStorage','Event'])globalThis[key]=key==='window'?win:win[key];
  globalThis.Option=function(text,value){const option=document.createElement('option');option.textContent=text;option.value=value;return option;};
  globalThis.confirm=()=>true;
  for(const [key,value] of Object.entries(storage))localStorage.setItem(key,value);
  const actualStorage=win.localStorage;
  globalThis.localStorage={
    getItem:key=>{return actualStorage.getItem(key);},
    setItem:(key,value)=>{actualStorage.setItem(key,value);},
    removeItem:key=>actualStorage.removeItem(key)
  };
  globalThis.fetch=async (url,options)=>{
    if(network)return network(url,options);
    const job=new URL(url,'https://test.example').searchParams.get('job')==='렌'?'ren':'hoyoung';
    return Response.json(url.startsWith('/api/tracker-catalogue')?models[job]:{drafts:drafts[job]});
  };
  await import('../matrix-app.js?test='+Math.random());await tick();
}
const $=selector=>document.querySelector(selector);

const realSetTimeout=globalThis.setTimeout;
let deadlines=[];
globalThis.setTimeout=(callback,delay,...args)=>{
  if(delay===15000){deadlines.push(callback);return realSetTimeout(()=>{},60000);}
  return realSetTimeout(callback,delay,...args);
};
function changeClass(value){$('#class').value=value;$('#class').dispatchEvent(new Event('change',{bubbles:true}));}
function response(url){const job=url.includes('%EB%A0%8C')?'ren':'hoyoung';return Response.json(url.startsWith('/api/tracker-catalogue')?models[job]:{drafts:drafts[job]});}
const original=JSON.stringify({levels:{Harmony:1},owned:42});
for(const endpoint of ['tracker-catalogue','priority-preview'])for(const stage of ['headers','json','error-body']){
  if(endpoint==='tracker-catalogue'&&stage==='error-body')continue;
  deadlines=[];let healthy=false;const signals=[];
  await boot({[hyKey]:original},(url,options)=>{
    signals.push(options.signal);
    if(healthy||!url.includes(endpoint))return response(url);
    if(stage==='headers')return new Promise(()=>{});
    if(stage==='json')return {ok:true,json:()=>new Promise(()=>{})};
    return {ok:false,text:()=>new Promise(()=>{})};
  });
  assert.match($('#nodes').textContent,/Loading/);assert.equal($('#retry-priorities').hidden,true);
  deadlines[0]();await tick();
  assert.match($('#priority-sync').textContent,/timed out/);
  assert.equal($('#retry-priorities').hidden,false);assert.ok(signals.every(signal=>signal.aborted));
  assert.equal(localStorage.getItem(hyKey),original);
  healthy=true;$('#retry-priorities').click();assert.equal($('#retry-priorities').hidden,true);await tick();
  assert.equal($('[data-node]').value,'1');assert.equal($('#owned').value,'42');assert.equal($('#priority-sync').textContent,'');
}
// HTTP failure, failed-body reading and network failure all recover with a fresh pair of reads.
for(const fail of [()=>{throw new Error('offline');},()=>({ok:false,text:async()=> 'Unavailable'}),()=>({ok:true,json:async()=>{throw new Error('bad JSON');}})]){
  let healthy=false,calls=0;
  await boot({},url=>{calls++;return healthy?response(url):fail();});
  assert.equal($('#retry-priorities').hidden,false);assert.equal(document.querySelectorAll('[data-node]').length,0);
  healthy=true;$('#retry-priorities').click();await tick();assert.equal(calls,4);assert.ok($('[data-node]'));
}
// A timed-out request cannot render or poison the cache when its body eventually returns.
let resolveOld;let first=true;let calls=0;
await boot({[hyKey]:original},url=>{
  calls++;
  if(first&&url.includes('tracker-catalogue'))return {ok:true,json:()=>new Promise(resolve=>{resolveOld=resolve;})};
  return response(url);
});
deadlines.at(-1)();await tick();first=false;$('#retry-priorities').click();await tick();
resolveOld({nodes:[],stats:[]});await tick();assert.equal($('[data-node]').value,'1');
changeClass('ren');await tick();changeClass('hoyoung');await tick();assert.equal($('[data-node]').value,'1');assert.equal(calls,6);
// Rapid switches coalesce same-class requests; late responses never replace another class.
const pending=[];
await boot({},(url,options)=>new Promise(resolve=>pending.push({url,options,resolve})));
changeClass('ren');changeClass('hoyoung');changeClass('ren');assert.equal(pending.length,4);
pending.filter(x=>x.url.includes('%EB%A0%8C')).forEach(x=>x.resolve(response(x.url)));await tick();
assert.ok($('[data-node]').dataset.node.startsWith('ren_'));
pending.filter(x=>!x.url.includes('%EB%A0%8C')).forEach(x=>x.resolve(response(x.url)));await tick();
assert.ok($('[data-node]').dataset.node.startsWith('ren_'));assert.equal($('#retry-priorities').hidden,true);
changeClass('hoyoung');await tick();assert.equal($('[data-node]').dataset.node,'Harmony');assert.equal(pending.length,4);
// A late failure from the other class must not clear the active class or expose Retry.
const waiting=[];
await boot({},(url,options)=>new Promise((resolve,reject)=>waiting.push({url,resolve,reject})));
changeClass('ren');
waiting.filter(x=>x.url.includes('%EB%A0%8C')).forEach(x=>x.resolve(response(x.url)));await tick();
waiting.filter(x=>!x.url.includes('%EB%A0%8C')).forEach(x=>x.reject(new Error('old class failed')));await tick();
assert.ok($('[data-node]').dataset.node.startsWith('ren_'));assert.equal($('#priority-sync').textContent,'');assert.equal($('#retry-priorities').hidden,true);
globalThis.setTimeout=realSetTimeout;
await win.happyDOM.abort();
console.log('Tracker loading deadlines, retry, save preservation and rapid class changes pass');
