import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';
import { infographicCheckpoints, infographicDisplayCheckpoints, infographicContext, infographicDone, infographicCanUndo, clickInfographicCheckpoint, reconcileInfographicUndo, invalidateInfographicUndo } from '../infographic-progress.js';
import { connectorPaths, createInfographic } from '../infographic.js';
import { displayPriorityRows, setTrackerCatalogue } from '../planner.js';
import { statProgress } from '../hexa-stat.js';
import { NODES, STAT_ICONS } from '../data.js';
import { currentDraft } from '../priority-draft.js';
import { validatePair } from '../admin-panel-model.js';
import { reconstructScouterOrder, discoverySelection } from '../scouter-discovery.js';
import { renDraftFromCapture, renCatalogueFromDrafts } from '../ren-priority.js';

// Different IDs, counts and bounds exercise future catalogue support, without
// publishing synthetic game data or depending on class names/skill positions.
const future=[{id:'origin-q',short:'Future Origin',name:'Origin',initialLevel:1,maxLevel:30},
  {id:'skill-x',short:'Future Skill',name:'Skill',maxLevel:30},
  {id:'stat-z',short:'Future Stat',name:'Stat',isStat:true,maxLevel:20},
  {id:'extra-y',short:'Extra',name:'Extra',maxLevel:30}];
const order=[{skill:'Future Origin',level:1},{skill:'Future Skill',level:10},{skill:'Extra',level:1},
  {skill:'Future Skill',level:15},{skill:'Future Skill',level:30},{skill:'Future Stat',level:1},
  {skill:'Future Stat',level:20}];
const entries=infographicCheckpoints(order,future),context=infographicContext('future-order',entries);
assert.deepEqual(entries.map(e=>e.target),[1,10,1,15,30,20]);
assert.deepEqual(entries.map(e=>e.label),['1','10','1','15','MAX','MAX']);
assert.equal(infographicCheckpoints([{skill:'unknown',level:1},{skill:'Extra',level:31}],future).length,0);
const state={levels:{'Future Skill':7},statLines:{'Future Stat':[2,3,4]},owned:60};
const [origin,ten,extra,fifteen,max,stat]=entries;
assert.equal(infographicDone(state,origin),true);
assert.equal(clickInfographicCheckpoint(state,context,entries,origin.key),false);
assert.equal(clickInfographicCheckpoint(state,context,entries,ten.key),true);
assert.equal(state.levels['Future Skill'],10);
assert.equal(state.levels.Extra,undefined);
assert.equal(clickInfographicCheckpoint(state,context,entries,fifteen.key),true);
assert.equal(infographicCanUndo(state,context,ten),false);
assert.equal(clickInfographicCheckpoint(state,context,entries,ten.key),false);
assert.equal(state.levels['Future Skill'],15);
assert.equal(clickInfographicCheckpoint(state,context,entries,extra.key),true);
assert.equal(clickInfographicCheckpoint(state,context,entries,fifteen.key),true);
assert.equal(state.levels['Future Skill'],10);
assert.equal(clickInfographicCheckpoint(state,context,entries,ten.key),true);
assert.equal(state.levels['Future Skill'],7);
assert.equal(state.levels.Extra,1);
const statBefore=structuredClone(state);
clickInfographicCheckpoint(state,context,entries,stat.key);
assert.deepEqual(state.statLines['Future Stat'],[2,3,4]);
assert.equal(state.levels['Future Stat'],20);assert.equal(state.statUnlocked['Future Stat'],true);
assert.equal(statProgress(state.statLines['Future Stat'],20,true).fd,null);
assert.equal(statProgress([6,8,6],20,true).fd,3.295);
assert.equal(infographicDone(JSON.parse(JSON.stringify(state)),stat),true);
clickInfographicCheckpoint(state,context,entries,stat.key);
assert.equal(state.levels['Future Stat'],9);
assert.deepEqual(state.statLines,statBefore.statLines);assert.equal(state.statCompleted['Future Stat'],false);
assert.equal(state.statUnlocked['Future Stat'],true); // Actual positive lines already mean unlocked.
assert.equal(state.owned,60);
clickInfographicCheckpoint(state,context,entries,ten.key);
state.levels['Future Skill']=12;
reconcileInfographicUndo(state,context,entries);
assert.equal(infographicCanUndo(state,context,ten),false);
assert.equal(clickInfographicCheckpoint(state,context,entries,ten.key),false);
clickInfographicCheckpoint(state,context,entries,fifteen.key);
invalidateInfographicUndo(state,'Future Skill');
assert.equal(infographicCanUndo(state,context,fifteen),false);
clickInfographicCheckpoint(state,context,entries,max.key);
const changed=infographicContext(context.mode,entries.slice(1));
reconcileInfographicUndo(state,changed,entries.slice(1));
assert.equal(state.infographicUndo[context.mode],undefined);
// Dynamic run endpoints, including the adjacent levels in the owner's report.
const guideNodes=[...future,{id:'lotus-l',short:'Future Lotus',name:'Lotus',maxLevel:30},
  {id:'ascent-a',short:'Future Ascent',name:'Ascent',maxLevel:30}];
