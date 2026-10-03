import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from '../worker.js';
import { currentDraft } from '../priority-draft.js';

const url = 'https://preview.example/api/hexa-order';
const dirtyHexa = { character_class: '호영', hexaStat: 2, hexaStat_opened: true, skillCore1: '12', skillCore2: '5', masteryCore1: '4', reinCore1: '3', generalCore1: '2', hexaSkill: { skillCore1: 12, skillCore2: 5, masteryCore1: 4, reinCore1: 3 }, hexaSkill_general: { generalCore1: 2 } };
const payload = { myHexa: structuredClone(dirtyHexa), userStat: { stat: { myClass: '호영' }, isGMS: true, hexa: structuredClone(dirtyHexa) }, sole: false };
const request = mode => new Request(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'oai-authenticated-user-email':'owner@example.test' }, body: JSON.stringify({ mode }) });
const template = JSON.stringify(payload);
const env = { ADMIN_EMAIL:'owner@example.test', MAPLE_SCOUTER_API_KEY: 'test-key', MAPLE_SCOUTER_REQUEST_PART_1: template.slice(0, 30), MAPLE_SCOUTER_REQUEST_PART_2: template.slice(30) };
const kmsPayload = { ...payload, userStat: { ...payload.userStat, isGMS: false, hexa: structuredClone(dirtyHexa) }, myHexa: structuredClone(dirtyHexa) };
const kmsTemplate = JSON.stringify(kmsPayload);
const kmsEnv = { ...env, MAPLE_SCOUTER_KMS_REQUEST_PART_1: kmsTemplate.slice(0, 40), MAPLE_SCOUTER_KMS_REQUEST_PART_2: kmsTemplate.slice(40) };

assert.equal((await worker.fetch(request('lotus_heroic'), {})).status, 403);
assert.equal((await worker.fetch(new Request(url,{method:'POST',body:JSON.stringify({mode:'lotus_heroic'})}),env)).status,403);
assert.equal((await worker.fetch(request('taotie_heroic'), env)).status, 503);
for (const mode of ['lotus_heroic', 'taotie_interactive']) {
  const base = mode.startsWith('lotus_') ? payload : kmsPayload;
  const broken = [
    { ...base, myHexa: { ...base.myHexa, hexaSkill: undefined } },
    { ...base, userStat: { ...base.userStat, hexa: { ...base.userStat.hexa, skillCore1: undefined } } },
    { ...base, userStat: { ...base.userStat, hexa: { ...base.userStat.hexa, hexaStat_opened: undefined } } },
    { ...base, myHexa: { ...base.myHexa, hexaSkill_general: { generalCore1: 'broken' } } }
  ];
  for (const bad of broken) {
    const raw = JSON.stringify(bad);
    const prefix = mode.startsWith('lotus_') ? 'MAPLE_SCOUTER_REQUEST_PART_' : 'MAPLE_SCOUTER_KMS_REQUEST_PART_';
    const result = await worker.fetch(request(mode), { ...kmsEnv, [prefix + '1']: raw.slice(0, 40), [prefix + '2']: raw.slice(40) });
    assert.equal(result.status, 503);
    assert.match(await result.text(), /cannot be reset/);
  }
}
const invalidTemplate = JSON.stringify({ ...payload, userStat: { ...payload.userStat, isGMS: false } });
assert.equal((await worker.fetch(request('lotus_heroic'), { ...env, MAPLE_SCOUTER_REQUEST_PART_1: invalidTemplate.slice(0, 30), MAPLE_SCOUTER_REQUEST_PART_2: invalidTemplate.slice(30) })).status, 503);
assert.equal((await worker.fetch(new Request(url, { method: 'GET', headers:{'oai-authenticated-user-email':'owner@example.test'} }), env)).status, 405);

