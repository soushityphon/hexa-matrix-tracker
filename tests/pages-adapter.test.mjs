import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { onRequest } from '../functions/[[path]].js';

globalThis.fetch = () => { throw new Error('Pages adapter tests must remain offline'); };
let dbReads = 0;
const env = { ADMIN_EMAIL: 'owner@example.test', ADMIN_AUTH_MODE: 'sites',
  DB: { prepare() { dbReads++; throw new Error('Unauthorised Pages request reached DB'); } } };
const request = (path, method = 'GET', origin = 'https://tracker.pages.dev') => onRequest({
  request: new Request(origin + path, { method, headers: { 'oai-authenticated-user-email': env.ADMIN_EMAIL } }), env,
  next() { throw new Error('Must not fall through to static assets'); }
});
for (const origin of ['https://tracker.pages.dev', 'https://preview.tracker.pages.dev', 'https://custom.example']) {
  const admin = await request('/priority-review.html', 'GET', origin);
  assert.equal(admin.status, 503); // Incomplete Discord configuration, never Sites access.
  assert.doesNotMatch(await admin.text(), /Continue with ChatGPT|priority-review.js/);
  for (const path of ['/api/admin-panel', '/api/admin-maintenance', '/api/scouter-catalogue', '/api/scouter-request-diagnostic', '/api/hexa-order', '/api/ren-capture']) {
    assert.equal((await request(path, 'GET', origin)).status, 403, path);
  }
}
assert.equal(dbReads, 0);
assert.equal(env.ADMIN_AUTH_MODE, 'sites');
// A valid bound Discord session still reaches the existing owner API and DB.
// Synthetic provider responses prove adapter wiring, not live OAuth/cookies.
const ownerEnv = { ADMIN_AUTH_ORIGIN: 'https://tracker.pages.dev',
  DISCORD_CLIENT_ID: '1555838379550056469', DISCORD_ADMIN_ID: '98039332970975232',
  DISCORD_CLIENT_SECRET: 'synthetic-secret-for-offline-tests', ADMIN_SESSION_SECRET: 'x'.repeat(43),
  DB: { prepare() { return { bind() { return this; }, first: async () => null, all: async () => ({ results: [] }) }; } } };
const login = await onRequest({ request: new Request('https://tracker.pages.dev/auth/discord/login'), env: ownerEnv });
assert.equal(login.status, 302);
const state = new URL(login.headers.get('location')).searchParams.get('state');
const stateCookie = login.headers.get('set-cookie').split(';')[0];
let providerCalls = 0;
globalThis.fetch = async url => {
  providerCalls++;
  if (String(url) === 'https://discord.com/api/oauth2/token') return Response.json({ access_token: 'synthetic-token', token_type: 'Bearer', scope: 'identify' });
  if (String(url) === 'https://discord.com/api/v10/users/@me') return Response.json({ id: ownerEnv.DISCORD_ADMIN_ID });
  throw new Error('Unexpected provider destination');
};
const callback = await onRequest({ request: new Request('https://tracker.pages.dev/auth/discord/callback?code=synthetic-code&state=' + encodeURIComponent(state), { headers: { Cookie: stateCookie } }), env: ownerEnv });
assert.equal(callback.status, 303); assert.equal(providerCalls, 2);
const sessionCookie = callback.headers.getSetCookie().find(c => c.startsWith('__Host-hexa-admin=')).split(';')[0];
const owner = await onRequest({ request: new Request('https://tracker.pages.dev/api/admin-panel', { headers: { Cookie: sessionCookie } }), env: ownerEnv });
assert.equal(owner.status, 200);
globalThis.fetch = () => { throw new Error('Pages adapter tests must remain offline'); };
for (const [path, file, type] of [['/', 'index.html', 'text/html; charset=utf-8'], ['/app.js', 'app.js', 'text/javascript; charset=utf-8'], ['/assets/sol-erda.png', 'assets/sol-erda.png', 'image/png']]) {
  const response = await request(path);
  assert.equal(response.status, 200); assert.equal(response.headers.get('content-type'), type);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), readFileSync(new URL('../' + file, import.meta.url)));
  assert.equal((await (await request(path, 'HEAD')).arrayBuffer()).byteLength, 0);
}
for (const path of ['/discord-auth.js', '/worker.js', '/dist/server/index.js', '/functions/[[path]].js', '/wrangler.pages.example.json', '/docs/pages-release.md']) {
  assert.equal((await request(path)).status, 404, path);
}
assert.equal((await request('/app.js', 'POST')).status, 405);
const audio = await onRequest({ request: new Request('https://tracker.pages.dev/assets/music/ren-login-theme.mp3', { headers: { Range: 'bytes=0-99' } }), env });
assert.equal(audio.status, 206); assert.equal((await audio.arrayBuffer()).byteLength, 100);
assert.deepEqual(readdirSync(new URL('../dist/pages', import.meta.url)).sort(), ['404.html', '_routes.json']);
assert.deepEqual(JSON.parse(readFileSync(new URL('../dist/pages/_routes.json', import.meta.url))), { version: 1, include: ['/*'], exclude: [] });
console.log('Pages adapter public bytes/HEAD/range, all-route routing, server privacy and header refusal pass offline.');