const guideOrder=[{skill:'Future Lotus',level:14},{skill:'Future Lotus',level:15},
  {skill:'Future Origin',level:20},{skill:'Future Origin',level:21},
  {skill:'Future Ascent',level:26},{skill:'Future Ascent',level:27},{skill:'Future Ascent',level:29}];
const guide=infographicCheckpoints(guideOrder,guideNodes),guideContext=infographicContext('guide',guide);
const targets=(entries,state,scope)=>infographicDisplayCheckpoints(entries,state,scope).filter(entry=>!infographicDone(state,entry)).map(entry=>[entry.skill,entry.target]);
assert.deepEqual(targets(guide,{levels:{}},guideContext),[['Future Lotus',15],['Future Origin',21],['Future Ascent',29]]);
assert.deepEqual(targets(guide,{levels:{'Future Lotus':14,'Future Origin':20,'Future Ascent':28}},guideContext),[['Future Lotus',15],['Future Origin',21],['Future Ascent',29]]);
const bridgeState={levels:{'Future Skill':7}},bridgeScope=infographicContext('bridge',entries);
assert.deepEqual(targets(entries,bridgeState,bridgeScope),[['Future Skill',10],['Extra',1],['Future Skill',30],['Future Stat',20]]);
bridgeState.levels.Extra=1;
assert.deepEqual(targets(entries,bridgeState,bridgeScope),[['Future Skill',30],['Future Stat',20]]);
// A combined MAX must remain at its final source position in the full guide.
// Completed intervening skills let its remaining run merge, but cannot move
// that endpoint ahead of their faded checkpoints.
const positionOrder=[{skill:'Future Lotus',level:14},{skill:'Future Origin',level:20},
  {skill:'Future Lotus',level:15},{skill:'Future Origin',level:21},
  {skill:'Future Ascent',level:29},{skill:'Future Lotus',level:30}];
const positioned=infographicCheckpoints(positionOrder,guideNodes),positionScope=infographicContext('position',positioned);
const oneLeft={levels:{'Future Origin':30,'Future Ascent':30,'Future Lotus':0}};
assert.deepEqual(infographicDisplayCheckpoints(positioned,oneLeft,positionScope).map(entry=>[entry.skill,entry.target]),
  [['Future Origin',21],['Future Ascent',29],['Future Lotus',30]]);