const originalFetch = globalThis.fetch;
try {
  const requestedModes = [];
  globalThis.fetch = async (target, options) => {
    assert.match(target, /^https:\/\/api\.maplescouter\.com\/api\/calc\/hexa-order/);
    assert.equal(options.headers['api-key'], env.MAPLE_SCOUTER_API_KEY);
    assert.equal(options.headers.Origin, 'https://maplescouter.com');
    const sent = JSON.parse(options.body);
    for (const hexa of [sent.myHexa, sent.userStat.hexa]) {
      assert.equal(hexa.hexaStat, 0);
      assert.equal(hexa.hexaStat_opened, false);
      for (const [key, value] of Object.entries(hexa)) if (/^(skillCore|masteryCore|reinCore|generalCore)\d+$/.test(key)) assert.equal(value, key === 'skillCore1' ? '1' : '0');
      for (const group of [hexa.hexaSkill, hexa.hexaSkill_general]) for (const [key, value] of Object.entries(group)) assert.equal(value, key === 'skillCore1' ? 1 : 0);
    }
    requestedModes.push(sent.sole);
    return Response.json({ class_hexa: [['sample']] });
  };
  const result = await worker.fetch(request('lotus_heroic'), env);
  assert.equal(result.status, 200);
  assert.equal(result.headers.get('Cache-Control'), 'no-store');
  assert.equal((await result.json()).class_hexa.length, 1);
  assert.equal((await worker.fetch(request('lotus_interactive'), env)).status, 200);
  assert.equal((await worker.fetch(request('taotie_heroic'), kmsEnv)).status, 200);
  assert.equal((await worker.fetch(request('taotie_interactive'), kmsEnv)).status, 200);
  assert.deepEqual(requestedModes, [false, true, false, true]);

  globalThis.fetch = async () => Response.json({ class_hexa: [] });
  assert.equal((await worker.fetch(request('lotus_heroic'), env)).status, 502);
  globalThis.fetch = async () => new Response('limited', { status: 429 });
  assert.match(await (await worker.fetch(request('lotus_heroic'), env)).text(), /Wait a few minutes/);
  globalThis.fetch = async () => { throw new Error('network unavailable'); };
  assert.equal((await worker.fetch(request('lotus_heroic'), env)).status, 502);
} finally { globalThis.fetch = originalFetch; }


const sqlite=new DatabaseSync(':memory:');
for(const file of ['0000_priority_preview.sql','0001_admin_skills.sql'])sqlite.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
const DB={prepare(sql){
  let values=[];
  return {
    bind(...args){values=args;return this;},
    async first(){return sqlite.prepare(sql).get(...values)||null;},
    async all(){return {results:sqlite.prepare(sql).all(...values)};},
    async run(){return {meta:{changes:Number(sqlite.prepare(sql).run(...values).changes)}};}
  };
}};

