import assert from 'node:assert/strict';
import worker from '../worker.js';

const url = 'https://preview.example/api/hexa-order';
const payload = { myHexa: { character_class: '호영' }, userStat: { stat: { myClass: '호영' }, isGMS: true }, sole: false };
const request = mode => new Request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode }) });
const env = { MAPLE_SCOUTER_API_KEY: 'test-key', MAPLE_SCOUTER_REQUEST_JSON: JSON.stringify(payload) };

assert.equal((await worker.fetch(request('lotus_heroic'), {})).status, 503);
assert.equal((await worker.fetch(request('taotie_heroic'), env)).status, 400);
assert.equal((await worker.fetch(request('lotus_heroic'), { ...env, MAPLE_SCOUTER_REQUEST_JSON: JSON.stringify({ ...payload, userStat: { ...payload.userStat, isGMS: false } }) })).status, 503);
assert.equal((await worker.fetch(new Request(url, { method: 'GET' }), env)).status, 405);

const originalFetch = globalThis.fetch;
try {
  const requestedModes = [];
  globalThis.fetch = async (target, options) => {
    assert.match(target, /^https:\/\/api\.maplescouter\.com\/api\/calc\/hexa-order/);
    assert.equal(options.headers['api-key'], env.MAPLE_SCOUTER_API_KEY);
    assert.equal(options.headers.Origin, 'https://maplescouter.com');
    const sent = JSON.parse(options.body);
    assert.deepEqual(sent, { ...payload, sole: sent.sole });
    requestedModes.push(sent.sole);
    return Response.json({ class_hexa: [['sample']] });
  };
  const result = await worker.fetch(request('lotus_heroic'), env);
  assert.equal(result.status, 200);
  assert.equal(result.headers.get('Cache-Control'), 'no-store');
  assert.equal((await result.json()).class_hexa.length, 1);
  assert.equal((await worker.fetch(request('lotus_interactive'), env)).status, 200);
  assert.deepEqual(requestedModes, [false, true]);

  globalThis.fetch = async () => Response.json({ class_hexa: [] });
  assert.equal((await worker.fetch(request('lotus_heroic'), env)).status, 502);
  globalThis.fetch = async () => { throw new Error('network unavailable'); };
  assert.equal((await worker.fetch(request('lotus_heroic'), env)).status, 502);
} finally { globalThis.fetch = originalFetch; }

console.log('Worker route validation passed');
