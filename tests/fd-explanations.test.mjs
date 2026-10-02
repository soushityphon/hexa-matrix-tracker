// These failure/reconciliation cases exercise an expired source cache.
function focusRefresh(){const now=Date.now;Date.now=()=>now()+31000;try{window.dispatchEvent(new Event('focus'));}finally{Date.now=now;}}
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';
import { NODES, STAT_ICONS } from '../data.js';
import { currentDraft } from '../priority-draft.js';
import { validatePair } from '../admin-panel-model.js';
import { reconstructScouterOrder, discoverySelection } from '../scouter-discovery.js';
import { renDraftFromCapture, renCatalogueFromDrafts } from '../ren-priority.js';
import {captureSkillProgress,createProgressUndo} from '../progress-undo.js';
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
  Object.defineProperty(win.navigator,'locks',{value:{request:(_name,run)=>run()}});
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


const savedKeys=[hyKey,renKey];
const snapshot=()=>savedKeys.map(key=>localStorage.getItem(key));
const change=(selector,value)=>{const field=$(selector);field.value=value;field.dispatchEvent(new Event('change',{bubbles:true}));};
const allStats=Object.fromEntries(stats.map(skill=>[skill,true]));
async function explain(button,pattern){
  assert.ok(button);assert.equal(button.tagName,'BUTTON');assert.equal(button.type,'button');
  assert.equal(button.getAttribute('aria-haspopup'),'dialog');assert.equal(button.getAttribute('aria-controls'),'fd-explanation');
  assert.match(button.getAttribute('aria-label'),/Open FD explanation/);
  const before=snapshot();
  const levels=[...document.querySelectorAll('[data-node]')].map(input=>input.value);
  button.focus();button.click();
  assert.equal($('#fd-explanation').open,true);
  assert.match($('#fd-explanation-text').textContent,pattern);
  assert.equal($('#fd-explanation-text').textContent,button.title);
  $('#fd-explanation-close').click();await tick();
  assert.equal($('#fd-explanation').open,false);assert.equal(document.activeElement,button);
  assert.deepEqual(snapshot(),before);assert.deepEqual([...document.querySelectorAll('[data-node]')].map(input=>input.value),levels);
}
await boot({[hyKey]:JSON.stringify({mode:'pair_lines_heroic',statCompleted:allStats,levels:{Harmony:0},owned:42})});
assert.equal($('#fd-explanation').getAttribute('aria-labelledby'),'fd-explanation-title');
assert.equal($('#fd-explanation').getAttribute('aria-describedby'),'fd-explanation-text');
assert.equal($('#fd-explanation-close').hasAttribute('autofocus'),true);
await explain($('#next-upgrade [data-fd-note]'),/rounded Maple Scouter step values.*compounded/);
await explain($('#priority [data-fd-note]'),/rounded Maple Scouter/);
// Measure actual app work for unrelated bubbling events, with identical progress.
const priorPriority=$('#priority').firstChild,priorNext=$('#next-upgrade').firstChild;
let measuredWrites=0;
const originalWrite=localStorage.setItem;
localStorage.setItem=(key,value)=>{if(savedKeys.includes(key))measuredWrites++;originalWrite(key,value);};
for(let index=0;index<100;index++)$('#fd-explanation-close').dispatchEvent(new Event('input',{bubbles:true}));
console.log(JSON.stringify({unrelatedEvents:100,playerWrites:measuredWrites,priorityReplaced:$('#priority').firstChild!==priorPriority,nextReplaced:$('#next-upgrade').firstChild!==priorNext}));
assert.equal(measuredWrites,0,'identical progress must not rewrite player storage');
assert.equal($('#priority').firstChild,priorPriority,'unrelated inputs retain priority nodes');
assert.equal($('#next-upgrade').firstChild,priorNext,'unrelated inputs retain Next Upgrade nodes');
// Calculator changes update its amounts while leaving the priority table intact.
change('#owned',0);
assert.equal($('#priority').firstChild,priorPriority);
assert.notEqual($('#next-upgrade').firstChild,priorNext);
assert.equal(measuredWrites,1,'real settings changes are persisted');
localStorage.setItem=originalWrite;
// A tracker-cleared region must be repopulated even when its markup is unchanged.
const expectedPriority=$('#priority').innerHTML;
$('#priority').replaceChildren();
$('#owned').dispatchEvent(new Event('input',{bubbles:true}));
assert.equal($('#priority').innerHTML,expectedPriority);
// Image fallback changes survive an unrelated render of the same markup.
const nextImage=$('#next-upgrade .upgrade-heading img');
nextImage.dispatchEvent(new Event('error'));
$('#owned').dispatchEvent(new Event('input',{bubbles:true}));
assert.equal($('#next-upgrade .upgrade-heading img'),nextImage);
assert.equal(nextImage.hidden,true);