const previewUrl = 'https://preview.example/api/priority-preview';
const adminEnv = { DB, ADMIN_EMAIL: 'owner@example.test' };
const adminHeaders = { 'Content-Type': 'application/json', 'oai-authenticated-user-email': 'owner@example.test' };
const previewRequest = (method, body, headers = adminHeaders) => new Request(previewUrl, { method, headers, body: JSON.stringify(body) });
const readRecord=async mode=>(await worker.fetch(new Request(previewUrl+'?record='+encodeURIComponent(mode),{headers:adminHeaders}),adminEnv)).json();
const writeRecord=async(method,value,headers=adminHeaders)=>worker.fetch(previewRequest(method,{...value,revision:(await readRecord(value.draft?.mode || value.mode)).revision},headers),adminEnv);
assert.equal((await worker.fetch(new Request(previewUrl), {})).status, 503);
assert.deepEqual((await (await worker.fetch(new Request(previewUrl), adminEnv)).json()).drafts, {});
assert.equal((await worker.fetch(previewRequest('PUT', { draft: currentDraft('lotus_heroic') }, { 'Content-Type': 'application/json' }), adminEnv)).status, 403);
const hidden = { ...currentDraft('lotus_heroic'), enabled: false };
assert.equal((await writeRecord('PUT',{draft:hidden})).status, 200);
const named = { ...hidden, names: { ...hidden.names, Harmony: 'Long Harmony' }, shortNames: { ...hidden.shortNames, Harmony: 'Short Harmony' } };
assert.equal((await writeRecord('PUT',{draft:named})).status, 200);
const loadedNames = (await (await worker.fetch(new Request(previewUrl), adminEnv)).json()).drafts.lotus_heroic;
assert.equal(loadedNames.names.Harmony, 'Long Harmony');
assert.equal(loadedNames.shortNames.Harmony, 'Short Harmony');
assert.equal(loadedNames.steps[0].skill, 'Harmony');
assert.equal((await worker.fetch(previewRequest('PUT', { draft: { ...hidden, steps: [] } }), adminEnv)).status, 400);
assert.equal((await (await worker.fetch(new Request(previewUrl), adminEnv)).json()).drafts.lotus_heroic.enabled, false);
const newOrder = { ...currentDraft('lotus_interactive'), mode: 'lotus_interactive_20260929', sourceMode: 'lotus_interactive', isNew: true, name: 'Imported order', enabled: true, steps: [{ skill: 'Harmony', level: 1, sourceCost: { from: 0, erda: 3, frags: 50 } }] };
assert.equal((await writeRecord('PUT',{draft:newOrder})).status, 200);
assert.equal((await (await worker.fetch(new Request(previewUrl), adminEnv)).json()).drafts[newOrder.mode].steps.length, 1);
assert.deepEqual((await (await worker.fetch(new Request(previewUrl), adminEnv)).json()).drafts[newOrder.mode].steps[0].sourceCost, { from: 0, erda: 3, frags: 50 });
const unknownOrder = { ...newOrder, newNodes: [{ short: 'New', name: 'New', type: 'Skill', icon: 'https://maplescouter.com/hexaskill/New.png' }], steps: [{ skill: 'New', level: 1 }] };
assert.equal((await worker.fetch(previewRequest('PUT', { draft: unknownOrder }), adminEnv)).status, 400);
assert.equal((await worker.fetch(previewRequest('DELETE', { mode: newOrder.mode }, { 'Content-Type': 'application/json' }), adminEnv)).status, 403);
assert.equal((await writeRecord('DELETE',{mode:newOrder.mode})).status, 200);
assert.equal((await (await worker.fetch(new Request(previewUrl), adminEnv)).json()).drafts[newOrder.mode], undefined);
const signInPage = await worker.fetch(new Request('https://preview.example/priority-review.html'), adminEnv);
assert.equal(signInPage.status, 200);
assert.match(await signInPage.text(), /href="\/signin-with-chatgpt\?return_to=%2Fpriority-review\.html"/);
assert.equal(signInPage.headers.get('Cache-Control'), 'no-store');
assert.equal((await worker.fetch(previewRequest('PUT', { draft: hidden }, { ...adminHeaders, 'oai-authenticated-user-email': 'other@example.test' }), adminEnv)).status, 403);
assert.equal((await writeRecord('PUT',{draft:hidden},{...adminHeaders,'oai-authenticated-user-email':'OWNER@example.test'})).status, 200);

assert.equal((await worker.fetch(new Request(previewUrl+'?record=lotus_heroic'),adminEnv)).status,403);
assert.equal((await worker.fetch(new Request(previewUrl+'?record=invalid%20id',{headers:adminHeaders}),adminEnv)).status,400);
assert.equal((await worker.fetch(previewRequest('PUT',{draft:hidden}),adminEnv)).status,428);
assert.equal((await worker.fetch(previewRequest('DELETE',{mode:hidden.mode}),adminEnv)).status,428);
const staleRecord=await readRecord(hidden.mode);
assert.equal((await writeRecord('PUT',{draft:hidden})).status,200);
assert.notEqual((await readRecord(hidden.mode)).revision,staleRecord.revision);
const unchangedRows=sqlite.prepare('SELECT * FROM priority_preview ORDER BY mode').all();
for(const method of ['PUT','DELETE']){
  const response=await worker.fetch(previewRequest(method,{draft:hidden,mode:hidden.mode,revision:staleRecord.revision}),adminEnv);
  assert.equal(response.status,409);assert.equal(response.headers.get('Cache-Control'),'no-store');
  assert.deepEqual(sqlite.prepare('SELECT * FROM priority_preview ORDER BY mode').all(),unchangedRows);
}
for(const method of ['PUT','DELETE']){
  const latest=await readRecord(hidden.mode);let peerRows;
  const raceDB={prepare(sql){const statement=DB.prepare(sql),run=statement.run;statement.run=async()=>{
    if(sql.startsWith(method==='PUT'?'UPDATE priority_preview':'DELETE FROM priority_preview')){
      sqlite.prepare('UPDATE priority_preview SET updated_at = ? WHERE mode = ?').run('peer-'+method,hidden.mode);
      peerRows=sqlite.prepare('SELECT * FROM priority_preview ORDER BY mode').all();
    }return run();};return statement;}};
  assert.equal((await worker.fetch(previewRequest(method,{draft:hidden,mode:hidden.mode,revision:latest.revision}),{...adminEnv,DB:raceDB})).status,409);
  assert.deepEqual(sqlite.prepare('SELECT * FROM priority_preview ORDER BY mode').all(),peerRows);
}
const insertedDraft={...newOrder,mode:'race_insert'},emptyRecord=await readRecord('race_insert');
const insertDB={prepare(sql){const statement=DB.prepare(sql),run=statement.run;statement.run=async()=>{
  if(sql.startsWith('INSERT INTO priority_preview'))sqlite.prepare('INSERT INTO priority_preview VALUES (?, ?, ?)').run(insertedDraft.mode,JSON.stringify(insertedDraft),'peer-insert');
  return run();};return statement;}};
