import assert from 'node:assert/strict';
import worker from '../worker.js';
import { currentDraft } from '../priority-draft.js';

const url = 'https://preview.example/api/hexa-order';
const payload = { myHexa: { character_class: '호영', hexaStat: 2, hexaStat_opened: false }, userStat: { stat: { myClass: '호영' }, isGMS: true, hexa: { hexaStat: 2, hexaStat_opened: false } }, sole: false };
const request = mode => new Request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode }) });
const template = JSON.stringify(payload);
const env = { MAPLE_SCOUTER_API_KEY: 'test-key', MAPLE_SCOUTER_REQUEST_PART_1: template.slice(0, 30), MAPLE_SCOUTER_REQUEST_PART_2: template.slice(30) };
const fixedHexa = { character_class: '호영', hexaStat: 0, hexaStat_opened: false, skillCore1: '1', masteryCore1: '0', hexaSkill: { skillCore1: 1, masteryCore1: 0 }, hexaSkill_general: { generalCore1: 0 } };
const kmsPayload = { ...payload, userStat: { ...payload.userStat, isGMS: false, hexa: fixedHexa }, myHexa: fixedHexa };
const kmsTemplate = JSON.stringify(kmsPayload);
const kmsEnv = { ...env, MAPLE_SCOUTER_KMS_REQUEST_PART_1: kmsTemplate.slice(0, 40), MAPLE_SCOUTER_KMS_REQUEST_PART_2: kmsTemplate.slice(40) };

assert.equal((await worker.fetch(request('lotus_heroic'), {})).status, 503);
assert.equal((await worker.fetch(request('taotie_heroic'), env)).status, 503);
const wrongBaseline = kmsTemplate.replace('"hexaStat":0', '"hexaStat":2');
assert.equal((await worker.fetch(request('taotie_heroic'), { ...kmsEnv, MAPLE_SCOUTER_KMS_REQUEST_PART_1: wrongBaseline.slice(0, 40), MAPLE_SCOUTER_KMS_REQUEST_PART_2: wrongBaseline.slice(40) })).status, 503);
const invalidTemplate = JSON.stringify({ ...payload, userStat: { ...payload.userStat, isGMS: false } });
assert.equal((await worker.fetch(request('lotus_heroic'), { ...env, MAPLE_SCOUTER_REQUEST_PART_1: invalidTemplate.slice(0, 30), MAPLE_SCOUTER_REQUEST_PART_2: invalidTemplate.slice(30) })).status, 503);
assert.equal((await worker.fetch(new Request(url, { method: 'GET' }), env)).status, 405);

const originalFetch = globalThis.fetch;
try {
  const requestedModes = [];
  globalThis.fetch = async (target, options) => {
    assert.match(target, /^https:\/\/api\.maplescouter\.com\/api\/calc\/hexa-order/);
    assert.equal(options.headers['api-key'], env.MAPLE_SCOUTER_API_KEY);
    assert.equal(options.headers.Origin, 'https://maplescouter.com');
    const sent = JSON.parse(options.body);
    const expected = sent.userStat.isGMS ? payload : kmsPayload;
    assert.deepEqual(sent, { ...expected, myHexa: { ...expected.myHexa, hexaStat: 0, hexaStat_opened: false }, userStat: { ...expected.userStat, hexa: { ...expected.userStat.hexa, hexaStat: 0, hexaStat_opened: false } }, sole: sent.sole });
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


const previews = new Map();
const DB = {
  prepare(sql) {
    let values = [];
    return {
      bind(...args) { values = args; return this; },
      async all() { assert.match(sql, /^SELECT /); return { results: [...previews].map(([mode, draft_json]) => ({ mode, draft_json })) }; },
      async run() {
        if (sql.startsWith('DELETE ')) previews.delete(values[0]);
        else { assert.match(sql, /^INSERT /); previews.set(values[0], values[1]); }
      }
    };
  }
};
const previewUrl = 'https://preview.example/api/priority-preview';
const adminEnv = { DB, ADMIN_EMAIL: 'owner@example.test' };
const adminHeaders = { 'Content-Type': 'application/json', 'oai-authenticated-user-email': 'owner@example.test' };
const previewRequest = (method, body, headers = adminHeaders) => new Request(previewUrl, { method, headers, body: JSON.stringify(body) });
assert.equal((await worker.fetch(new Request(previewUrl), {})).status, 503);
assert.deepEqual((await (await worker.fetch(new Request(previewUrl), adminEnv)).json()).drafts, {});
assert.equal((await worker.fetch(previewRequest('PUT', { draft: currentDraft('lotus_heroic') }, { 'Content-Type': 'application/json' }), adminEnv)).status, 403);
const hidden = { ...currentDraft('lotus_heroic'), enabled: false };
assert.equal((await worker.fetch(previewRequest('PUT', { draft: hidden }), adminEnv)).status, 200);
assert.equal((await (await worker.fetch(new Request(previewUrl), adminEnv)).json()).drafts.lotus_heroic.enabled, false);
const newOrder = { ...currentDraft('lotus_interactive'), mode: 'lotus_interactive_20260929', sourceMode: 'lotus_interactive', isNew: true, name: 'Imported order', enabled: true, steps: [{ skill: 'Harmony', level: 1 }] };
assert.equal((await worker.fetch(previewRequest('PUT', { draft: newOrder }), adminEnv)).status, 200);
assert.equal((await (await worker.fetch(new Request(previewUrl), adminEnv)).json()).drafts[newOrder.mode].steps.length, 1);
const unknownOrder = { ...newOrder, newNodes: [{ short: 'New', name: 'New', type: 'Skill', icon: 'https://maplescouter.com/hexaskill/New.png' }], steps: [{ skill: 'New', level: 1 }] };
assert.equal((await worker.fetch(previewRequest('PUT', { draft: unknownOrder }), adminEnv)).status, 400);
assert.equal((await worker.fetch(previewRequest('DELETE', { mode: newOrder.mode }, { 'Content-Type': 'application/json' }), adminEnv)).status, 403);
assert.equal((await worker.fetch(previewRequest('DELETE', { mode: newOrder.mode }), adminEnv)).status, 200);
assert.equal((await (await worker.fetch(new Request(previewUrl), adminEnv)).json()).drafts[newOrder.mode], undefined);
assert.equal((await worker.fetch(new Request('https://preview.example/priority-review.html'), adminEnv)).status, 403);
assert.equal((await worker.fetch(previewRequest('PUT', { draft: hidden }, { ...adminHeaders, 'oai-authenticated-user-email': 'other@example.test' }), adminEnv)).status, 403);
assert.equal((await worker.fetch(previewRequest('PUT', { draft: hidden }, { ...adminHeaders, 'oai-authenticated-user-email': 'OWNER@example.test' }), adminEnv)).status, 200);

console.log('Worker route validation passed');
