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

const state=()=>JSON.parse(localStorage.getItem(hyKey));
const change=(selector,value)=>{const field=$(selector);field.value=value;field.dispatchEvent(new Event('change',{bubbles:true}));};
const edit=(field,value,type='input')=>{field.value=String(value);field.dispatchEvent(new Event(type,{bubbles:true}));};
const commit=field=>field.dispatchEvent(new Event('change',{bubbles:true}));
const undo=()=>$('#undo-progress').click();
const field=()=> $('[data-node="Harmony"]');
const statFields=()=>[...document.querySelectorAll('[data-stat-line="'+stats[0]+'"]')];
const unlocked=()=> $('[data-stat-unlocked="'+stats[0]+'"]');
const completeStats=Object.fromEntries(stats.map(skill=>[skill,true]));

// Last action only, whole typed edits, no resources/settings changed by Undo.
await boot({[hyKey]:JSON.stringify({levels:{Harmony:7},owned:42,perday:4})});
assert.equal($('#undo-progress').disabled,true);
edit(field(),1);edit(field(),12);commit(field());
change('#owned',99);change('#perday',8);change('#erdaRequest','yes');
undo();assert.equal(field().value,'7');assert.equal(state().levels.Harmony,7);
assert.equal(state().owned,99);assert.equal(state().perday,8);assert.equal(state().erdaRequest,true);
assert.equal($('#undo-progress').disabled,true);assert.match($('#undo-status').textContent,/Restored previous/);
edit(field(),10);commit(field());edit(field(),15);commit(field());undo();
assert.equal(field().value,'10');assert.equal($('#undo-progress').disabled,true);
// A no-op does not replace the previous real action.
edit(field(),11);commit(field());edit(field(),11);commit(field());undo();assert.equal(field().value,'10');
// Duplicate change after a committed edit must not create a second Undo.
edit(field(),12);commit(field());commit(field());undo();assert.equal(field().value,'10');

// Focus/blur sessions coalesce typing but keep successive edits separate.
field().focus();edit(field(),1);edit(field(),14);field().blur();
field().focus();edit(field(),2);edit(field(),20);field().blur();undo();assert.equal(field().value,'14');

// Next level and checkpoint use their actual pre-click level, independent of inventory.
for(const selector of ['[data-next-level]','button[data-upgrade-level]:not([data-next-level])']) {
  await boot({[hyKey]:JSON.stringify({levels:{Harmony:0},statCompleted:completeStats,owned:42})});
  $('#next-upgrade '+selector).click();assert.ok(state().levels.Harmony>0);
  undo();assert.equal(state().levels.Harmony,0);assert.equal(state().owned,42);
}

// Stat unlock, cancellation and line edits restore the complete actual state.
await boot({[hyKey]:JSON.stringify({levels:{Harmony:1},statLines:{[stats[0]]:[0,0,0]},owned:42})});
$('#next-upgrade [data-stat-action="unlock"]').click();assert.equal(unlocked().checked,true);
undo();assert.equal(unlocked().checked,false);assert.deepEqual(state().statLines[stats[0]],[0,0,0]);
$('#next-upgrade [data-stat-action="unlock"]').click();
$('[data-stat-cancel="'+stats[0]+'"]').click();assert.equal(unlocked().checked,false);
undo();assert.equal(unlocked().checked,true);
$('[data-stat-select="'+stats[0]+'"]').click();
edit(statFields()[0],1);edit(statFields()[0],10);commit(statFields()[0]);
assert.deepEqual(state().statLines[stats[0]],[10,0,0]);undo();
assert.deepEqual(state().statLines[stats[0]],[0,0,0]);assert.equal(unlocked().checked,true);
assert.equal(state().levels.Harmony,1);assert.equal(state().owned,42);
// Invalid drafts neither save nor add an undo action.
edit(statFields()[0],11);commit(statFields()[0]);assert.equal($('#undo-progress').disabled,true);
assert.deepEqual(state().statLines[stats[0]],[0,0,0]);
// Partial and completed marks retain their exact former lines and mark.
await boot({[hyKey]:JSON.stringify({levels:{[stats[0]]:20},statLines:{[stats[0]]:[10,5,null]},statUnlocked:{[stats[0]]:true},statCompleted:{[stats[0]]:true}})});
edit(statFields()[2],5);commit(statFields()[2]);assert.equal(state().statCompleted[stats[0]],false);
undo();assert.deepEqual(state().statLines[stats[0]],[10,5,null]);assert.equal(state().statCompleted[stats[0]],true);
assert.equal(state().levels[stats[0]],20);
// A legacy total with unknown lines is restored without inventing a split.
await boot({[hyKey]:JSON.stringify({levels:{[stats[0]]:7},statUnlocked:{[stats[0]]:true}})});
edit(statFields()[0],2);commit(statFields()[0]);undo();
assert.equal(state().levels[stats[0]],7);assert.deepEqual(state().statLines[stats[0]],[null,null,null]);
// Undoing a skill leaves other Stat progress and an invalid editor draft untouched.
await boot({[hyKey]:JSON.stringify({levels:{Harmony:1,[stats[1]]:20},statLines:{[stats[1]]:[10,5,5]},statUnlocked:{[stats[1]]:true}})});
const otherLine=$('[data-stat-line="'+stats[1]+'"]');edit(otherLine,11);commit(otherLine);
edit(field(),7);commit(field());undo();assert.equal(otherLine.value,'11');
assert.deepEqual(state().statLines[stats[1]],[10,5,5]);assert.equal(state().levels[stats[1]],20);

