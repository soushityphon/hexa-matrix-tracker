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
const snapshot=()=>Object.fromEntries([hyKey,renKey,'hexa-tracker-class-v1'].map(key=>[key,localStorage.getItem(key)]).filter(([,value])=>value!==null));

await boot({[hyKey]:JSON.stringify({mode:'pair_lines_heroic',levels:{'HEXA Stat I':20,'HEXA Stat II':12,Harmony:1},statUnlocked:{'HEXA Stat III':true},owned:42})});
assert.equal(document.querySelectorAll('[data-stat-line]').length,9);
assert.deepEqual(fields(stats[0]).map(el=>el.value),['','','']);
assert.equal(row(stats[0]).querySelector('[data-stat]').textContent,'20 / 20');
assert.equal(row(stats[0]).querySelector('.stat-fd').textContent,'');
assert.match(row(stats[0]).querySelector('.stat-note').textContent,/Saved total 20/);
assert.equal(state(hyKey).levels[stats[1]],12);
assert.equal(state(hyKey).statUnlocked[stats[2]],true);
const completionBefore=$('#completion').textContent, totalsBefore=$('#totals').textContent;
$('#next-upgrade [data-stat-action="lines"]').click();
assert.equal(document.activeElement,fields(stats[1])[0]);
assert.equal(state(hyKey).levels[stats[1]],12);
split(stats[0],[6,8,6]);
assert.equal(row(stats[0]).querySelector('.stat-fd').textContent,'Approx. FD 3.295%');
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
assert.deepEqual(fields(stats[0]).map(el=>el.value),['6','','6']);
enter(stats[0],1,7);
assert.equal(state(hyKey).levels[stats[0]],19);
assert.match($('#next-upgrade').textContent,/HEXA Stat I/);
assert.equal(row(stats[0]).querySelector('.stat-fd').textContent,'');
enter(stats[0],1,8);
assert.match($('#next-upgrade').textContent,/HEXA Stat II/);
split(stats[1],[6,6,8]);
split(stats[2],[10,10,0]);
assert.equal(row(stats[1]).querySelector('.stat-fd').textContent,'Approx. FD 3.295%');
assert.equal(row(stats[2]).querySelector('.stat-fd').textContent,'Approx. FD 4.789%');
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
change('#class','ren');await tick();
assert.deepEqual(fields(stats[0]).map(el=>el.value),['0','0','0']);
assert.equal(state(renKey).levels.ren_skillCore1,1);
$('#next-upgrade [data-stat-action="unlock"]').click();
assert.equal(state(renKey).statUnlocked[stats[0]],true);
assert.equal(state(renKey).levels[stats[0]],0);
assert.deepEqual(state(renKey).statLines[stats[0]],[0,0,0]);
split(stats[0],[6,6,8]);
assert.equal(row(stats[0]).querySelector('.stat-fd').textContent,'Approx. FD 3.295%');
split(stats[1],[4,8,8]);split(stats[2],[0,10,10]);
assert.equal(row(stats[1]).querySelector('.stat-fd').textContent,'Approx. FD 3.022%');
assert.equal(row(stats[2]).querySelector('.stat-fd').textContent,'Approx. FD 3.099%');
assert.deepEqual(state(hyKey),preservedHy);
await boot(snapshot());
assert.equal($('#class').value,'ren');
assert.deepEqual(fields(stats[0]).map(el=>el.value),['6','6','8']);
change('#class','hoyoung');await tick();
assert.deepEqual(fields(stats[0]).map(el=>el.value),['6','8','6']);
change('#class','ren');await tick();$('#reset').click();
assert.deepEqual(state(renKey).statLines[stats[0]],[0,0,0]);
assert.deepEqual(state(hyKey),preservedHy);
assert.equal($('#next-upgrade [data-stat-action="complete"]'),null);
await win.happyDOM.abort();
console.log('HEXA Stat DOM: legacy migration, partial reload, invalid edits, FD, all nodes/classes, hidden/update/world switching, priority actions, costs and class-only reset passed');