assert.equal((await worker.fetch(previewRequest('PUT',{draft:insertedDraft,revision:emptyRecord.revision}),{...adminEnv,DB:insertDB})).status,409);
assert.equal(sqlite.prepare('SELECT updated_at FROM priority_preview WHERE mode = ?').get('race_insert').updated_at,'peer-insert');
const beforeDelete=await readRecord(hidden.mode);
assert.equal((await writeRecord('DELETE',{mode:hidden.mode})).status,200);
assert.equal((await worker.fetch(previewRequest('PUT',{draft:hidden,revision:beforeDelete.revision}),adminEnv)).status,409);
assert.equal((await readRecord(hidden.mode)).draft,null);
assert.equal((await worker.fetch(previewRequest('PUT',{draft:hidden,revision:emptyRecord.revision}),adminEnv)).status,409);
assert(!Object.hasOwn(await (await worker.fetch(new Request(previewUrl),adminEnv)).json(),'revision'));
console.log('Legacy record reads and atomic writes reject stale/missing/wrong-ID revisions, peer races and deleted-row resurrection');

console.log('Worker route validation passed');


// Diagnostic reads the same prepared body, never calls Scouter or D1.
const diagnosticUrl = 'https://preview.example/api/scouter-request-diagnostic';
const diagnosticEnv = {...kmsEnv, ADMIN_EMAIL:'owner@example.test', DB:{prepare(){throw new Error('Diagnostic must not touch storage');}}};
const oldDiagnosticFetch = globalThis.fetch;
globalThis.fetch = () => {throw new Error('Diagnostic must not call upstream');};
try {
  assert.equal((await worker.fetch(new Request(diagnosticUrl), diagnosticEnv)).status,403);
  assert.equal((await worker.fetch(new Request(diagnosticUrl,{headers:{'oai-authenticated-user-email':'other@example.test'}}), diagnosticEnv)).status,403);
  const response = await worker.fetch(new Request(diagnosticUrl,{headers:adminHeaders}), diagnosticEnv);
  assert.equal(response.status,200);
  assert.equal(response.headers.get('Cache-Control'),'no-store');
  const report = await response.json();
  assert.equal(report.requests.length,4);
  for (const r of report.requests) {
    assert.match(r.requestContext.benchmarkFingerprint,/^[a-f0-9]{64}$/);
    assert.match(r.requestContext.resetFingerprint,/^[a-f0-9]{64}$/);
    assert.match(r.requestContext.preparedBodyFingerprint,/^[a-f0-9]{64}$/);
    assert.equal(r.requestContext.region,r.mode.startsWith('taotie_')?'KMS':'GMS');
    assert.equal(r.requestContext.world,r.mode.endsWith('_interactive')?'Interactive':'Heroic');
    assert.equal(r.requestContext.semanticValidation,'not-established-by-fingerprints');
    assert.equal(r.upstreamCalled,false);
    assert.equal(r.validatedForClassSubstitution,false);
    for (const path of ['myHexa','userStat.hexa']) {
      assert.equal(r.fields.find(f=>f.path===path+'.skillCore1').value,'1');
      assert.equal(r.fields.find(f=>f.path===path+'.hexaSkill.skillCore1').value,1);
      assert.equal(r.fields.find(f=>f.path===path+'.hexaStat').value,0);
      assert.equal(r.fields.find(f=>f.path===path+'.hexaStat_opened').value,false);
    }
    assert(r.issues.some(i=>/all three Stats/.test(i.reason)));
  }
  assert(!JSON.stringify(report).includes('test-key'));
  assert.equal(report.requests[0].requestContext.benchmarkFingerprint,report.requests[1].requestContext.benchmarkFingerprint);
  assert.equal(report.requests[0].requestContext.resetFingerprint,report.requests[1].requestContext.resetFingerprint);
  const privatePayload = structuredClone(payload);
  privatePayload.userStat.accountId='PRIVATE_ACCOUNT';
  privatePayload.userStat.stat.attack=987654;
  privatePayload.myHexa.hexaStat2=12;
  privatePayload.myHexa.extraLevel=9;
  privatePayload.myHexa.secretName='PRIVATE_CHARACTER';
  privatePayload.myHexa.hexaSkill.masteryCore1=5;
  delete privatePayload.myHexa.masteryCore1;
  const raw = JSON.stringify(privatePayload);
  const privateReport = await (await worker.fetch(new Request(diagnosticUrl,{headers:adminHeaders}), {...diagnosticEnv,MAPLE_SCOUTER_REQUEST_PART_1:raw,MAPLE_SCOUTER_REQUEST_PART_2:' '})).json();
  const encoded = JSON.stringify(privateReport);
  for(const secret of ['PRIVATE_ACCOUNT','PRIVATE_CHARACTER','987654']) assert(!encoded.includes(secret));
  assert(privateReport.requests[0].issues.some(i=>i.path==='myHexa.hexaStat2'));
  assert(privateReport.requests[0].issues.some(i=>i.path==='myHexa.extraLevel'));
  assert(privateReport.requests[0].issues.some(i=>/Missing matching top-level/.test(i.reason)));
} finally {globalThis.fetch=oldDiagnosticFetch;}
console.log('Owner request diagnostic validation passed');