// Restore prior infographic history for the touched skill; leave other skills alone.
await boot({[hyKey]:JSON.stringify({levels:{Harmony:1},owned:42})});
$('#view-infographic').click();
const checkpoint=skill=>[...document.querySelectorAll('[data-checkpoint]')].find(button=>JSON.parse(button.dataset.checkpoint)[0]===(skill==='Harmony'?harmony.id:skill));
checkpoint('Harmony').click();checkpoint(stats[0]).click();
const histories=structuredClone(state().infographicUndo);
$('#view-tracker').click();
edit(field(),2);commit(field());assert.deepEqual(state().infographicUndo,histories);
edit(field(),7);edit(field(),2);commit(field());assert.deepEqual(state().infographicUndo,histories);
assert.equal($('#undo-progress').disabled,true);
edit(field(),7);commit(field());
assert.equal(Object.keys(state().infographicUndo.pair_lines_heroic.skills).length,1);
undo();assert.equal(state().levels.Harmony,2);assert.deepEqual(state().infographicUndo,histories);
$('#view-infographic').click();checkpoint('Harmony').click();assert.equal(state().levels.Harmony,1);
assert.equal(state().levels[stats[0]],20);assert.equal($('#undo-progress').disabled,true);
// An infographic completion or Undo clears an ordinary action, including another skill.
$('#view-tracker').click();edit(field(),7);commit(field());$('#view-infographic').click();
checkpoint(stats[0]).click();assert.equal($('#undo-progress').disabled,true);
$('#view-tracker').click();assert.equal(state().levels.Harmony,7);

// Ordinary action has no persistence, and class/order/reset/import are boundaries.
const stored=localStorage.getItem(hyKey);await boot({[hyKey]:stored});assert.equal($('#undo-progress').disabled,true);
edit(field(),8);commit(field());change('#class','ren');await tick();
const renField=$('[data-node]');const renInitial=renField.value;
edit(renField,3);commit(renField);undo();assert.equal($('[data-node]').value,renInitial);
change('#class','hoyoung');await tick();assert.equal($('#undo-progress').disabled,true);assert.equal(field().value,'8');
edit(field(),9);commit(field());
$('[name="world"][value="heroic"]').checked=false;$('[name="world"][value="interactive"]').checked=true;
$('[name="world"][value="interactive"]').dispatchEvent(new Event('change',{bubbles:true}));
assert.equal($('#undo-progress').disabled,true);
edit(field(),10);commit(field());globalThis.confirm=()=>false;$('#reset').click();await tick();assert.equal($('#undo-progress').disabled,false);
globalThis.confirm=()=>true;$('#reset').click();await tick();assert.equal($('#undo-progress').disabled,true);
edit(field(),2);commit(field());
const incoming=createPlayerBackup({hoyoung:{levels:{Harmony:1},owned:77}},models);
const oldCreate=URL.createObjectURL,oldRevoke=URL.revokeObjectURL;
URL.createObjectURL=()=> 'blob:test';URL.revokeObjectURL=()=>{};win.HTMLAnchorElement.prototype.click=function(){};
Object.defineProperty($('#import-progress-file'),'files',{configurable:true,value:[{size:100,text:async()=>JSON.stringify(incoming)}]});
$('#import-progress-file').dispatchEvent(new Event('change'));await tick();
assert.match($('#backup-status').textContent,/Imported/);assert.equal($('#undo-progress').disabled,true);
URL.createObjectURL=oldCreate;URL.revokeObjectURL=oldRevoke;

