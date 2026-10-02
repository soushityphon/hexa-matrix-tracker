import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { progress } from './fixtures.mjs';

const icon = readFileSync(new URL('../../assets/sol-erda.png', import.meta.url));
test.beforeEach(async ({ page }) => {
  // External art is deterministic; no remote source, service or live data calls.
  await page.route('https://**/*', route => route.fulfill({ contentType: 'image/png', body: icon }));
  await page.addInitScript(saves => {
    for (const [job, save] of Object.entries(saves)) localStorage.setItem('hexa-tracker-' + job + '-v1', JSON.stringify(save));
  }, progress);
});
async function open(page, job) {
  await page.goto('/');
  await page.locator('#class').selectOption(job);
  await expect(page.locator('#priority-sync')).not.toContainText('Loading');
  await expect(page.locator('[data-node]:visible').first()).toBeVisible();
}
async function fit(page) {
  const measure = await page.evaluate(() => ({
    width: innerWidth,
    doc: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    outside: [...document.querySelectorAll('.toolbar,.panel,.site-footer,dialog[open]')].filter(node => {
      const box = node.getBoundingClientRect();
      return box.width && (box.left < -1 || box.right > innerWidth + 1);
    }).map(node => node.className || node.id)
  }));
  expect(measure.doc, JSON.stringify(measure)).toBeLessThanOrEqual(measure.width + 1);
  expect(measure.body, JSON.stringify(measure)).toBeLessThanOrEqual(measure.width + 1);
  expect(measure.outside).toEqual([]);
}
async function shot(page, testInfo, name) {
  await page.screenshot({ path: testInfo.outputPath(name + '.png'), fullPage: true });
}
for (const job of ['hoyoung', 'ren']) {
  test(job + ' pointer targets and isolated checkpoint undo', async ({ page }, info) => {
    await open(page, job);
    const targets = await page.locator('#class,#patch,#view-tracker,#view-infographic,#animations,.stat-select,.stat-cancel:not([hidden])').evaluateAll(nodes => nodes.map(node => {
      const b = node.getBoundingClientRect();
      const hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
      return { label: node.getAttribute('aria-label') || node.textContent.trim(), width: b.width, height: b.height,
        visible: b.width > 0 && b.height > 0, inViewport: b.top >= 0 && b.bottom <= innerHeight,
        unobscured: hit === node || node.contains(hit) };
    }));
    await info.attach('pointer-targets.json', { body: JSON.stringify(targets, null, 2), contentType: 'application/json' });
    // Record compact accepted controls, without imposing a new 44px layout.
    for (const target of targets.filter(target => target.visible)) {
      expect(target.width, target.label).toBeGreaterThanOrEqual(24);
      expect(target.height, target.label).toBeGreaterThanOrEqual(24);
      if (target.inViewport) expect(target.unobscured, target.label).toBe(true);
    }
    await page.locator('#view-infographic').click();
    const tile = page.locator('.checkpoint:not(.completed):not(:disabled)').first();
    const key = await tile.getAttribute('data-checkpoint');
    const before = await page.evaluate(job => JSON.parse(localStorage.getItem('hexa-tracker-' + job + '-v1')), job);
    if (info.project.use.hasTouch) await tile.tap(); else await tile.click();
    const changed = await page.evaluate(job => JSON.parse(localStorage.getItem('hexa-tracker-' + job + '-v1')), job);
    expect(changed.levels).not.toEqual(before.levels);
    expect(changed.owned).toBe(before.owned);
    const undo = page.locator(`.checkpoint[data-checkpoint='${key}']`);
    if (info.project.use.hasTouch) await undo.tap(); else await undo.click();
    const after = await page.evaluate(job => JSON.parse(localStorage.getItem('hexa-tracker-' + job + '-v1')), job);
    expect(after.levels).toEqual(before.levels);
    expect(after.owned).toBe(before.owned);
  });
  test(job + ' views, switches, saved hidden progress and overflow', async ({ page }, info) => {
    await open(page, job);
    await fit(page);
    await shot(page, info, job + '-tracker');
    const before = await page.locator('[data-node]').evaluateAll(nodes => Object.fromEntries(nodes.map(n => [n.dataset.node, n.value])));
    await page.locator('#patch').selectOption('qa_hidden');
    await expect(page.locator('#patch')).toHaveValue('qa_hidden');
    await fit(page);
    await page.locator('#patch').selectOption('qa_full');
    expect(await page.locator('[data-node]').evaluateAll(nodes => Object.fromEntries(nodes.map(n => [n.dataset.node, n.value])))).toEqual(before);
    await page.locator('.world-picker label:has(input[value="interactive"])').click();
    await expect(page.locator('[name="world"][value="interactive"]')).toBeChecked();
    await fit(page);
    await page.locator('.world-picker label:has(input[value="heroic"])').click();
    await page.locator('#view-infographic').click();
    await expect(page.locator('#infographic-grid')).toBeVisible();
    await expect(page.locator('.checkpoint')).not.toHaveCount(0);
    await fit(page);
    await shot(page, info, job + '-infographic');
    const completed = await page.locator('.checkpoint.completed').count();
    expect(completed).toBeGreaterThan(0);
    await page.locator('#infographic-hide').check();
    await expect(page.locator('.checkpoint.completed')).toHaveCount(0);
    await fit(page);
    await page.locator('#infographic-hide').uncheck();
    await expect(page.locator('.checkpoint.completed')).toHaveCount(completed);
    await page.locator('#class').selectOption(job === 'ren' ? 'hoyoung' : 'ren');
    await page.locator('#class').selectOption(job);
    await expect(page.locator('#class')).toHaveValue(job);
    await fit(page);
  });
  test(job + ' long names and failed icons', async ({ page }, info) => {
    await page.route('**/api/tracker-catalogue?*', async route => {
      const response = await route.fetch();
      const model = await response.json();
      for (const node of model.nodes) {
        node.name = 'Very long reviewed skill name with more words and a longunbrokentextlabel';
        node.shortName = node.name;
      }
      await route.fulfill({ json: model });
    });
    await page.unroute('https://**/*');
    await page.route('https://**/*', route => route.abort());
    await open(page, job);
    await fit(page);
    await shot(page, info, job + '-long-broken-tracker');
    await page.locator('#view-infographic').click();
    await fit(page);
    await expect(page.locator('.checkpoint-fallback').first()).toBeVisible();
    await shot(page, info, job + '-long-broken-infographic');
  });
  test(job + ' native FD dialog, keyboard focus and unchanged progress', async ({ page }) => {
    await open(page, job);
    const before = await page.evaluate(job => localStorage.getItem('hexa-tracker-' + job + '-v1'), job);
    const fd = page.locator('#priority [data-fd-note]').first();
    await fd.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#fd-explanation')).toBeVisible();
    await expect(page.locator('#fd-explanation-close')).toBeFocused();
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement.closest('dialog')?.id)).toBe('fd-explanation');
    await fit(page);
    await page.keyboard.press('Escape');
    await expect(page.locator('#fd-explanation')).not.toBeVisible();
    await expect(fd).toBeFocused();
    await fd.press('Space');
    await expect(page.locator('#fd-explanation')).toBeVisible();
    await page.locator('#fd-explanation-close').click();
    await expect(fd).toBeFocused();
    expect(await page.evaluate(job => localStorage.getItem('hexa-tracker-' + job + '-v1'), job)).toBe(before);
  });
}
