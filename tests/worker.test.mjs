import assert from 'node:assert/strict';
import worker from '../worker.js';

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
  globalThis.fetch = async () => { throw new Error('network unavailable'); };
  assert.equal((await worker.fetch(request('lotus_heroic'), env)).status, 502);
} finally { globalThis.fetch = originalFetch; }

console.log('Worker route validation passed');