oneLeft.levels['Future Origin']=0;
let positionedView=infographicDisplayCheckpoints(positioned,oneLeft,positionScope);
assert.equal(positionedView.at(-1).key,positioned.at(-1).key);
assert.deepEqual(positionedView.filter(entry=>entry.skill==='Future Lotus').map(entry=>entry.target),[14,15,30]);
oneLeft.levels['Future Origin']=30;oneLeft.levels['Future Lotus']=28;
assert.equal(infographicDisplayCheckpoints(positioned,oneLeft,positionScope).at(-1).key,positioned.at(-1).key);
clickInfographicCheckpoint(oneLeft,positionScope,positioned,positioned.at(-1).key);
let positionReload=JSON.parse(JSON.stringify(oneLeft));
assert.equal(infographicDisplayCheckpoints(positioned,positionReload,positionScope).at(-1).key,positioned.at(-1).key);
assert.equal(clickInfographicCheckpoint(positionReload,positionScope,positioned,positioned.at(-1).key),true);
assert.equal(positionReload.levels['Future Lotus'],28);
assert.equal(infographicDisplayCheckpoints(positioned,positionReload,positionScope).at(-1).key,positioned.at(-1).key);
// Clicking one checkpoint can join later remaining runs, without losing its
// faded undo button or invalidating the stable source context.
const joinOrder=[{skill:'Future Skill',level:10},{skill:'Extra',level:1},{skill:'Future Skill',level:15},
  {skill:'Future Stat',level:20},{skill:'Future Skill',level:30}];
const joinEntries=infographicCheckpoints(joinOrder,future),joinScope=infographicContext('join',joinEntries);
const joined={levels:{'Future Skill':7},owned:60};
const [joinTen,joinExtra,joinFifteen,joinStat,joinMax]=joinEntries;
clickInfographicCheckpoint(joined,joinScope,joinEntries,joinTen.key);
clickInfographicCheckpoint(joined,joinScope,joinEntries,joinExtra.key);
clickInfographicCheckpoint(joined,joinScope,joinEntries,joinFifteen.key);
clickInfographicCheckpoint(joined,joinScope,joinEntries,joinStat.key);
clickInfographicCheckpoint(joined,joinScope,joinEntries,joinMax.key);
let joinedReload=JSON.parse(JSON.stringify(joined));
reconcileInfographicUndo(joinedReload,joinScope,joinEntries);
assert.ok([joinTen,joinFifteen,joinMax].every(entry=>infographicDisplayCheckpoints(joinEntries,joinedReload,joinScope).some(shown=>shown.key===entry.key)));
assert.equal(infographicCanUndo(joinedReload,joinScope,joinTen),false);
for(const [checkpoint,level] of [[joinMax,15],[joinFifteen,10],[joinTen,7]]) {
  assert.equal(clickInfographicCheckpoint(joinedReload,joinScope,joinEntries,checkpoint.key),true);
  assert.equal(joinedReload.levels['Future Skill'],level);
}
assert.equal(joinedReload.owned,60);assert.equal(joinedReload.statLines?.['Future Stat']??null,null);
// Histories from versions 90/91 keep their endpoint IDs, including individual
// raw clicks which are no longer offered as new condensed actions.
const legacy={levels:{'Future Skill':7}};
clickInfographicCheckpoint(legacy,context,entries,ten.key);
clickInfographicCheckpoint(legacy,context,entries,fifteen.key);
reconcileInfographicUndo(legacy,context,entries);
assert.ok(infographicDisplayCheckpoints(entries,legacy,context).some(entry=>entry.key===ten.key));
assert.equal(clickInfographicCheckpoint(legacy,context,entries,fifteen.key),true);
assert.equal(clickInfographicCheckpoint(legacy,context,entries,ten.key),true);
assert.equal(legacy.levels['Future Skill'],7);

const paths=connectorPaths([{x:24,y:14,width:64,height:88},{x:124,y:14,width:64,height:88},{x:24,y:150,width:64,height:88}],240);
assert.equal(paths[0],'M 88 58 H 120');
assert.equal(paths[1],'M 188 58 H 235 V 126 H 5 V 194 H 20');
assert.equal(connectorPaths([],240).length,0);

