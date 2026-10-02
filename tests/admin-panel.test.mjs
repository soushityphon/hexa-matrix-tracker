import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import worker from '../worker.js';
import { currentDraft } from '../priority-draft.js';
import { NODES } from '../data.js';
import { mergeSkills, validateSkills, applySkills, validatePair, priorityGroups, orderMatches } from '../admin-panel-model.js';
const sqlite = new DatabaseSync(':memory:');
for(const file of ['0000_priority_preview.sql','0001_admin_skills.sql']) sqlite.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
const DB = {prepare(sql){let values=[];return {bind(...args){values=args;return this;},async all(){return {results:sqlite.prepare(sql).all(...values)};},async first(){return sqlite.prepare(sql).get(...values)||null;},async run(){return {meta:{changes:Number(sqlite.prepare(sql).run(...values).changes)}};}};},async batch(statements){sqlite.exec('BEGIN');try{for(const statement of statements)await statement.run();sqlite.exec('COMMIT');}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
const env={DB,ADMIN_EMAIL:'owner@example.test'}, headers={'oai-authenticated-user-email':'owner@example.test','Content-Type':'application/json'};
const call=(method,value,owner=true)=>worker.fetch(new Request('https://test.example/api/admin-panel',{method,headers:owner?headers:{},...(value===undefined?{}:{body:JSON.stringify(value)})}),env);
const readSkills=async(job='호영')=>(await worker.fetch(new Request('https://test.example/api/admin-panel?job='+encodeURIComponent(job),{headers}),env)).json();
const saveSkills=async review=>call('PUT',{...review,skillsRevision:(await readSkills(review.job)).skillsRevision});
const changePriority=async(method,value)=>call(method,{...value,priorityRevision:(await readSkills()).priorityRevisions[value.id]});
const heroic=currentDraft('taotie_heroic'),interactive=currentDraft('taotie_interactive');
await DB.prepare('INSERT INTO priority_preview VALUES (?, ?, ?)').bind(heroic.mode,JSON.stringify(heroic),'old-date').run();
const original=sqlite.prepare('SELECT * FROM priority_preview').all();
for(const method of ['GET','POST','PUT','PATCH','DELETE']) assert.equal((await call(method,method==='GET'?undefined:{},false)).status,403);
const pair={id:'pair_test',name:'Ride or Die',region:'KMS',enabled:false,orders:{heroic,interactive}};
assert.equal((await call('POST',{...pair,orders:{heroic,interactive:{...interactive,steps:[]}}})).status,400);
assert.deepEqual(sqlite.prepare('SELECT * FROM priority_preview').all(),original);
assert.equal((await call('POST',{...pair,enabled:true})).status,400);
assert.equal((await call('POST',pair)).status,200);
let state=await (await call('GET')).json();
assert.equal(Object.keys(state.drafts).length,3);assert.equal(priorityGroups(state.drafts).length,2);
assert.equal(state.drafts.pair_test_heroic.name,'Ride or Die | Heroic');
assert.equal(state.drafts.pair_test_interactive.name,'Ride or Die | Interactive');
assert.deepEqual(state.drafts.pair_test_heroic.steps,heroic.steps);
assert.equal((await call('POST',pair)).status,400);
assert.equal((await changePriority('PATCH',{id:'pair_test',name:'New Name',enabled:false})).status,200);
state=await (await call('GET')).json();
assert(state.drafts.pair_test_heroic.name.startsWith('New Name'));
assert.equal(state.drafts.pair_test_interactive.enabled,false);
assert.deepEqual(state.drafts.pair_test_interactive.steps,interactive.steps);
assert(orderMatches(heroic.steps,'heroic',state.drafts).length===2);
const source={coreId:'masteryCore1',sourceName:'Source Harmony',icon:NODES.find(n=>n.short==='Harmony').icon};
let rows=mergeSkills({skills:[source]},[],state.drafts);assert.equal(rows[0].name,'Universal Harmony');
rows[0].name='Long edited name';rows[0].shortName='Short edited';rows[0].tag='M1';rows[0].category='Mastery';
rows=mergeSkills({skills:[source,{coreId:'skillCore99',sourceName:'New source',icon:'https://maplescouter.com/hexaskill/new.png'}]},rows,state.drafts);
assert.equal(rows[0].name,'Long edited name');assert.equal(rows[1].name,'');assert.equal(rows[1].category,'');
const newDefaults=mergeSkills({skills:Object.entries({Apotheosis:'skillCore1',Ascent:'skillCore2',Harmony:'masteryCore1',Basics:'masteryCore2',Talisman:'masteryCore3',Scroll:'masteryCore4'}).map(([short,coreId])=>({coreId,sourceName:short,icon:NODES.find(node=>node.short===short).icon}))});
assert.deepEqual(newDefaults.map(row=>row.tag),['Origin','Ascent','M1','M2','M3','M4']);
newDefaults[2].tag='';
const refreshed=mergeSkills({skills:newDefaults.map(row=>row.source)},newDefaults);
assert.equal(refreshed[2].tag,'');
const review=validateSkills({job:'호영',rows});
assert.equal((await saveSkills(review)).status,200);
const publicState=await (await worker.fetch(new Request('https://test.example/api/priority-preview'),env)).json();
assert.equal(publicState.drafts.pair_test_heroic.names.Harmony,'Long edited name');assert.equal(publicState.drafts.pair_test_heroic.tags.Harmony,'M1');
assert.deepEqual(publicState.drafts.pair_test_heroic.steps,heroic.steps);
assert.equal(sqlite.prepare('SELECT draft_json FROM priority_preview WHERE mode = ?').get(heroic.mode).draft_json,original[0].draft_json);
assert.equal((await call('PUT',{...review,rows:[...rows,rows[0]]})).status,400);
assert.throws(()=>validateSkills({...review,rows:[{...rows[0],category:'HEXA Stat'}]}));
const differing={...heroic,names:{...heroic.names,Harmony:'Different name'}};
const conflicts=mergeSkills({skills:[source]},[],{a:heroic,b:differing});assert.equal(conflicts[0].name,'');assert.equal(conflicts[0].conflicts.length,2);
assert.equal((await changePriority('DELETE',{id:'pair_test'})).status,200);
assert.deepEqual(sqlite.prepare('SELECT * FROM priority_preview').all(),original);
console.log('Admin skills, exact pair preservation, backup validation and atomic routes passed');

const catalogueRequest=()=>worker.fetch(new Request('https://test.example/api/tracker-catalogue'),env);
let catalogue=await (await catalogueRequest()).json();assert.equal(catalogue.nodes.length,0);assert.equal(catalogue.pending,2);
const costs={freeBaseLevel:0,levels:Array.from({length:30},(_,i)=>({level:i+1,erda:1,frags:10}))};
const complete=validateSkills({job:'호영',rows:[{...rows[0],source:{...rows[0].source,costs}}]});
assert.equal((await saveSkills(complete)).status,200);
catalogue=await (await catalogueRequest()).json();assert.equal(catalogue.nodes.length,1);assert.equal(catalogue.nodes[0].name,'Long edited name');assert.equal(catalogue.nodes[0].tag,'M1');assert.equal(catalogue.stats.length,0);
const maintenance=(method,body,token)=>worker.fetch(new Request('https://test.example/api/admin-maintenance',{method,headers:token?{Authorization:'Bearer '+token}:{},...(body?{body:JSON.stringify(body)}:{})}),{...env,ADMIN_MAINTENANCE_TOKEN:'x'.repeat(32)});
assert.equal((await maintenance('GET')).status,403);
const backup=await (await maintenance('GET',null,'x'.repeat(32))).json();assert.equal(backup.priorities.length,1);assert.equal(backup.skills.length,1);
assert.equal((await maintenance('POST',{confirm:'clear-backed-up-priorities',priorities:[]},'x'.repeat(32))).status,409);
assert.equal((await maintenance('POST',{confirm:'clear-backed-up-priorities',priorities:backup.priorities},'x'.repeat(32))).status,200);
assert.equal(sqlite.prepare('SELECT count(*) AS n FROM priority_preview').get().n,0);
assert.equal(sqlite.prepare('SELECT count(*) AS n FROM admin_skills').get().n,1);
console.log('Admin catalogue authority and backup-before-reset protection passed');
assert.equal((await call('POST',{restoreSnapshot:backup})).status,400);
assert.equal(sqlite.prepare('SELECT count(*) AS n FROM priority_preview').get().n,0);
sqlite.exec('DELETE FROM admin_skills');
assert.equal((await call('POST',{restoreSnapshot:backup})).status,200);
assert.equal(sqlite.prepare('SELECT count(*) AS n FROM priority_preview').get().n,1);
assert.equal(JSON.parse(sqlite.prepare('SELECT draft_json FROM priority_preview').get().draft_json).enabled,false);
assert.equal((await call('POST',{restoreSnapshot:backup})).status,400);
console.log('Complete snapshot restoration, collision refusal and unavailable-by-default restoration passed');

const beforeClear=await (await call('GET')).json();
const cleared=structuredClone(beforeClear.skills);cleared.rows[0].tag='';
assert.equal((await saveSkills(cleared)).status,200);
const afterClear=await (await call('GET')).json();assert.equal(afterClear.skills.rows[0].tag,'');
assert.equal((await (await catalogueRequest()).json()).nodes[0].tag,'');
const afterClearPublic=await (await worker.fetch(new Request('https://test.example/api/priority-preview'),env)).json();
assert.equal(Object.values(afterClearPublic.drafts)[0].tags.Harmony,'');
console.log('Default tags appear in admin fields; clearing survives refresh, save and public catalogue');

const snapshotCosts={Harmony:{freeBaseLevel:0,levels:Array.from({length:30},(_,i)=>({erda:i+2,frags:(i+1)**2+10}))}};
const costProvenance={capturedAt:'2026-10-01T00:00:00Z',resources:[{url:'https://maplescouter.com/test.js',sha256:'b'.repeat(64)}]};
const capturedOrder={...currentDraft('lotus_heroic'),capturedCosts:snapshotCosts,costProvenance,steps:[{skill:'Harmony',level:2,sourceCost:{from:0,erda:5,frags:25},fdFrom:0,fdGain:1.25}]};
const capturedPair={id:'pair_capture',name:'Captured',region:'GMS',enabled:false,orders:{heroic:capturedOrder,interactive:capturedOrder}};
assert.equal((await call('POST',capturedPair)).status,200);
assert.equal((await changePriority('PATCH',{id:'pair_capture',name:'Renamed'})).status,200);
const storedCapture=(await (await call('GET')).json()).drafts.pair_capture_heroic;
assert.deepEqual(storedCapture.capturedCosts,snapshotCosts);
assert.deepEqual(storedCapture.costProvenance,costProvenance);
assert.deepEqual(storedCapture.steps,capturedOrder.steps);
assert.equal((await call('POST',{...capturedPair,id:'pair_bad_capture',orders:{...capturedPair.orders,heroic:{...capturedOrder,steps:[{...capturedOrder.steps[0],sourceCost:{from:0,erda:5,frags:24}}]}}})).status,400);
assert.equal(sqlite.prepare('SELECT count(*) AS n FROM priority_preview WHERE mode LIKE ?').get('pair_bad_capture%').n,0);
console.log('D1 pair save and rename preserve exact captured schedules/FD; schedule mismatch rolls back');

const hoyoungBefore=sqlite.prepare('SELECT review_json FROM admin_skills WHERE job = ?').get('호영').review_json;
const prioritiesBefore=sqlite.prepare('SELECT * FROM priority_preview ORDER BY mode').all();
const renReview={job:'렌',rows:[{coreId:'skillCore1',source:{coreId:'skillCore1',sourceName:'Synthetic Ren source',icon:'https://maplescouter.com/hexaskill/Len_1.png'},name:'Reviewed Ren',shortName:'Ren Origin',category:'Skill',tag:'Origin'}]};
assert.equal((await saveSkills(renReview)).status,200);
const renState=await (await worker.fetch(new Request('https://test.example/api/admin-panel?job='+encodeURIComponent('렌'),{headers}),env)).json();
assert.equal(renState.skills.job,'렌');assert.deepEqual(renState.drafts,{});
assert.equal(sqlite.prepare('SELECT review_json FROM admin_skills WHERE job = ?').get('호영').review_json,hoyoungBefore);
assert.deepEqual(sqlite.prepare('SELECT * FROM priority_preview ORDER BY mode').all(),prioritiesBefore);
assert.equal((await (await call('GET')).json()).skills.job,'호영');
console.log('Ren skill reviews and class tabs retain separate D1 records without changing Hoyoung priorities');

// Two tabs must carry the revision associated with their loaded rows.
const stale=await readSkills();
const edited=structuredClone(stale.skills);edited.rows[0].name='Newest saved name';
const missing=await call('PUT',edited);assert.equal(missing.status,428);assert.equal(missing.headers.get('Cache-Control'),'no-store');
assert.equal((await call('PUT',{...edited,skillsRevision:renState.skillsRevision})).status,409);
const saved=await call('PUT',{...edited,skillsRevision:stale.skillsRevision});assert.equal(saved.status,200);
const savedRevision=(await saved.json()).skillsRevision;
assert.notEqual(savedRevision,stale.skillsRevision);assert.equal((await readSkills()).skillsRevision,savedRevision);
const newerRaw=sqlite.prepare('SELECT * FROM admin_skills ORDER BY job').all();
const rejected=await call('PUT',{...stale.skills,skillsRevision:stale.skillsRevision});
assert.equal(rejected.status,409);assert.equal(rejected.headers.get('Cache-Control'),'no-store');
assert.deepEqual(sqlite.prepare('SELECT * FROM admin_skills ORDER BY job').all(),newerRaw);
assert.deepEqual(sqlite.prepare('SELECT * FROM priority_preview ORDER BY mode').all(),prioritiesBefore);
// Identical saves also advance the revision, including within one millisecond.
assert.equal((await call('PUT',{...edited,skillsRevision:savedRevision})).status,200);
assert.notEqual((await readSkills()).skillsRevision,savedRevision);

// Inject a peer edit after the read, before the atomic SQL write.
const raceRevision=(await readSkills()).skillsRevision;
let raced=false;
const raceDB={...DB,prepare(sql){const statement=DB.prepare(sql);const run=statement.run;
  statement.run=async()=>{if(!raced && sql.startsWith('UPDATE admin_skills')){raced=true;sqlite.prepare('UPDATE admin_skills SET updated_at = ? WHERE job = ?').run('peer-update','호영');}return run();};return statement;}};
const raceResponse=await worker.fetch(new Request('https://test.example/api/admin-panel',{method:'PUT',headers,body:JSON.stringify({...edited,skillsRevision:raceRevision})}),{...env,DB:raceDB});
assert.equal(raceResponse.status,409);assert.equal(sqlite.prepare('SELECT updated_at FROM admin_skills WHERE job = ?').get('호영').updated_at,'peer-update');

// A missing row revision cannot overwrite a peer's first insert.
sqlite.prepare('DELETE FROM admin_skills WHERE job = ?').run('렌');
const emptyRevision=(await readSkills('렌')).skillsRevision;
let inserted=false;
const insertRaceDB={...DB,prepare(sql){const statement=DB.prepare(sql);const run=statement.run;
  statement.run=async()=>{if(!inserted && sql.startsWith('INSERT INTO admin_skills')){inserted=true;sqlite.prepare('INSERT INTO admin_skills VALUES (?, ?, ?)').run('렌',JSON.stringify(renReview),'peer-insert');}return run();};return statement;}};
assert.equal((await worker.fetch(new Request('https://test.example/api/admin-panel',{method:'PUT',headers,body:JSON.stringify({...renReview,skillsRevision:emptyRevision})}),{...env,DB:insertRaceDB})).status,409);
assert.equal(sqlite.prepare('SELECT updated_at FROM admin_skills WHERE job = ?').get('렌').updated_at,'peer-insert');
console.log('Skills revisions reject missing, stale, wrong-class and interleaved update/insert writes without data loss');

const revisionPair={...capturedPair,id:'pair_revision',name:'Revision original'};
assert.equal((await call('POST',revisionPair)).status,200);
const firstPriority=await readSkills(), oldRevision=firstPriority.priorityRevisions.pair_revision;
assert.match(oldRevision,/^[a-f0-9]{64}$/);
assert.equal((await call('PATCH',{id:'pair_revision',name:'Missing token'})).status,428);
assert.equal((await call('DELETE',{id:'pair_revision'})).status,428);
assert.equal((await call('PATCH',{id:'pair_revision',name:'Wrong group',priorityRevision:firstPriority.priorityRevisions.pair_capture})).status,409);
// Changing an unrelated priority leaves this group's revision usable.
assert.equal((await changePriority('PATCH',{id:'pair_capture',name:'Unrelated edit'})).status,200);
assert.equal((await call('PATCH',{id:'pair_revision',name:'Latest name',enabled:false,priorityRevision:oldRevision})).status,200);
const latestPriority=await readSkills();assert.notEqual(latestPriority.priorityRevisions.pair_revision,oldRevision);
for(const mode of ['pair_revision_heroic','pair_revision_interactive']) {
  const draft=latestPriority.drafts[mode];assert.equal(draft.pairName,'Latest name');assert.equal(draft.enabled,false);
  assert.deepEqual(draft.steps,capturedOrder.steps);assert.deepEqual(draft.capturedCosts,snapshotCosts);assert.deepEqual(draft.costProvenance,costProvenance);
}
const allBeforeStale=sqlite.prepare('SELECT * FROM priority_preview ORDER BY mode').all();
for(const method of ['PATCH','DELETE']) {
  const response=await call(method,{id:'pair_revision',name:'Stale name',enabled:true,priorityRevision:oldRevision});
  assert.equal(response.status,409);assert.equal(response.headers.get('Cache-Control'),'no-store');
  assert.deepEqual(sqlite.prepare('SELECT * FROM priority_preview ORDER BY mode').all(),allBeforeStale);
}
const priorityRequest=(method,value,DB)=>worker.fetch(new Request('https://test.example/api/admin-panel',{method,headers,body:JSON.stringify(value)}),{...env,DB});
const interleaveDB=(prefix,peer)=>({...DB,prepare(sql){const statement=DB.prepare(sql),run=statement.run;statement.run=async()=>{if(sql.startsWith(prefix))peer();return run();};return statement;}});
for(const method of ['PATCH','DELETE']) {
  const before=await readSkills();let peerSnapshot;
  const peerDB=interleaveDB(method==='PATCH'?'UPDATE priority_preview':'DELETE FROM priority_preview',()=>{
    sqlite.prepare('UPDATE priority_preview SET updated_at = ? WHERE mode = ?').run('peer-'+method,'pair_revision_interactive');
    peerSnapshot=sqlite.prepare('SELECT * FROM priority_preview ORDER BY mode').all();
  });
  assert.equal((await priorityRequest(method,{id:'pair_revision',name:'Race name',priorityRevision:before.priorityRevisions.pair_revision},peerDB)).status,409);
  assert.deepEqual(sqlite.prepare('SELECT * FROM priority_preview ORDER BY mode').all(),peerSnapshot);
}
// Membership changes after the read must leave all remaining/new rows intact.
const beforeAddition=await readSkills();let additionSnapshot;
const extra={...beforeAddition.drafts.pair_revision_heroic,mode:'pair_revision_extra'};
const addedDB=interleaveDB('UPDATE priority_preview',()=>{
  sqlite.prepare('INSERT INTO priority_preview VALUES (?, ?, ?)').run(extra.mode,JSON.stringify(extra),'peer-addition');
  additionSnapshot=sqlite.prepare('SELECT * FROM priority_preview ORDER BY mode').all();
});
assert.equal((await priorityRequest('PATCH',{id:'pair_revision',enabled:true,priorityRevision:beforeAddition.priorityRevisions.pair_revision},addedDB)).status,409);
assert.deepEqual(sqlite.prepare('SELECT * FROM priority_preview ORDER BY mode').all(),additionSnapshot);
sqlite.prepare('DELETE FROM priority_preview WHERE mode = ?').run(extra.mode);
const beforeRemoval=await readSkills();let removalSnapshot;
const removedDB=interleaveDB('DELETE FROM priority_preview',()=>{
  sqlite.prepare('DELETE FROM priority_preview WHERE mode = ?').run('pair_revision_interactive');
  removalSnapshot=sqlite.prepare('SELECT * FROM priority_preview ORDER BY mode').all();
});
assert.equal((await priorityRequest('DELETE',{id:'pair_revision',priorityRevision:beforeRemoval.priorityRevisions.pair_revision},removedDB)).status,409);
assert.deepEqual(sqlite.prepare('SELECT * FROM priority_preview ORDER BY mode').all(),removalSnapshot);
assert.equal((await changePriority('DELETE',{id:'pair_revision'})).status,200);
assert.equal((await call('PATCH',{id:'pair_revision',enabled:true,priorityRevision:beforeRemoval.priorityRevisions.pair_revision})).status,409);
assert.equal(sqlite.prepare('SELECT count(*) AS n FROM priority_preview WHERE mode LIKE ?').get('pair_revision%').n,0);
// A collision on the second inserted variant rolls back the first variant too.
const newPair={...capturedPair,id:'pair_insert_race'};
const peerDraft=validatePair(newPair)[1];
const insertedPriorityDB=interleaveDB('INSERT INTO priority_preview',()=>sqlite.prepare('INSERT INTO priority_preview VALUES (?, ?, ?)').run(peerDraft.mode,JSON.stringify(peerDraft),'peer-insert'));
assert.equal((await priorityRequest('POST',newPair,insertedPriorityDB)).status,409);
assert.equal(sqlite.prepare('SELECT * FROM priority_preview WHERE mode = ?').get('pair_insert_race_heroic'),undefined);
assert.equal(sqlite.prepare('SELECT updated_at FROM priority_preview WHERE mode = ?').get(peerDraft.mode).updated_at,'peer-insert');
console.log('Priority revisions protect whole groups against stale edits/deletes, interleaved row/membership changes and pair insert collisions');
