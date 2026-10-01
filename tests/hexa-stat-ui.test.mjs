import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';
import { NODES, STAT_ICONS } from '../data.js';
import { currentDraft } from '../priority-draft.js';
import { validatePair } from '../admin-panel-model.js';
import { reconstructScouterOrder, discoverySelection } from '../scouter-discovery.js';
import { renDraftFromCapture, renCatalogueFromDrafts } from '../ren-priority.js';

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
const hyKey='hexa-tracker-hoyoung-v1',renKey='hexa-tracker-ren-v1';
let win;
const tick=()=>new Promise(resolve=>setTimeout(resolve,20));
async function boot(storage={}){
  if(win)await win.happyDOM.abort();
  win=new Window({url:'https://test.example/'});
  win.document.write(readFileSync(new URL('../index.html',import.meta.url),'utf8').replace(/<script[^>]*>[\s\S]*?<\/script>/g,''));
  for(const key of ['window','document','location','localStorage','Event'])globalThis[key]=key==='window'?win:win[key];
  globalThis.Option=function(text,value){const option=document.createElement('option');option.textContent=text;option.value=value;return option;};
  globalThis.confirm=()=>true;
  for(const [key,value] of Object.entries(storage))localStorage.setItem(key,value);
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

await boot({[hyKey]:JSON.stringify({mode:'pair_lines_heroic',levels:{'HEXA Stat I':20,'HEXA Stat II':12,Harmony:1},statUnlocked:{'HEXA Stat III':true},owned:42})});
assert.equal(document.querySelectorAll('[data-stat-line]').length,9);
assert.equal(document.querySelectorAll('[data-stat-select]').length,3);
const beforeAnimationToggle=structuredClone(state(hyKey));
$('#animations').click();assert.equal(localStorage.getItem('hexa-tracker-animations-v1'),'off');
assert.deepEqual(state(hyKey),beforeAnimationToggle);
assert.equal(row(stats[0]).hidden,true);
assert.equal(row(stats[1]).hidden,true);
assert.equal(row(stats[0]).querySelector('[data-stat-unlocked]').hidden,true);
assert.deepEqual([...row(stats[0]).querySelectorAll('.stat-line-heading')].map(el=>el.textContent),['Main Stat','Additional Stats']);
assert.equal(row(stats[0]).querySelectorAll('.stat-bar i').length,30);
const selector=skill=>[...document.querySelectorAll('[data-stat-selector]')].find(el=>el.dataset.statSelector===skill);
assert.equal(selector(stats[2]).querySelector('[data-stat-cancel]').hidden,false);
selector(stats[2]).querySelector('[data-stat-cancel]').click();
assert.equal(state(hyKey).statUnlocked[stats[2]],false);
assert.equal(selector(stats[2]).querySelector('.stat-unlock-icon').classList.contains('is-unlocked'),false);
assert.equal(selector(stats[2]).querySelector('[data-stat-cancel]').hidden,true);
assert.equal(row(stats[0]).hidden,true); // Cancel does not open the editor.
selector(stats[2]).click();
assert.equal(row(stats[2]).hidden,false);
assert.equal(state(hyKey).statUnlocked[stats[2]],false); // Tile selection never unlocks.
selector(stats[2]).querySelector('img').click();
assert.equal(row(stats[2]).hidden,true); // Clicking the same tile closes editing.
enter(stats[2],0,0);
assert.equal(state(hyKey).statUnlocked[stats[2]],true); // Explicit valid zero also unlocks.
selector(stats[0]).querySelector('[data-stat-select]').click();
assert.equal(row(stats[0]).hidden,false);
assert.equal(selector(stats[0]).querySelector('[data-stat-cancel]').hidden,true);
assert.equal(selector(stats[0]).querySelectorAll('.stat-mini-value').length,3);
assert.deepEqual([...selector(stats[0]).querySelectorAll('.stat-mini-value')].map(el=>el.textContent),['','','']);
assert.deepEqual(fields(stats[0]).map(el=>el.value),['','','']);
assert.equal(row(stats[0]).querySelector('[data-stat]').textContent,'');
assert.equal(row(stats[0]).querySelector('.stat-fd').textContent,'');
assert.match(row(stats[0]).querySelector('.stat-note').textContent,/Saved total 20/);
assert.equal(state(hyKey).levels[stats[1]],12);
assert.equal(state(hyKey).statUnlocked[stats[2]],true);
const completionBefore=$('#completion').textContent, totalsBefore=$('#totals').textContent;
$('#next-upgrade [data-stat-action="lines"]').click();
assert.equal(document.activeElement,fields(stats[1])[0]);
assert.equal(row(stats[1]).hidden,false);
assert.equal(state(hyKey).levels[stats[1]],12);
split(stats[0],[6,8,6]);
assert.equal(row(stats[0]).querySelector('.stat-fd').textContent,'~3.295% FD');
assert.equal(selector(stats[0]).querySelector('.stat-selector-summary').textContent,'~3.295% FD');
assert.equal(row(stats[0]).querySelectorAll('.stat-main .filled').length,6);
assert.deepEqual([...selector(stats[0]).querySelectorAll('.stat-mini-value')].map(el=>el.textContent),['6','8','6']);
assert.equal(selector(stats[0]).querySelectorAll('.stat-mini-line .filled').length,20);
assert.equal(selector(stats[0]).querySelector('[data-stat-cancel]').hidden,true);
assert.equal(selector(stats[0]).querySelector('.stat-selector-summary').classList.contains('fd-gain'),true);
const completed=structuredClone(state(hyKey));
for(const invalid of [-1,11,6.5,7]){
  enter(stats[0],0,invalid);
  assert.equal(fields(stats[0])[0].getAttribute('aria-invalid'),'true');
  assert.deepEqual(state(hyKey),completed);
  assert.equal(row(stats[0]).querySelector('.stat-fd').textContent,'');
}
enter(stats[0],0,6);
enter(stats[0],1,'');
assert.equal(state(hyKey).levels[stats[0]],20);
assert.deepEqual(state(hyKey).statLines[stats[0]],[6,null,6]);
assert.equal(row(stats[0]).querySelector('.stat-fd').textContent,'');
await boot(snapshot());
assert.ok(stats.every(skill=>row(skill).hidden));
assert.deepEqual(fields(stats[0]).map(el=>el.value),['6','','6']);
enter(stats[0],1,7);
assert.equal(state(hyKey).levels[stats[0]],19);
assert.match($('#next-upgrade').textContent,/HEXA Stat I/);
assert.equal(row(stats[0]).querySelector('.stat-fd').textContent,'');
enter(stats[0],1,8);
assert.match($('#next-upgrade').textContent,/HEXA Stat II/);
split(stats[1],[6,6,8]);
split(stats[2],[10,10,0]);
assert.equal(row(stats[1]).querySelector('.stat-fd').textContent,'~3.295% FD');
assert.equal(row(stats[2]).querySelector('.stat-fd').textContent,'~4.789% FD');
assert.match($('#next-upgrade').textContent,/Harmony/);
assert.match($('#next-upgrade').textContent,/0.698% FD/);
assert.equal($('#completion').textContent,completionBefore);
assert.equal($('#totals').textContent,totalsBefore);
assert.equal(state(hyKey).owned,42);

change('#patch','pair_hidden');
assert.equal(row(stats[1]).hidden,true);
assert.equal(row(stats[2]).hidden,true);
await boot(snapshot());
assert.equal(row(stats[2]).hidden,true);
change('#patch','pair_lines');
assert.deepEqual(fields(stats[2]).map(el=>el.value),['10','10','0']);
const world=$('[name="world"][value="interactive"]');world.checked=true;world.dispatchEvent(new Event('change',{bubbles:true}));
assert.equal(state(hyKey).mode,'pair_lines_interactive');
assert.deepEqual(state(hyKey).statLines[stats[0]],[6,8,6]);
const preservedHy=structuredClone(state(hyKey));
// Hold both first-load Ren requests and verify parallel fetch, truthful loading,
// cached Hoyoung restoration and reuse of the pending Ren request on rapid switches.
const realFetch=globalThis.fetch, pending=[];
globalThis.fetch=url=>new Promise(resolve=>pending.push({url,resolve}));
change('#class','ren');
assert.equal(pending.length,2);
assert.match($('#nodes').textContent,/Loading\.\.\./);
assert.match($('#next-upgrade').textContent,/Loading\.\.\./);
assert.doesNotMatch($('#nodes').textContent,/No skills saved/);
change('#class','hoyoung');
assert.equal(pending.length,2);
assert.equal(document.querySelectorAll('[data-node]').length,1);
assert.equal(state(hyKey).owned,42);
change('#class','ren');
assert.equal(pending.length,2);
for(const request of pending)request.resolve(await realFetch(request.url));
await tick();globalThis.fetch=realFetch;
assert.doesNotMatch($('#nodes').textContent,/Loading/);
assert.ok(stats.every(skill=>row(skill).hidden));
selector(stats[0]).click();
assert.deepEqual(fields(stats[0]).map(el=>el.value),['0','0','0']);
assert.equal(state(renKey).levels.ren_skillCore1,1);
assert.equal(selector(stats[0]).querySelector('.stat-unlock-icon').classList.contains('is-unlocked'),false);
enter(stats[0],0,0);
assert.equal(state(renKey).statUnlocked[stats[0]],true);
selector(stats[0]).querySelector('[data-stat-cancel]').click();
assert.equal(state(renKey).statUnlocked[stats[0]],false);
assert.equal(row(stats[0]).hidden,false);
$('#next-upgrade [data-stat-action="unlock"]').click();
assert.equal(state(renKey).statUnlocked[stats[0]],true);
assert.equal(state(renKey).levels[stats[0]],0);
assert.deepEqual(state(renKey).statLines[stats[0]],[0,0,0]);
split(stats[0],[6,6,8]);
assert.equal(row(stats[0]).querySelector('.stat-fd').textContent,'~3.295% FD');
split(stats[1],[4,8,8]);split(stats[2],[0,10,10]);
assert.equal(row(stats[1]).querySelector('.stat-fd').textContent,'~3.022% FD');
assert.equal(row(stats[2]).querySelector('.stat-fd').textContent,'~3.099% FD');
assert.deepEqual(state(hyKey),preservedHy);
await boot(snapshot());
assert.equal($('#class').value,'ren');
assert.deepEqual(fields(stats[0]).map(el=>el.value),['6','6','8']);
change('#class','hoyoung');await tick();
assert.deepEqual(fields(stats[0]).map(el=>el.value),['6','8','6']);
change('#class','ren');await tick();$('#reset').click();
assert.equal(localStorage.getItem('hexa-tracker-animations-v1'),'off');
assert.ok([...document.querySelectorAll('.decoration-layer')].every(layer=>layer.hidden));
assert.deepEqual(state(renKey).statLines[stats[0]],[0,0,0]);
assert.deepEqual(state(hyKey),preservedHy);
assert.equal($('#next-upgrade [data-stat-action="complete"]'),null);
// Switch cache expires after 30 seconds rather than keeping shared data forever.
const realNow=Date.now;let expiredRequests=0;
Date.now=()=>realNow()+30001;
globalThis.fetch=async (...args)=>{expiredRequests++;return realFetch(...args);};
change('#class','hoyoung');await tick();
assert.equal(expiredRequests,2);
assert.equal(state(hyKey).owned,42);
Date.now=realNow;
change('#class','ren');await tick();
// A focus refresh bypasses the short switch cache. Failure clears unavailable data;
// a later successful empty catalogue has the true empty-state message.
let focusRequests=0;
globalThis.fetch=async()=>{focusRequests++;return new Response('Unavailable',{status:503});};
win.dispatchEvent(new Event('focus'));await tick();
assert.equal(focusRequests,2);
assert.match($('#nodes').textContent,/Skills could not be loaded/);
assert.match($('#priority-sync').textContent,/could not be loaded/);
assert.equal(document.querySelectorAll('[data-node]').length,0);
globalThis.fetch=async url=>Response.json(url.startsWith('/api/tracker-catalogue')?{nodes:[],stats:[]}:{drafts:{}});
win.dispatchEvent(new Event('focus'));await tick();
assert.match($('#nodes').textContent,/No skills saved/);
assert.equal($('#priority-sync').textContent,'');
const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
assert.match(css,/\.fd-gain\{color:var\(--ui-accent\)/);
await win.happyDOM.abort();
console.log('HEXA Stat DOM: legacy migration, partial reload, invalid edits, FD, all nodes/classes, hidden/update/world switching, priority actions, costs and class-only reset passed');