// Switching priorities retains buttons while changing their DOM order. Measured
// geometry must follow that order, and repeated redraws must replace old routes.
const layoutWindow=new Window(),layoutDocument=layoutWindow.document;
const grid=layoutDocument.createElement('div');layoutDocument.body.append(grid);
let redraw;
layoutWindow.requestAnimationFrame=callback=>{redraw=callback;return 1;};
layoutWindow.cancelAnimationFrame=()=>{};
let layoutWidth=200;
grid.getBoundingClientRect=()=>({left:0,top:0,width:layoutWidth,height:300});
const view=createInfographic({document:layoutDocument,window:layoutWindow,grid,onClick:()=>{}});
const layoutState={levels:{}};
function checkLayout(sequence,hideCompleted=false) {
  view.render(sequence,layoutState,infographicContext('layout',sequence),hideCompleted);
  const visible=[...grid.querySelectorAll('[data-checkpoint]')].filter(tile=>!tile.hidden);
  const columns=layoutWidth===200?2:3;
  const rects=visible.map((tile,i)=>{
    const rect={x:18+(i%columns)*74,y:10+Math.floor(i/columns)*84,width:56,height:64};
    tile.getBoundingClientRect=()=>({left:rect.x,top:rect.y,width:rect.width,height:rect.height});
    return rect;
  });
  redraw();
  const routes=[...grid.querySelectorAll('svg path')].filter(path=>!path.closest('defs'));
  const expected=connectorPaths(rects,layoutWidth);
  const leading=visible[0]?.getAttribute('aria-current')==='step';
  if(leading)expected.unshift(`M 5 ${rects[0].y+32} H ${rects[0].x-4}`);
  assert.deepEqual(routes.map(path=>path.getAttribute('d')),expected);
  assert.equal(routes.filter(path=>path.classList.contains('next')).length,visible.some(tile=>tile.hasAttribute('aria-current'))?1:0);
  assert.ok(routes.every(path=>path.getAttribute('marker-end')===`url(#infographic-arrow${path.classList.contains('next')?'-next':''})`));
  redraw();assert.equal([...grid.querySelectorAll('svg path')].filter(path=>!path.closest('defs')).length,expected.length);
}
const retainedSequence=[origin,ten,extra,stat];
checkLayout(retainedSequence);
const originalTen=grid.querySelector(`[data-checkpoint='${ten.key}']`);
for(let i=0;i<6;i++) {
  checkLayout([extra,stat,origin,ten]);
  checkLayout(retainedSequence);
}
assert.equal(grid.querySelector(`[data-checkpoint='${ten.key}']`),originalTen);
layoutState.levels['Future Skill']=10;
checkLayout(retainedSequence);checkLayout(retainedSequence,true);checkLayout(retainedSequence,false);
layoutWidth=280;layoutWindow.dispatchEvent(new layoutWindow.Event('resize'));checkLayout([stat,ten,origin,extra]);
layoutState.levels.Extra=30;layoutState.levels['Future Stat']=20;
checkLayout(retainedSequence);checkLayout(retainedSequence,true);
view.clear();redraw();assert.equal(grid.querySelectorAll('svg > g > path').length,0);
await layoutWindow.happyDOM.abort();

const stats=Object.keys(STAT_ICONS);
const skills=['Apotheosis','Harmony','Scroll'];
const costs=Object.fromEntries(skills.map(skill=>[skill,{freeBaseLevel:skill==='Apotheosis'?1:0,levels:Array.from({length:30},()=>({erda:2,frags:10}))}]));
const base={...currentDraft('lotus_heroic'),steps:[{skill:'Apotheosis',level:1},{skill:'Harmony',level:10},{skill:'Scroll',level:1},{skill:'Harmony',level:15},...stats.map(skill=>({skill,level:20})),{skill:'Harmony',level:30}],statIcons:STAT_ICONS,capturedCosts:costs,
  costProvenance:{capturedAt:'2026-10-01T00:00:00Z',resources:[{url:'https://maplescouter.com/test.js',sha256:'a'.repeat(64)}]}};
