import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { Window } from 'happy-dom';
import { createMusic } from '../music.js';

const win = new Window({ url: 'https://test.example/' });
const doc = win.document;
doc.body.innerHTML = '<label id="music"><input type="range" min="0" max="100"><output></output></label>';
const control = doc.querySelector('label'), slider = doc.querySelector('input'), output = doc.querySelector('output');
win.localStorage.setItem('hexa-tracker-ren-v1', '{"owned":60}');
let contexts = 0, plays = 0, pauses = 0, audio, gain, rejectPlay = false, pending;
const createElement = doc.createElement.bind(doc);
doc.createElement = (...args) => {
  const element = createElement(...args);
  if (args[0] === 'audio') {
    audio = element;
    element.play = () => { plays++; return rejectPlay ? Promise.reject(new Error('blocked')) : pending || Promise.resolve(); };
    element.pause = () => { pauses++; };
  }
  return element;
};
win.AudioContext = class {
  constructor() { contexts++; }
  createGain() { return gain = { gain: { value: 1 }, connect() {}, disconnect() {} }; }
  createMediaElementSource() { return { connect() {}, disconnect() {} }; }
  resume() { return Promise.resolve(); }
  close() { return Promise.resolve(); }
};
const boot = className => createMusic({ document: doc, window: win, control, slider, output, className });
const volume = value => { slider.value = String(value); slider.dispatchEvent(new win.Event('input', { bubbles: true })); };
const settle = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };
let music = boot('hoyoung');
assert.equal(control.hidden, true); assert.equal(slider.value, '0'); assert.equal(contexts, 0);
volume(50); assert.equal(plays, 0);
music.setClass('ren'); assert.equal(control.hidden, false); assert.equal(slider.value, '0');
volume(25); await settle();
assert.equal(contexts, 1); assert.equal(plays, 1); assert.equal(gain.gain.value, .25);
assert.equal(audio.loop, true); assert.equal(audio.preload, 'none');
assert.equal(audio.src, 'https://test.example/assets/music/ren-login-theme.mp3');
assert.equal(output.textContent, '25%'); assert.equal(slider.getAttribute('aria-valuetext'), '25%');
volume(100); await settle(); assert.equal(gain.gain.value, 1);
volume(0); assert.equal(gain.gain.value, 0); assert.ok(pauses > 0); assert.equal(output.textContent, 'Muted');
let resolvePlay; pending = new Promise(resolve => { resolvePlay = resolve; });
volume(40); audio.currentTime = 12;
music.setClass('hoyoung'); assert.equal(audio.currentTime, 0); assert.equal(gain.gain.value, 0);
resolvePlay(); await settle(); assert.equal(slider.value, '0'); assert.equal(control.hidden, true);
pending = null; music.setClass('ren'); assert.equal(slider.value, '0');
rejectPlay = true; volume(70); await settle(); assert.equal(slider.value, '0'); assert.equal(output.textContent, 'Retry');
rejectPlay = false; volume(30); await settle(); assert.equal(gain.gain.value, .3);
audio.dispatchEvent(new win.Event('error')); assert.equal(slider.value, '0'); assert.equal(gain.gain.value, 0);
volume(20); win.dispatchEvent(new win.Event('pagehide')); assert.equal(slider.value, '0');
assert.equal(win.localStorage.getItem('hexa-tracker-ren-v1'), '{"owned":60}');
music.destroy(); const previousPlays = plays; volume(80); assert.equal(plays, previousPlays);
music = boot('ren'); assert.equal(slider.value, '0'); assert.equal(contexts, 1); music.destroy();
delete win.AudioContext;
music = boot('ren'); volume(50); assert.equal(slider.value, '0'); music.destroy();
await win.happyDOM.abort();

execFileSync(process.execPath, ['scripts/build-worker.mjs'], { cwd: new URL('..', import.meta.url), stdio: 'pipe' });
const worker = (await import('../dist/server/index.js')).default;
const path = '/assets/music/ren-login-theme.mp3';
const bytes = readFileSync(new URL('..' + path, import.meta.url));
const manifest = JSON.parse(readFileSync(new URL('../assets/music/manifest.json', import.meta.url)));
assert.equal(createHash('sha256').update(bytes).digest('hex'), manifest.sha256);
const request = (headers = {}, method = 'GET') => worker.fetch(new Request('https://test.example' + path, { method, headers }), {});
const full = await request(); assert.equal(full.status, 200);
assert.equal(full.headers.get('content-type'), 'audio/mpeg');
assert.equal(full.headers.get('accept-ranges'), 'bytes');
assert.equal(Number(full.headers.get('content-length')), bytes.length);
assert.deepEqual(Buffer.from(await full.arrayBuffer()), bytes);
const head = await request({ Range: 'bytes=0-99' }, 'HEAD');
assert.equal(head.status, 200); assert.equal((await head.arrayBuffer()).byteLength, 0);
for (const [range, start, end] of [['bytes=0-1023', 0, 1023], ['bytes=100-', 100, bytes.length-1], ['bytes=-128', bytes.length-128, bytes.length-1], [`bytes=10-${bytes.length+100}`, 10, bytes.length-1]]) {
  const response = await request({ Range: range }); assert.equal(response.status, 206);
  assert.equal(response.headers.get('content-range'), `bytes ${start}-${end}/${bytes.length}`);
  assert.equal(Number(response.headers.get('content-length')), end-start+1);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes.subarray(start, end+1));
}
for (const range of ['bytes=99999999-', 'bytes=30-20', 'bytes=-0', 'bytes=-', 'invalid', 'bytes=0-1,3-4']) {
  const response = await request({ Range: range }); assert.equal(response.status, 416);
  assert.equal(response.headers.get('content-range'), `bytes */${bytes.length}`);
}
assert.equal((await worker.fetch(new Request('https://test.example/assets/music/manifest.json'), {})).status, 404);
assert.equal(await (await worker.fetch(new Request('https://test.example/music.js'), {})).text(), readFileSync(new URL('../music.js', import.meta.url), 'utf8'));
console.log('Music gesture, volume, class lifecycle, failures and original MP3/range delivery pass.');