change('[data-node="Harmony"]',1);
const undoDisabled=$('#undo-progress').disabled;
await explain($('#next-upgrade [data-fd-note]'),/partly completed Scouter step.*Fragment cost.*Actual gain may differ/);
assert.match($('#next-upgrade [data-fd-note]').textContent,/≈/);assert.equal($('#undo-progress').disabled,undoDisabled);
// Average Stat FD is separate from selecting/editing a tile, with no nested buttons.
await boot({[hyKey]:JSON.stringify({mode:'pair_lines_heroic',statCompleted:allStats,statLines:{[stats[0]]:[6,8,6]},levels:{Harmony:0}})});
const tile=document.querySelector('[data-stat-selector]');
assert.equal(tile.querySelector('[data-stat-select] [data-fd-note]'),null);
const selected=tile.querySelector('[data-stat-select]').getAttribute('aria-expanded');
assert.equal(tile.querySelector('[data-fd-note]').textContent,'~3.295% FD');
await explain(tile.querySelector('[data-fd-note]'),/General average.*not personalised FD.*totalling 20/);
assert.equal(tile.querySelector('[data-stat-select]').getAttribute('aria-expanded'),selected);
// FD information is still readable when progress editing pauses on failed refresh.
globalThis.fetch=async()=>{throw new Error('offline');};
focusRefresh();await tick();await tick();
assert.equal($('#next-upgrade [data-upgrade-skill]').disabled,true);
assert.equal($('#next-upgrade [data-fd-note]').disabled,false);
await explain($('#next-upgrade [data-fd-note]'),/rounded Maple Scouter/);
await explain(tile.querySelector('[data-fd-note]'),/General average/);
// Unknown gains and invalid/missing Stat details never gain an invented value.
await boot({[hyKey]:JSON.stringify({mode:'pair_lines_heroic',statCompleted:allStats,levels:{Harmony:30}})});
assert.equal($('#next-upgrade [data-fd-note]'),null);assert.equal(document.querySelector('[data-stat-selector] [data-fd-note]'),null);
// Ren captured FD uses the same control in both material modes.
for(const draft of Object.values(ren)){
  draft.steps[3].fdFrom=1;draft.steps[3].fdGain=2.5;
}
await boot({[renKey]:JSON.stringify({mode:'pair_ren_lines_heroic',statCompleted:allStats})});
change('#class','ren');await tick();
await explain($('#next-upgrade [data-fd-note]'),/rounded Maple Scouter/);
for(const input of document.querySelectorAll('[name="world"]'))input.checked=input.value==='interactive';
$('[name="world"][value="interactive"]').dispatchEvent(new Event('change',{bubbles:true}));
await explain($('#priority [data-fd-note]'),/rounded Maple Scouter/);
// An unchanged refresh must retain invalid drafts, their validation and focus.
for(const job of ['hoyoung','ren']) {
  const key=job==='ren'?renKey:hyKey;
  const mode=job==='ren'?'pair_ren_lines_heroic':'pair_lines_heroic';
  await boot({[key]:JSON.stringify({mode,statUnlocked:allStats,statLines:{[stats[0]]:[6,8,6],[stats[1]]:[2,null,4]},owned:42,perday:20})});
  if(job==='ren'){change('#class','ren');await tick();}
  const fd=document.querySelector('[data-fd-key="stat:'+stats[0]+'"]');
  const completion=$('#completion').firstChild,totals=$('#totals').firstChild,time=$('#time-estimate').firstChild;
  let measured=0;const write=localStorage.setItem;
  localStorage.setItem=(key,value)=>{measured++;write(key,value);};
  for(let index=0;index<100;index++)$('#owned').dispatchEvent(new Event('input',{bubbles:true}));
  console.log(JSON.stringify({job,relatedNoops:100,playerWrites:measured,summaryRetained:$('#completion').firstChild===completion&&$('#totals').firstChild===totals&&$('#time-estimate').firstChild===time,statFdRetained:document.querySelector('[data-fd-key="stat:'+stats[0]+'"]')===fd}));
  assert.equal(measured,0);localStorage.setItem=write;
  assert.ok($('#completion').firstChild===completion&&$('#totals').firstChild===totals&&$('#time-estimate').firstChild===time);
  assert.ok(document.querySelector('[data-fd-key="stat:'+stats[0]+'"]')===fd);
  $('[data-stat-select="'+stats[1]+'"]').click();
  const invalid=document.querySelector('[data-stat-line="'+stats[1]+'"][data-line-index="1"]');
  invalid.value='15';invalid.dispatchEvent(new Event('input',{bubbles:true}));invalid.focus();
  assert.equal(invalid.getAttribute('aria-invalid'),'true');
  const before=localStorage.getItem(key),note=invalid.closest('.stat-row').querySelector('.stat-note').textContent;
  focusRefresh();await tick();await tick();
  assert.ok(invalid.isConnected);assert.equal(invalid.value,'15');assert.equal(invalid.getAttribute('aria-invalid'),'true');
  assert.equal(invalid.validationMessage,note);assert.equal(document.activeElement,invalid);
  assert.equal(localStorage.getItem(key),before);
  // Rebuilt FD buttons return focus by logical key when source names change.
  const original=document.querySelector('#priority [data-fd-key]');original.focus();original.click();
  const keyFD=original.dataset.fdKey;
  const prior=drafts[job][mode];
  drafts[job][mode]={...prior,shortNames:{...prior.shortNames,[job==='ren'?'ren_skillCore1':'Harmony']:'Changed reviewed name'}};
  focusRefresh();await tick();await tick();
  assert.equal(original.isConnected,false);$('#fd-explanation-close').click();await tick();
  assert.equal(document.activeElement.dataset.fdKey,keyFD);
  const replaced=document.activeElement;replaced.click();
  drafts[job][mode]={...prior,steps:prior.steps.map(step=>({...step,fdGain:undefined,fdFrom:undefined}))};
  focusRefresh();await tick();await tick();$('#fd-explanation-close').click();await tick();
  assert.equal(document.activeElement,$('#view-tracker'),'removed FD opener uses the current view button');
  assert.ok($('#priority').children.length>0,'valid source without FD still has priority rows');
  drafts[job][mode]=prior;
}
// An intentional focus move while waiting for source data must win.
let release;const wait=new Promise(resolve=>release=resolve);
let delayed=false;
await boot({[hyKey]:JSON.stringify({mode:'pair_lines_heroic',statCompleted:allStats})},async url=>{
  if(delayed)await wait;
  return Response.json(url.startsWith('/api/tracker-catalogue')?models.hoyoung:{drafts:hy});
});
const editor=$('[data-node="Harmony"]');editor.focus();delayed=true;focusRefresh();
$('#view-infographic').focus();release();await tick();await tick();
assert.equal(document.activeElement,$('#view-infographic'));
await win.happyDOM.abort();
console.log('FD explanations: source/partial/Stat, modal/focus, paused views, blank values and class/world isolation pass');