const pair=(job,id,orders)=>Object.fromEntries(validatePair({job,id,name:id,region:'GMS',enabled:true,orders}).map(draft=>[draft.mode,draft]));
const hy=pair('호영','infographic_pair',{heroic:base,interactive:base});
Object.assign(hy,pair('호영','other_pair',{heroic:{...base,steps:[{skill:'Scroll',level:2},{skill:'Harmony',level:30},...stats.map(skill=>({skill,level:20}))]},interactive:base}));
const evidence=JSON.parse(readFileSync(new URL('../data/scouter-ren-kms-heroic-response-2026-10-01.json',import.meta.url)));
const catalogue={...evidence.catalogue,provenance:{costs:{...evidence.catalogue.provenance.costs,capturedAt:'2026-10-01T00:00:00Z'}}};
const candidate=reconstructScouterOrder(evidence.response,catalogue,discoverySelection('GMS','Heroic'),catalogue.sourceIconOverrides);
candidate.provenance={response:{capturedAt:'2026-10-01T00:00:00Z',sha256:'b'.repeat(64)}};
const renBase=renDraftFromCapture(candidate,catalogue);
const additional=JSON.parse(readFileSync(new URL('../data/scouter-ren-additional-captures-2026-10-01.json',import.meta.url)));
for(const capture of [{region:'KMS',world:'Heroic',response:evidence.response},...additional.captures]) {
  const verified=reconstructScouterOrder(capture.response,catalogue,discoverySelection(capture.region,capture.world),catalogue.sourceIconOverrides);
  verified.provenance={response:{capturedAt:'2026-10-01T00:00:00Z',sha256:'b'.repeat(64)}};
  const draft=renDraftFromCapture(verified,catalogue);
  const model=renCatalogueFromDrafts({test:draft});
  const checkpoints=infographicCheckpoints(draft.steps,[...model.nodes,...model.stats.map(node=>({...node,isStat:true}))]);
  assert.deepEqual(checkpoints.map(entry=>[entry.skill,entry.target]),draft.steps.map(step=>[step.skill,step.level]));
  assert.equal(checkpoints.filter(entry=>entry.stat).length,3);
  assert.equal(new Set(checkpoints.map(entry=>entry.key)).size,checkpoints.length);
  // Compare the actual four verified Ren orders against the regular tracker,
  // including non-checkpoint and out-of-order player levels.
  setTrackerCatalogue(model.nodes);
  const scope=infographicContext('verified',checkpoints);
  for(let seed=0;seed<31;seed++) {
    const levels=Object.fromEntries(checkpoints.map((entry,index)=>[entry.skill,entry.stat ? (seed+index)%21 : Math.max(entry.min,(seed*7+index*11)%31)]));
    const view=infographicDisplayCheckpoints(checkpoints,{levels},scope);
    const sourcePositions=view.map(entry=>checkpoints.findIndex(source=>source.key===entry.key));
    assert.ok(sourcePositions.every((position,index)=>index===0||position>sourcePositions[index-1]),'all displayed endpoints retain source order');
    const visible=targets(checkpoints,{levels},scope);
    const tracker=displayPriorityRows(levels,'verified',draft.steps).filter(row=>!row.done).map(row=>[row.skill,row.level]);
    assert.deepEqual(visible,tracker,`${capture.region} ${capture.world}, level set ${seed}`);
  }

}
const ren=pair('렌','ren_infographic',{heroic:renBase,interactive:{...renBase,sourceMode:'ren_gms_interactive'}});
const models={hoyoung:{nodes:NODES.filter(n=>skills.includes(n.short)),stats:stats.map(short=>({short,name:short,icon:STAT_ICONS[short]}))},ren:renCatalogueFromDrafts(ren)};
const drafts={hoyoung:hy,ren};
const hyKey='hexa-tracker-hoyoung-v1',renKey='hexa-tracker-ren-v1';
let win;
const tick=()=>new Promise(resolve=>setTimeout(resolve,30));
async function boot(storage={}) {
  if(win)await win.happyDOM.abort();
  win=new Window({url:'https://test.example/'});
  Object.defineProperty(win.navigator,'locks',{value:{request:(_name,run)=>run()}});
  win.document.write(readFileSync(new URL('../index.html',import.meta.url),'utf8').replace(/<script[^>]*>[\s\S]*?<\/script>/g,''));
  for(const key of ['window','document','location','localStorage','Event'])globalThis[key]=key==='window'?win:win[key];
  globalThis.Option=function(text,value){const option=document.createElement('option');option.textContent=text;option.value=value;return option;};
  globalThis.confirm=()=>true;
  for(const [key,value] of Object.entries(storage))localStorage.setItem(key,value);
  globalThis.fetch=async url=>{
    const job=new URL(url,'https://test.example').searchParams.get('job')==='렌'?'ren':'hoyoung';
    return Response.json(url.startsWith('/api/tracker-catalogue')?models[job]:{drafts:drafts[job]});
  };
  await import('../matrix-app.js?infographic-test='+Math.random());await tick();
}
const $=selector=>document.querySelector(selector);
const buttons=()=>[...document.querySelectorAll('[data-checkpoint]')];
const button=(skill,target)=>buttons().find(b=>JSON.parse(b.dataset.checkpoint)[0]===String(models.hoyoung.nodes.find(n=>n.short===skill)?.id || skill) && JSON.parse(b.dataset.checkpoint)[1]===target);
const savedState=key=>JSON.parse(localStorage.getItem(key));
const snapshot=()=>Object.fromEntries([hyKey,renKey,'hexa-tracker-class-v1','hexa-tracker-view-v1','hexa-tracker-infographic-hide-v1'].map(key=>[key,localStorage.getItem(key)]).filter(([,value])=>value!==null));
function change(selector,value){const input=$(selector);input.value=value;input.dispatchEvent(new Event('change',{bubbles:true}));}
function hide(value){$('#infographic-hide').checked=value;$('#infographic-hide').dispatchEvent(new Event('change',{bubbles:true}));}