const serviceSecret = 'diagnostic-test-token-at-least-32-characters';
assert.equal((await worker.fetch(new Request(diagnosticUrl,{headers:{Authorization:'Bearer wrong'}}),{...diagnosticEnv,SCOUTER_DIAGNOSTIC_TOKEN:serviceSecret})).status,403);
assert.equal((await worker.fetch(new Request(diagnosticUrl,{headers:{Authorization:'Bearer '+serviceSecret}}),{...diagnosticEnv,SCOUTER_DIAGNOSTIC_TOKEN:serviceSecret})).status,200);
assert.equal((await worker.fetch(new Request(diagnosticUrl,{headers:{Authorization:'Bearer short'}}),{...diagnosticEnv,SCOUTER_DIAGNOSTIC_TOKEN:'short'})).status,403);

for (const [field,value] of [['hexaStat','not-a-level'],['hexaStat_opened','true']]) {
  const malformed = structuredClone(payload);
  malformed.userStat.hexa[field] = value;
  const raw = JSON.stringify(malformed);
  const response = await worker.fetch(new Request(diagnosticUrl,{headers:adminHeaders}), {...diagnosticEnv,MAPLE_SCOUTER_REQUEST_PART_1:raw,MAPLE_SCOUTER_REQUEST_PART_2:' '});
  const report = await response.json();
  assert.match(report.requests[0].error,/cannot be reset/);
  assert.equal(report.requests[0].validatedForClassSubstitution,false);
}

const unexpectedPayload = structuredClone(payload);
unexpectedPayload.myHexa.skillCore99 = '12';
unexpectedPayload.myHexa.hexaSkill.skillCore99 = 12;
const unexpectedRaw = JSON.stringify(unexpectedPayload);
const unexpectedReport = await (await worker.fetch(new Request(diagnosticUrl,{headers:adminHeaders}), {...diagnosticEnv,MAPLE_SCOUTER_REQUEST_PART_1:unexpectedRaw,MAPLE_SCOUTER_REQUEST_PART_2:' '})).json();
assert(unexpectedReport.requests[0].issues.some(i=>i.path==='myHexa.skillCore99' && /Unrecognised/.test(i.reason)));
assert(unexpectedReport.requests[0].issues.some(i=>i.path==='myHexa.skillCore3' && /Missing core/.test(i.reason)));
