import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { progress } from './fixtures.mjs';

const icon = readFileSync(new URL('../../assets/sol-erda.png', import.meta.url));

test('real MP3 gesture, gain, native loop and class silence', async ({ page }, info) => {
  // Observe real browser objects, without replacing playback, decoding or clocks.
  await page.addInitScript(saves => {
    for (const [job, save] of Object.entries(saves)) {
      const key = 'hexa-tracker-' + job + '-v1';
      if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(save));
    }
    window.musicProbe = { audio: null, context: null, gain: null, analyser: null };
    const create = document.createElement.bind(document);
    document.createElement = (...args) => {
      const element = create(...args);
      if (args[0] === 'audio') window.musicProbe.audio = element;
      return element;
    };
    const createGain = AudioContext.prototype.createGain;
    AudioContext.prototype.createGain = function (...args) {
      const node = createGain.apply(this, args);
      Object.assign(window.musicProbe, { context: this, gain: node, analyser: this.createAnalyser() });
      node.connect(window.musicProbe.analyser);
      return node;
    };
  }, progress);
  await page.route('https://**/*', route => route.fulfill({ contentType: 'image/png', body: icon }));
  const requests = [];
  page.on('request', request => { if (request.url().includes('/assets/music/')) requests.push(request.url()); });
  await page.goto('/');
  await page.locator('#class').selectOption('ren');
  await expect(page.locator('[data-node]:visible').first()).toBeVisible();
  const slider = page.locator('#music-volume');
  await expect(slider).toHaveValue('0');
  await expect(page.locator('#music-level')).toHaveText('Muted');
  expect(await page.evaluate(() => musicProbe.audio)).toBeNull();
  expect(requests).toEqual([]);
  const saves = () => page.evaluate(() => Object.fromEntries(['hoyoung', 'ren'].map(job => [job, JSON.parse(localStorage.getItem('hexa-tracker-' + job + '-v1'))])));
  const before = await saves();
  const state = () => page.evaluate(() => {
    const { audio, context, gain, analyser } = musicProbe;
    const samples = new Float32Array(analyser?.fftSize || 0);
    analyser?.getFloatTimeDomainData(samples);
    return { paused: audio?.paused, time: audio?.currentTime, duration: audio?.duration,
      context: context?.state, gain: gain?.gain.value,
      rms: samples.length ? Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length) : 0 };
  });
  // Native range pointer gesture, including touch in the emulated phone projects.
  const box = await slider.boundingBox();
  if (info.project.use.hasTouch) await slider.tap({ position: { x: box.width * .6, y: box.height / 2 } });
  else await slider.click({ position: { x: box.width * .6, y: box.height / 2 } });
  await expect.poll(async () => (await state()).time).toBeGreaterThan(.1);
  await expect.poll(async () => (await state()).rms).toBeGreaterThan(.0001);
  expect((await state()).context).toBe('running');
  expect((await state()).gain).toBeGreaterThan(0);
  expect((await state()).duration).toBeGreaterThan(60);
  const started = await state();

  // Seek near the actual end, then let the browser perform its native loop.
  // This verifies a decoded loop boundary, not a full-duration listening test.
  await page.evaluate(() => { musicProbe.audio.currentTime = musicProbe.audio.duration - .5; });
  await expect.poll(async () => (await state()).time).toBeGreaterThan(60);
  await expect.poll(async () => (await state()).time).toBeLessThan(3);
  await expect.poll(async () => (await state()).rms).toBeGreaterThan(.0001);
  expect((await state()).paused).toBe(false);

  await slider.press('Home');
  await expect(slider).toHaveValue('0');
  await expect(page.locator('#music-level')).toHaveText('Muted');
  await expect.poll(async () => (await state()).rms).toBe(0);
  expect((await state()).paused).toBe(true);
  expect((await state()).gain).toBe(0);
  await slider.press('End');
  await expect.poll(async () => (await state()).rms).toBeGreaterThan(.0001);
  await page.locator('#class').selectOption('hoyoung');
  await expect(page.locator('#music-control')).toBeHidden();
  expect((await state()).paused).toBe(true);
  expect((await state()).time).toBe(0);
  expect((await state()).gain).toBe(0);
  await page.locator('#class').selectOption('ren');
  await expect(page.locator('[data-node]:visible').first()).toBeVisible();
  await expect(slider).toHaveValue('0');
  expect((await state()).paused).toBe(true);
  expect(await saves()).toEqual(before);
  await slider.press('End');
  await expect.poll(async () => (await state()).rms).toBeGreaterThan(.0001);
  await page.reload();
  await expect(page.locator('[data-node]:visible').first()).toBeVisible();
  await expect(slider).toHaveValue('0');
  expect(await page.evaluate(() => musicProbe.audio)).toBeNull();
  expect(await saves()).toEqual(before);
  await info.attach('real-browser-audio.json', { body: JSON.stringify({ started, requests, checks: ['gesture decode and advancing clock', 'nonzero post-gain signal', 'native loop after end seek', 'mute and resume', 'class rewind and silence', 'reload muted', 'both class saves unchanged'], limitations: 'Headless Chromium, phone emulation and accelerated end seek. Does not establish speaker output, physical iOS/Android or a full-duration audible loop.' }, null, 2), contentType: 'application/json' });
});
