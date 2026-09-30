import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {acquireScouterCatalogue} from '../scouter-catalogue-acquisition.js';
import worker from '../worker.js';

// Synthetic source exercises transport/schema behaviour, not canonical job data.
const base = 'https://maplescouter.com';
const paths = ['/_next/static/chunks/6352-test.js','/_next/static/chunks/7717-test.js','/_next/static/chunks/app/ko/hexa/page-test.js'];
const page = paths.map(path => `<script src="${path}"></script>`).join('');
const metadata = '91178:(e,a,r)=>{let t={공용:{generalCore1:{title:"공용",url:"/hexaskill/General/General_1_0.png"}},"테스트":{skillCore1:{title:"원점",url:"/hexaskill/Test_1.png"},skillCore4:{title:"빈 슬롯",url:""}},"다른 직업":{skillCore1:{title:"다른 원점",url:"/hexaskill/Other_1.png"}}}}';
const values = Array.from({length:31},(_,i) => i*i);
const costs = `60937:(e,a,r)=>{let a=[${values}],b=[${values.map(v=>v*3)}],p=[{key:"skillCore1",sole:a,piece:b,affectsSpec:!0,freeBaseLv:1},{key:"generalCore1",sole:a,piece:b,affectsSpec:!1}]}`;
const icons = 'R={generalCore1:"/hexaskill/General/General_1_0.png"}';
const sources = new Map([[base+'/ko/hexa',page], ...paths.map((path,i)=>[base+path,[metadata,costs,icons][i]])]);
function fetcher(entries = sources) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push(url);
    assert.equal(options.redirect,'error');
    assert.equal(options.credentials,'omit');
    assert(!Object.keys(options.headers).some(key => /api-key|authorization|cookie/i.test(key)));
    assert(entries.has(url),`Unexpected source request ${url}`);
    return new Response(entries.get(url));
  };
  return {calls,fetchImpl};
}
const first = fetcher();
const catalogue = await acquireScouterCatalogue('테스트','KMS','Heroic',first);
assert.deepEqual(first.calls,[base+'/ko/hexa',...paths.map(path=>base+path)]);
assert.equal(catalogue.skills.length,2);
assert.equal(catalogue.placeholders.length,1);
assert.deepEqual(catalogue.skills.find(s=>s.coreId==='skillCore1').costs.levels[1],{level:2,erda:3,frags:9});
assert.equal(catalogue.provenance.metadata.sha256,createHash('sha256').update(metadata).digest('hex'));
assert(Number.isFinite(Date.parse(catalogue.provenance.metadata.capturedAt)));
assert.deepEqual(catalogue.reviewedOverrides,{});
assert.deepEqual(catalogue.orders,[]);
assert.deepEqual(catalogue.fd,[]);
assert.equal(catalogue.publishable,false);
assert.equal(catalogue.selection.sole,false);
const other = await acquireScouterCatalogue('다른 직업','GMS','Interactive',fetcher());
assert.equal(other.skills.find(s=>s.coreId==='skillCore1').sourceName,'다른 원점');
assert.equal(other.selection.sole,true);