await boot();
assert.equal($('.workspace').dataset.view,'tracker');assert.equal($('#infographic-hide').checked,false);
assert.equal(savedState(hyKey).levels.Apotheosis,1);
$('#view-infographic').click();
assert.equal($('.workspace').dataset.view,'infographic');assert.equal($('.infographic-panel').hidden,false);
assert.equal(document.querySelectorAll('.summary-panel').length,1);
assert.equal($('.toolbar').lastElementChild.className,'view-picker');
assert.equal(button('Apotheosis',1).disabled,true);
assert.equal(button('Harmony',30).querySelector('.checkpoint-level').textContent,'MAX');
assert.equal(buttons().filter(b=>b.getAttribute('aria-label').startsWith('HEXA Stat')).length,3);
const baselineTotals=$('#totals').textContent;
$('#view-tracker').click();change('[data-node="Harmony"]',7);$('#view-infographic').click();
const inventory=savedState(hyKey).owned;
button('Harmony',10).focus();button('Harmony',10).click();assert.equal(savedState(hyKey).levels.Harmony,10);
assert.equal(document.activeElement,button('Harmony',10));
assert.equal(button('Harmony',10).classList.contains('completed'),true);assert.equal(button('Harmony',10).hidden,false);
button('Harmony',15).click();assert.equal(button('Harmony',10).disabled,true);
button('Harmony',10).click();assert.equal(savedState(hyKey).levels.Harmony,15);
await boot(snapshot());
assert.equal($('.workspace').dataset.view,'infographic');
button('Harmony',15).click();assert.equal(savedState(hyKey).levels.Harmony,10);
button('Harmony',10).click();assert.equal(savedState(hyKey).levels.Harmony,7);
assert.equal(savedState(hyKey).owned,inventory);
button('Harmony',15).click();hide(true);assert.equal(button('Harmony',15).hidden,true);
hide(false);assert.equal(button('Harmony',15).hidden,false);
button('Harmony',15).click();
const statButton=button(stats[0],20),linesBefore=savedState(hyKey).statLines[stats[0]];
statButton.click();assert.equal(savedState(hyKey).levels[stats[0]],20);assert.deepEqual(savedState(hyKey).statLines[stats[0]],linesBefore);
assert.equal($('.stat-row').hidden,true);assert.equal($('.stat-fd').textContent,'');
assert.equal(button(stats[0],20).getAttribute('aria-pressed'),'true');
const statTotals=$('#totals').textContent;assert.notEqual(statTotals,baselineTotals);
await boot(snapshot());assert.equal(savedState(hyKey).levels[stats[0]],20);
assert.equal($('.stat-fd').textContent,'');assert.equal($('.stat-row').hidden,true);
$('#view-tracker').click();assert.equal($('.stat-row').hidden,true);
assert.equal($('[data-stat="HEXA Stat I"]').getAttribute('aria-label'),'20 of 20 levels');
$('#view-infographic').click();button(stats[0],20).click();assert.equal(savedState(hyKey).levels[stats[0]],0);
assert.deepEqual(savedState(hyKey).statLines[stats[0]],linesBefore);assert.equal(savedState(hyKey).statUnlocked[stats[0]],false);
button(stats[0],20).click();$('#view-tracker').click();
const statFields=[...document.querySelectorAll('[data-stat-line="HEXA Stat I"]')];
for(const [index,value] of [6,8,6].entries()){statFields[index].value=value;statFields[index].dispatchEvent(new Event('input',{bubbles:true}));}
assert.equal(savedState(hyKey).statCompleted[stats[0]],false);assert.equal($('.stat-fd').textContent,'~3.295% FD');
$('#view-infographic').click();assert.equal(button(stats[0],20).disabled,true);
const hyBefore=structuredClone(savedState(hyKey));
change('#class','ren');await tick();
assert.equal(document.documentElement.dataset.class,'ren');assert.equal($('.workspace').dataset.view,'infographic');
assert.equal(savedState(renKey).levels.ren_skillCore1,1);assert.ok(buttons().length>100);
const renButton=buttons().find(b=>!b.disabled);renButton.click();
const renProgress=structuredClone(savedState(renKey));
change('#class','hoyoung');await tick();assert.deepEqual(savedState(hyKey).levels,hyBefore.levels);
change('#class','ren');await tick();assert.deepEqual(savedState(renKey).levels,renProgress.levels);
change('#class','hoyoung');await tick();
button('Harmony',10).click();$('#view-tracker').click();change('[data-node="Harmony"]',12);$('#view-infographic').click();
assert.equal(button('Harmony',10).disabled,true);
button('Harmony',15).click();change('#patch','other_pair');assert.equal(!!button('Harmony',15),false);
change('#patch','infographic_pair');button('Harmony',15).click();assert.equal(savedState(hyKey).levels.Harmony,12);
$('[name="world"][value="heroic"]').checked=false;change('[name="world"][value="interactive"]','interactive');$('[name="world"][value="interactive"]').checked=true;$('[name="world"][value="interactive"]').dispatchEvent(new Event('change',{bubbles:true}));
assert.match(savedState(hyKey).mode,/interactive$/);assert.equal(savedState(hyKey).levels.Harmony,12);
hide(true);await boot(snapshot());assert.equal($('#infographic-hide').checked,true);
$('#reset').click();await tick();assert.equal(savedState(hyKey).levels.Apotheosis,1);assert.equal(savedState(hyKey).levels.Harmony,0);
assert.equal($('.workspace').dataset.view,'infographic');assert.equal($('#infographic-hide').checked,true);
assert.deepEqual(savedState(renKey).levels,renProgress.levels);
// Actual app render/click/reload flow after non-checkpoint Tracker input.
hide(false);$('#view-tracker').click();
change('[data-node="Harmony"]',7);change('[data-node="Scroll"]',1);$('#view-infographic').click();
assert.equal(!!button('Harmony',10),false);
assert.equal(button('Harmony',15).getAttribute('aria-current'),'step');
button('Harmony',15).focus();button('Harmony',15).click();
assert.equal(savedState(hyKey).levels.Harmony,15);
assert.equal(document.activeElement,button('Harmony',15));
for(const skill of stats)button(skill,20).click();
button('Harmony',30).click();assert.equal(button('Harmony',15).disabled,true);
await boot(snapshot());
assert.equal(savedState(hyKey).levels.Harmony,30);
button('Harmony',30).click();assert.equal(savedState(hyKey).levels.Harmony,15);
button('Harmony',15).focus();button('Harmony',15).click();assert.equal(savedState(hyKey).levels.Harmony,7);
assert.equal(!!button('Harmony',15),false);assert.equal(!!button('Harmony',10),false);
assert.equal(document.activeElement,button('Harmony',30));
assert.equal(button('Harmony',30).getAttribute('aria-current'),'step');
hide(true);assert.equal(button('Harmony',30).hidden,false);
$('#view-tracker').click();change('[data-node="Harmony"]',28);$('#view-infographic').click();
assert.equal(button('Harmony',30).hidden,false);assert.equal(button('Harmony',30).disabled,false);
const weirdProgress=savedState(hyKey).levels.Harmony;
change('#class','ren');await tick();change('#class','hoyoung');await tick();
assert.equal(savedState(hyKey).levels.Harmony,weirdProgress);
assert.equal(button('Harmony',30).getAttribute('aria-current'),'step');
assert.equal(buttons().at(-1).dataset.checkpoint,button('Harmony',30).dataset.checkpoint);
// Narrow-width geometry checks cover row return routes and reflow counts. Happy
// DOM has no rendering engine, so phone touch/readability remains owner review.
for(const width of [240,280,390,640,1000]){
  const columns=Math.floor((width-36+18)/(56+18));assert.ok(columns>=2);
  const rects=Array.from({length:9},(_,i)=>({x:18+(i%columns)*74,y:10+Math.floor(i/columns)*84,width:56,height:64}));
  const routes=connectorPaths(rects,width);
  assert.equal(routes.length,8);
  assert.ok(routes.every(d=>!d.includes('NaN')));
  assert.ok(routes.filter(d=>d.includes(' V ')).every(d=>d.includes(' H 5 V ')));
}
const css=readFileSync(new URL('../infographic.css',import.meta.url),'utf8');
assert.match(css,/grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
assert.match(css,/@media\(max-width:780px\)/);assert.match(css,/pointer-events:none/);
assert.equal(document.querySelectorAll('.infographic-connectors').length,1);
const style=document.createElement('style');style.textContent=css;document.head.append(style);
assert.equal(window.getComputedStyle($('.matrix-panel')).display,'none');
assert.equal(window.getComputedStyle($('.results')).display,'none');
assert.equal(window.getComputedStyle($('.quickstats')).display,'none');
assert.equal(window.getComputedStyle($('.inputs')).display,'contents');
assert.equal(window.getComputedStyle($('.workspace')).display,'block');
assert.equal(window.getComputedStyle(buttons()[0]).borderTopWidth,'0px');
assert.equal(window.getComputedStyle(buttons()[0]).backgroundColor,'transparent');
assert.equal(window.getComputedStyle($('.infographic-grid')).rowGap,'20px');
const broken=buttons().find(tile=>!tile.hidden).querySelector('img');broken.dispatchEvent(new Event('error'));
assert.equal(broken.hidden,true);assert.equal(broken.previousElementSibling.hidden,false);

await win.happyDOM.abort();
console.log('Infographic progress, undo, Stat, persistence, class, layout and connector checks pass');