// Pause on refresh/failure, retain on identical Retry, discard changed context.
let fail=false;
const response=url=>Response.json(url.startsWith('/api/tracker-catalogue')?models.hoyoung:{drafts:hy});
await boot({[hyKey]:JSON.stringify({levels:{Harmony:1}})},url=>{if(fail)throw new Error('offline');return response(url);});
edit(field(),7);commit(field());fail=true;win.dispatchEvent(new Event('focus'));
assert.equal($('#undo-progress').disabled,true);await tick();
const paused=localStorage.getItem(hyKey);$('#undo-progress').dispatchEvent(new Event('click'));
assert.equal(localStorage.getItem(hyKey),paused);
fail=false;$('#retry-priorities').click();await tick();assert.equal($('#undo-progress').disabled,false);
undo();assert.equal(field().value,'1');
edit(field(),7);commit(field());
const oldDraft=hy.pair_lines_heroic;
hy.pair_lines_heroic={...oldDraft,steps:[...oldDraft.steps,{skill:'Harmony',level:3}]};
win.dispatchEvent(new Event('focus'));await tick();assert.equal($('#undo-progress').disabled,true);
hy.pair_lines_heroic=oldDraft;
// Empty successful source data also removes the action, without resetting saved levels.
let empty=false;
await boot({[hyKey]:JSON.stringify({levels:{Harmony:1}})},url=>empty?Response.json(url.startsWith('/api/tracker-catalogue')?{nodes:[],stats:[]}:{drafts:{}}):response(url));
edit(field(),7);commit(field());empty=true;win.dispatchEvent(new Event('focus'));await tick();
assert.equal($('#undo-progress').disabled,true);assert.equal(state().levels.Harmony,7);

// Storage failures keep usable session Undo and preserve protected raw records.
for(const damaged of [false,true]) {
  await boot({[hyKey]:damaged?'42':JSON.stringify({levels:{Harmony:1}})});
  const raw=localStorage.getItem(hyKey),actual=localStorage;
  globalThis.localStorage={getItem:key=>actual.getItem(key),setItem:()=>{throw new Error('quota');},removeItem:key=>actual.removeItem(key)};
  edit(field(),7);commit(field());undo();assert.equal(field().value,damaged?'0':'1');
  assert.equal(actual.getItem(hyKey),raw);assert.equal($('#save-status').hidden,false);
}

// Pure guard: a later affected-skill mutation or different scope cannot be undone.
const undoState={levels:{Harmony:1,other:3},owned:42};
const engine=createProgressUndo(),before=captureSkillProgress(undoState,'Harmony');
undoState.levels.Harmony=2;
engine.record({skill:'Harmony',label:'Harmony',scope:'one',before,after:captureSkillProgress(undoState,'Harmony')});
undoState.levels.Harmony=7;assert.equal(engine.restore(undoState,'one',{}),null);assert.equal(undoState.levels.Harmony,7);
engine.record({skill:'Harmony',label:'Harmony',scope:'one',before,after:captureSkillProgress(undoState,'Harmony')});
assert.equal(engine.restore(undoState,'two',{}),null);
assert.equal(undoState.levels.other,3);assert.equal(undoState.owned,42);
// A valid history is restored only for matching recorded source sequences.
const historyState={levels:{Harmony:2,other:3},infographicUndo:{old:{sequence:'old-source',skills:{}}}};
const record={key:'key',skill:'Harmony',before:{level:1},after:{level:2}};
const historyBefore=captureSkillProgress(historyState,'Harmony');
historyBefore.history={old:{sequence:'old-source',skills:{id:[record]}}};
historyState.levels.Harmony=7;
engine.record({skill:'Harmony',label:'Harmony',scope:'one',before:historyBefore,after:captureSkillProgress(historyState,'Harmony')});
engine.restore(historyState,'one',{old:{context:{mode:'old',sequence:'new-source'},entries:[]}});
assert.equal(historyState.levels.Harmony,2);assert.deepEqual(historyState.infographicUndo.old.skills,{});
await win.happyDOM.abort();
console.log('Ordinary Undo: typed/actions/Stats, history, resources, scope, refresh and protected-storage regressions pass');
