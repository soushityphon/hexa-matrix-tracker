import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { Window } from 'happy-dom';
import { createDecorations } from '../decorations.js';

const key = 'hexa-tracker-animations-v1';
const win = new Window({ url: 'https://test.example/' });
const doc = win.document;
const control = doc.createElement('button'); doc.body.append(control);
const media = query => {
  const target = new win.EventTarget(); target.matches = false;
  target.set = value => { target.matches = value; target.dispatchEvent(new win.Event('change')); };
  return target;
};
const reduced = media(), mobile = media();
win.matchMedia = query => query.includes('reduced-motion') ? reduced : mobile;
const storageBefore = JSON.stringify({ levels: { Harmony: 6 }, owned: 60, statLines: { 'HEXA Stat I': [6,8,6] } });
win.localStorage.setItem('hexa-tracker-hoyoung-v1', storageBefore);
const boot = className => createDecorations({ document: doc, window: win, control, className });
const layers = () => [...doc.querySelectorAll('.decoration-layer')];
const count = selector => doc.querySelectorAll(selector).length;
let renderer = boot('hoyoung');
assert.equal(count('.cloud'), 5); assert.equal(count('.petal'), 0);
assert.ok(layers().every(layer => layer.getAttribute('aria-hidden') === 'true'));
assert.equal(control.getAttribute('aria-pressed'), 'true');
const original = doc.querySelector('.cloud');
renderer.setClass('hoyoung'); assert.equal(doc.querySelector('.cloud'), original);
renderer.setClass('ren');
assert.equal(count('.cloud'), 0); assert.equal(count('.decoration-background .petal'), 12);
assert.equal(count('.petal-front'), 1);
for (let i = 0; i < 50; i++) renderer.setClass(i % 2 ? 'ren' : 'hoyoung');
assert.equal(layers().length, 2); assert.equal(count('.petal'), 13);
mobile.set(true); assert.equal(count('.decoration-background .petal'), 6);
assert.equal(count('.petal-front'), 1);
const broken = doc.querySelector('.petal');
broken.querySelector('img').dispatchEvent(new win.Event('error')); assert.equal(broken.hidden, true);
const loaded = doc.querySelector('.petal-front');
loaded.querySelector('img').dispatchEvent(new win.Event('load')); assert.ok(loaded.classList.contains('is-loaded'));
control.click(); assert.equal(win.localStorage.getItem(key), 'off');
assert.ok(layers().every(layer => layer.hidden));
assert.equal(win.localStorage.getItem('hexa-tracker-hoyoung-v1'), storageBefore);
renderer.destroy(); assert.equal(layers().length, 0);
renderer = boot('ren'); assert.ok(layers().every(layer => layer.hidden));
assert.equal(count('.petal'), 0); // Saved Off does not request decoration images.
renderer.setClass('hoyoung'); control.click(); assert.equal(count('.cloud'), 3);
reduced.set(true); assert.ok(layers().every(layer => layer.hidden)); assert.equal(control.disabled, true);
assert.equal(win.localStorage.getItem(key), 'on'); // OS preference does not overwrite the choice.
reduced.set(false); assert.ok(layers().every(layer => !layer.hidden));
Object.defineProperty(doc, 'hidden', { configurable: true, value: true });
doc.dispatchEvent(new win.Event('visibilitychange'));
assert.ok(layers().every(layer => layer.classList.contains('is-paused')));
control.click();
Object.defineProperty(doc, 'hidden', { configurable: true, value: false });
doc.dispatchEvent(new win.Event('visibilitychange'));
assert.ok(layers().every(layer => layer.hidden && layer.classList.contains('is-paused')));
control.click(); assert.ok(layers().every(layer => !layer.hidden && !layer.classList.contains('is-paused')));
renderer.setClass('unknown'); assert.ok(layers().every(layer => layer.hidden)); assert.equal(count('.decoration-particle'), 0);
renderer.destroy();
const storedMediaState = reduced.matches;
reduced.set(true); renderer = boot('ren'); assert.equal(count('.petal'), 0); renderer.destroy();
reduced.set(storedMediaState);
// Storage denied: decoration control still works, with no tracker failure.
Object.defineProperty(win, 'localStorage', { configurable: true, get() { throw new Error('Storage denied'); } });
renderer = boot('hoyoung'); control.click(); assert.ok(layers().every(layer => layer.hidden));
renderer.destroy(); assert.equal(layers().length, 0);
await win.happyDOM.abort();

// Test actual compiled Worker delivery, not just files copied into a directory.
execFileSync(process.execPath, ['scripts/build-worker.mjs'], { cwd: new URL('..', import.meta.url), stdio: 'pipe' });
const worker = (await import('../dist/server/index.js')).default;
const manifest = JSON.parse(readFileSync(new URL('../assets/backgrounds/manifest.json', import.meta.url)));
assert.equal(manifest.length, 23);
for (const asset of manifest) {
  const bytes = readFileSync(new URL('../' + asset.path, import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256);
  const response = await worker.fetch(new Request('https://test.example/' + asset.path), {});
  assert.equal(response.status, 200); assert.equal(response.headers.get('content-type'), 'image/png');
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
  const head = await worker.fetch(new Request('https://test.example/' + asset.path, { method: 'HEAD' }), {});
  assert.equal(head.status, 200); assert.equal((await head.arrayBuffer()).byteLength, 0);
}
for (const path of ['decorations.js', 'decoration-assets.js', 'decorations.css']) {
  const response = await worker.fetch(new Request('https://test.example/' + path), {});
  assert.equal(response.status, 200);
  assert.equal(await response.text(), readFileSync(new URL('../' + path, import.meta.url), 'utf8'));
}
assert.equal((await worker.fetch(new Request('https://test.example/assets/backgrounds/missing.png'), {})).status, 404);
assert.equal((await worker.fetch(new Request('https://test.example/assets/backgrounds/manifest.json'), {})).status, 404);
console.log('Decorations lifecycle, preferences, original PNG hashes and compiled Worker delivery pass.');
