import assert from 'node:assert/strict';
import worker from '../worker.js';

// These requests model the Worker's post-gateway input. They cannot prove that
// a deployed gateway strips client identity headers or authenticates visitors.
const owner = 'owner@example.test';
const paths = ['/api/admin-panel', '/api/admin-maintenance', '/api/scouter-request-diagnostic', '/api/scouter-catalogue', '/api/hexa-order', '/api/ren-capture', '/api/priority-preview?record=lotus_heroic'];
const maintenance = 'isolated-maintenance-token-longer-than-32';
const diagnostic = 'isolated-diagnostic-token-longer-than-32';
let databaseCalls = 0, upstreamCalls = 0;
const env = {
  ADMIN_EMAIL: owner,
  ADMIN_MAINTENANCE_TOKEN: maintenance,
  SCOUTER_DIAGNOSTIC_TOKEN: diagnostic,
  DB: { prepare() { databaseCalls++; throw new Error('Unauthorised request reached storage'); } }
};
const oldFetch = globalThis.fetch;
globalThis.fetch = () => { upstreamCalls++; throw new Error('Unauthorised request reached upstream'); };
try {
  for (const headers of [
    {},
    {'oai-authenticated-user-email': 'visitor@example.test'},
    {'oai-authenticated-user-id': owner},
    {'x-forwarded-email': owner, 'x-user-email': owner, 'cookie': `email=${owner}`},
    {'Authorization': `Bearer ${owner}`},
    {'oai-authenticated-user-email': `${owner}, visitor@example.test`},
    {'oai-authenticated-user-email': `visitor@example.test, ${owner}`}
  ]) {
    for (const path of paths) {
      for (const method of path.startsWith('/api/priority-preview') ? ['GET', 'PUT', 'DELETE'] : ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
        const response = await worker.fetch(new Request('https://isolated.example'+path, {method, headers}), env);
        assert.equal(response.status, 403, `${method} ${path}`);
        assert.equal(await response.text(), 'Admin access required');
      }
    }
    for (const path of ['/priority-review.html', '/scouter-request-diagnostic.html']) {
      const response = await worker.fetch(new Request('https://isolated.example'+path, {headers}), env);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('Cache-Control'), 'no-store');
      assert.match(await response.text(), /Sign in as the site owner to edit priorities/);
    }
  }
  // Existing service credentials have specific scope, never generic admin scope.
  for (const token of [maintenance, diagnostic]) {
    for (const path of paths.filter(path => !['/api/admin-maintenance', '/api/scouter-request-diagnostic'].includes(path))) {
      assert.equal((await worker.fetch(new Request('https://isolated.example'+path, {headers:{Authorization:`Bearer ${token}`}}), env)).status, 403);
    }
  }
  assert.equal((await worker.fetch(new Request('https://isolated.example/api/admin-maintenance', {headers:{Authorization:`Bearer ${diagnostic}`}}), env)).status, 403);
  assert.equal((await worker.fetch(new Request('https://isolated.example/api/scouter-request-diagnostic', {headers:{Authorization:`Bearer ${maintenance}`}}), env)).status, 403);
  assert.equal(databaseCalls, 0);
  assert.equal(upstreamCalls, 0);
  // A synthetic trusted header is accepted by design. Keep this assumption
  // explicit so an isolated pass is never presented as gateway verification.
  for (const email of [owner, owner.toUpperCase()]) {
    const response = await worker.fetch(new Request('https://isolated.example/api/admin-panel', {headers:{'oai-authenticated-user-email':email}}), {ADMIN_EMAIL:owner});
    assert.equal(response.status, 503);
    assert.equal(await response.text(), 'Admin storage is unavailable');
  }
  assert.equal((await worker.fetch(new Request('https://isolated.example/api/admin-panel', {headers:{'oai-authenticated-user-email':owner}}), {})).status, 403);
} finally { globalThis.fetch = oldFetch; }
console.log('Protected routes refuse untrusted identities before storage/upstream; gateway verification remains separate.');
