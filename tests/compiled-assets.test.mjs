import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import worker from '../dist/server/index.js';

const root = resolve(import.meta.dirname, '..');
const origin = 'https://compiled.example';
// Test only the compiled handler, with synthetic identity and no DB/secrets.
// Any accidental upstream request must fail rather than contact a live service.
globalThis.fetch = () => { throw new Error('Compiled asset checks must remain offline'); };
const env = { ADMIN_EMAIL: 'owner@example.test' };
const request = (path, method = 'GET', owner = false) => worker.fetch(
  new Request(new URL(path, origin), {
    method,
    headers: owner ? { 'oai-authenticated-user-email': env.ADMIN_EMAIL } : {}
  }), env
);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.mp3': 'audio/mpeg'
};
const delivered = new Set();
async function verify(path, owner = false) {
  if (delivered.has(path)) return;
  const ext = extname(path);
  const bytes = readFileSync(resolve(root, path.slice(1)));
  const get = await request(path, 'GET', owner);
  assert.equal(get.status, 200, path);
  assert.equal(get.headers.get('content-type'), types[ext], path);
  assert.deepEqual(Buffer.from(await get.arrayBuffer()), bytes, path);
  const head = await request(path, 'HEAD', owner);
  assert.equal(head.status, 200, path);
  assert.equal(head.headers.get('content-type'), types[ext], path);
  assert.equal((await head.arrayBuffer()).byteLength, 0, path);
  for (const response of [get, head]) {
    assert.equal(response.headers.get('cache-control'),
      ['.html', '.js', '.css'].includes(ext) ? 'no-store' : 'public, max-age=60', path);
  }
  delivered.add(path);
  // Follow local HTML, CSS and static module dependencies from real entrypoints.
  // A forgotten bundle/allowlist entry fails even when pure source tests pass.
  if (['.html', '.js', '.css'].includes(ext)) {
    const text = bytes.toString('utf8');
    const expressions = ext === '.html'
      ? [/(?:src|href)=["']([^"']+)["']/g]
      : ext === '.css'
        ? [/url\(\s*["']?([^"')\s]+)["']?\s*\)/g]
        : [/(?:\bfrom\s*|\bimport\s*)["']([^"']+)["']/g];
    for (const expression of expressions) {
      for (const match of text.matchAll(expression)) {
        const dependency = new URL(match[1], origin + path);
        if (dependency.origin === origin && types[extname(dependency.pathname)]) {
          await verify(dependency.pathname, owner);
        }
      }
    }
  }
}

// skill-cost-review is currently bundled but is not reached by browser imports.
// Keep its delivered bytes/cache policy covered without changing that allowlist.
for (const path of ['/index.html', '/app.js', '/priority-review.html', '/scouter-request-diagnostic.html', '/skill-cost-review.js']) {
  await verify(path, path.includes('review') || path.includes('diagnostic'));
}
const decorations = JSON.parse(readFileSync(resolve(root, 'assets/backgrounds/manifest.json')));
const images = [
  '/assets/sol-erda.png', '/assets/sol-erda-fragment.png',
  ...[1, 2, 3].flatMap(n => ['locked', 'unlocked'].map(state => `/assets/hexa-stats/stat-${n}-${state}.png`)),
  ...decorations.map(asset => '/' + asset.path),
  '/assets/music/ren-login-theme.mp3'
];
for (const path of images) await verify(path);
// Exercise range delivery in the packaged handler, not just worker.js fixtures.
// Seeking/looping needs the exact original MP3 bytes and consistent lengths.
const audioPath = '/assets/music/ren-login-theme.mp3';
const audioBytes = readFileSync(resolve(root, audioPath.slice(1)));
for (const [range, start, end] of [
  ['bytes=0-99', 0, 99],
  ['bytes=100-', 100, audioBytes.length - 1],
  ['bytes=-100', audioBytes.length - 100, audioBytes.length - 1],
  [`bytes=${audioBytes.length - 10}-${audioBytes.length + 100}`, audioBytes.length - 10, audioBytes.length - 1]
]) {
  const response = await worker.fetch(new Request(origin + audioPath, { headers: { Range: range } }), env);
  assert.equal(response.status, 206, range);
  assert.equal(response.headers.get('content-range'), `bytes ${start}-${end}/${audioBytes.length}`, range);
  assert.equal(response.headers.get('content-length'), String(end - start + 1), range);
  assert.equal(response.headers.get('accept-ranges'), 'bytes', range);
  assert.equal(response.headers.get('cache-control'), 'public, max-age=60', range);
  assert.equal(response.headers.get('content-type'), 'audio/mpeg', range);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), audioBytes.subarray(start, end + 1), range);
}
for (const range of [`bytes=${audioBytes.length}-`, 'bytes=10-1', 'bytes=-0', 'bytes=0-1,4-5', 'invalid']) {
  const response = await worker.fetch(new Request(origin + audioPath, { headers: { Range: range } }), env);
  assert.equal(response.status, 416, range);
  assert.equal(response.headers.get('content-range'), `bytes */${audioBytes.length}`, range);
  assert.equal((await response.arrayBuffer()).byteLength, 0, range);
}
const audioHead = await worker.fetch(new Request(origin + audioPath, { method: 'HEAD', headers: { Range: 'bytes=0-99' } }), env);
assert.equal(audioHead.status, 200);
assert.equal(audioHead.headers.get('content-length'), String(audioBytes.length));
assert.equal(audioHead.headers.get('accept-ranges'), 'bytes');
assert.equal((await audioHead.arrayBuffer()).byteLength, 0);
assert.deepEqual(Buffer.from(await (await request('/')).arrayBuffer()),
  readFileSync(resolve(root, 'index.html')));
assert.equal((await request('/', 'HEAD')).status, 200);
assert.equal((await request('/matrix-app.js?v=matrix-grid-2')).status, 200);
assert.equal((await request('/matrix-app.js', 'POST')).status, 405);
for (const path of ['/priority-review.html', '/scouter-request-diagnostic.html']) {
  const response = await request(path);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /Sign in as the site owner/);
}
// Server modules, captured evidence, database metadata and development files
// are not public assets, even if a later build accidentally includes them.
const privatePaths = [
  '/worker.js', '/source-gains.js', '/README.md', '/package.json', '/package-lock.json',
  '/.node-version', '/.github/workflows/checks.yml',
  '/assets/backgrounds/manifest.json', '/assets/music/manifest.json',
  ...readdirSync(resolve(root, 'dist/server')).filter(file => file !== 'index.js')
    .map(file => '/' + file)
    .filter(path => !delivered.has(path)),
  ...['data', 'docs', 'db', 'drizzle', 'scripts', 'tests'].flatMap(directory =>
    readdirSync(resolve(root, directory), { recursive: true, withFileTypes: true })
      .filter(entry => entry.isFile())
      .map(entry => '/' + resolve(entry.parentPath, entry.name).slice(root.length + 1)))
];
for (const path of new Set(privatePaths)) {
  for (const method of ['GET', 'HEAD']) {
    assert.equal((await request(path, method, true)).status, 404, path);
  }
}
console.log(`Compiled GET/HEAD bytes, types and caching pass for ${delivered.size} assets; private paths remain unavailable.`);