for (const args of [['','GMS','Heroic'],['테스트','USA','Heroic'],['테스트','GMS','Reg'],['x'.repeat(81),'GMS','Heroic']]) {
  const invalid = fetcher();
  await assert.rejects(()=>acquireScouterCatalogue(...args,invalid));
  assert.equal(invalid.calls.length,0);
}
let calls = 0;
await assert.rejects(()=>acquireScouterCatalogue('테스트','KMS','Heroic',{fetchImpl:async()=>{calls++;return new Response('rate limited',{status:429});}}),/429/);
assert.equal(calls,1,'No retries after rejection');
for (const entries of [
  new Map([...sources,[base+'/ko/hexa','<script src="/_next/static/chunks/../private.js"></script>']]),
  new Map([...sources,[base+paths[1],costs.replace('freeBaseLv:1','freeBaseLv:2')]]),
  new Map([...sources,[base+paths[0],metadata.replace('원점','CHANGED')]])
]) {
  if (entries.get(base+paths[0]).includes('CHANGED')) {
    assert.equal((await acquireScouterCatalogue('테스트','KMS','Heroic',fetcher(entries))).skills.find(s=>s.coreId==='skillCore1').sourceName,'CHANGED');
  } else await assert.rejects(()=>acquireScouterCatalogue('테스트','KMS','Heroic',fetcher(entries)));
}
await assert.rejects(()=>acquireScouterCatalogue('없는 직업','KMS','Heroic',fetcher()),/metadata missing/);
await assert.rejects(()=>acquireScouterCatalogue('테스트','KMS','Heroic',{fetchImpl:async()=>new Response('x',{headers:{'Content-Length':'3000001'}})}),/inspection limit/);
await assert.rejects(()=>acquireScouterCatalogue('테스트','KMS','Heroic',{fetchImpl:async()=>new Response('x'.repeat(3_000_001))}),/inspection limit/);
await assert.rejects(()=>acquireScouterCatalogue('테스트','KMS','Heroic',{fetchImpl:async()=>new Response(new Uint8Array([255]))}),/encoded data/);
let stalledSignal;
await assert.rejects(()=>acquireScouterCatalogue('테스트','KMS','Heroic',{timeoutMs:20,fetchImpl:async(_url,options)=>{stalledSignal=options.signal;return new Promise(()=>{});}}),/timed out/);
assert.equal(stalledSignal.aborted,true);
let cancelled = false;
await assert.rejects(()=>acquireScouterCatalogue('테스트','KMS','Heroic',{timeoutMs:20,fetchImpl:async()=>new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('<html>'));},cancel(){cancelled=true;}}))}),/timed out/);
assert.equal(cancelled,true,'Stalled body is cancelled');
const many = Array.from({length:46},(_,i)=>`/_next/static/chunks/${i}-unknown.js`);
const scan = fetcher(new Map([[base+'/ko/hexa',many.map(p=>`<script src='${p}'></script>`).join('')],...many.map(p=>[base+p,'unknown module'])]));
await assert.rejects(()=>acquireScouterCatalogue('테스트','KMS','Heroic',scan),/modules not found/);
assert.equal(scan.calls.length,46,'Page plus at most 45 chunks');
const large = fetcher(new Map([[base+'/ko/hexa',many.map(p=>`<script src='${p}'></script>`).join('')],...many.map(p=>[base+p,'x'.repeat(2_500_000)])]));
await assert.rejects(()=>acquireScouterCatalogue('테스트','KMS','Heroic',large),/inspection limit/);
assert.equal(large.calls.length,6,'Aggregate bytes stop scanning early');

const route = 'https://preview.example/api/scouter-catalogue?job=테스트&region=KMS&world=Heroic';
const owner = {'oai-authenticated-user-email':'owner@example.test'};
const env = {ADMIN_EMAIL:'owner@example.test',get DB(){throw new Error('No storage access');},get MAPLE_SCOUTER_API_KEY(){throw new Error('No secret access');}};
const savedFetch = globalThis.fetch;
try {
  globalThis.fetch = () => {throw new Error('Rejected route must not fetch');};
  assert.equal((await worker.fetch(new Request(route),env)).status,403);
  assert.equal((await worker.fetch(new Request(route,{headers:{'oai-authenticated-user-email':'other@example.test'}}),env)).status,403);
  assert.equal((await worker.fetch(new Request(route,{headers:owner,method:'POST'}),env)).status,405);
  for (const suffix of ['&region=GMS','&url=https://example.test','&world=Reg']) assert.equal((await worker.fetch(new Request(route+suffix,{headers:owner}),env)).status,400);
  const transport = fetcher(); globalThis.fetch = transport.fetchImpl;
  const result = await worker.fetch(new Request(route,{headers:owner}),env);
  assert.equal(result.status,200);assert.equal(result.headers.get('Cache-Control'),'no-store');
  assert.equal((await result.json()).publishable,false);
  assert.equal(transport.calls.length,4);
  globalThis.fetch = async()=>{throw new Error('PRIVATE_INTERNAL_DETAILS');};
  const error = await worker.fetch(new Request(route,{headers:owner}),env);
  assert.equal(error.status,502);assert(!String(await error.text()).includes('PRIVATE_INTERNAL_DETAILS'));
} finally {globalThis.fetch = savedFetch;}
console.log('Server catalogue acquisition validation passed');
