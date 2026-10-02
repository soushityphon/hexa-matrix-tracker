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
await win.happyDOM.abort();
console.log('FD explanations: source/partial/Stat, modal/focus, paused views, blank values and class/world isolation pass');
