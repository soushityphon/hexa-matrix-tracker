import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fixtures, progress } from './fixtures.mjs';

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
    const scale = await page.evaluate(() => visualViewport?.scale || 1);
    const targets = await page.locator('#class,#patch,#view-tracker,#view-infographic,#animations,#owned,#perday,#erdaRequest,#epicDungeon,.node-row input,.toggle,.world-picker label,.save-actions button,.fd-info,.kofi-link,.stat-select,.stat-cancel:not([hidden])').evaluateAll((nodes, scale) => nodes.map(node => {
      const b = node.getBoundingClientRect();
      const hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
      return { label: node.getAttribute('aria-label') || node.textContent.trim(), width: b.width, height: b.height, scale, scaledWidth: b.width * scale, scaledHeight: b.height * scale,
        visible: b.width > 0 && b.height > 0, inViewport: b.top >= 0 && b.bottom <= innerHeight,
        unobscured: hit === node || node.contains(hit) };
    }), scale);
    await info.attach('pointer-targets.json', { body: JSON.stringify(targets, null, 2), contentType: 'application/json' });
    // Record compact accepted controls, without imposing a new 44px layout.
    for (const target of targets.filter(target => target.visible)) {
      // Associated row/label controls remain compact on fine-pointer desktops.
      if (info.project.use.hasTouch) {
        expect(target.width, target.label).toBeGreaterThanOrEqual(24);
        expect(target.height, target.label).toBeGreaterThanOrEqual(24);
      }
      if (info.project.use.hasTouch) {
        expect(target.scaledWidth, target.label).toBeGreaterThanOrEqual(24);
        expect(target.scaledHeight, target.label).toBeGreaterThanOrEqual(24);
      }
      if (target.inViewport) expect(target.unobscured, target.label).toBe(true);
    }
    await page.locator('#view-infographic').click();
    const tile = page.locator('.checkpoint:not(.completed):not(:disabled)').first();
    const key = await tile.getAttribute('data-checkpoint');
    const before = await page.evaluate(job => JSON.parse(localStorage.getItem('hexa-tracker-' + job + '-v1')), job);
    if (info.project.use.hasTouch) await tile.tap(); else await tile.click();
    await expect.poll(() => page.evaluate(job => JSON.parse(localStorage.getItem('hexa-tracker-' + job + '-v1')).levels, job)).not.toEqual(before.levels);
    const changed = await page.evaluate(job => JSON.parse(localStorage.getItem('hexa-tracker-' + job + '-v1')), job);
    expect(changed.levels).not.toEqual(before.levels);
    expect(changed.owned).toBe(before.owned);
    const undo = page.locator(`.checkpoint[data-checkpoint='${key}']`);
    if (info.project.use.hasTouch) await undo.tap(); else await undo.click();
    await expect.poll(() => page.evaluate(job => JSON.parse(localStorage.getItem('hexa-tracker-' + job + '-v1')).levels, job)).toEqual(before.levels);
    const after = await page.evaluate(job => JSON.parse(localStorage.getItem('hexa-tracker-' + job + '-v1')), job);
    expect(after.levels).toEqual(before.levels);
    expect(after.owned).toBe(before.owned);
  });
  test(job + ' Stat cancel edges, editor separation and Undo', async ({ page }, info) => {
    await open(page, job);
    const card = page.locator('[data-stat-selector="HEXA Stat I"]');
    const cancel = card.locator('.stat-cancel');
    await cancel.scrollIntoViewIfNeeded();
    const box = await cancel.boundingBox();
    expect(box.width).toBe(32); expect(box.height).toBe(32);
    const saved = () => page.evaluate(job => JSON.parse(localStorage.getItem('hexa-tracker-' + job + '-v1')), job);
    const before = await saved();
    for (const position of [{ x: 2, y: 2 }, { x: 30, y: 2 }, { x: 2, y: 30 }, { x: 30, y: 30 }]) {
      if (info.project.use.hasTouch) await cancel.tap({ position }); else await cancel.click({ position });
      await expect(cancel).not.toBeVisible();
      await expect(card.locator('.stat-select')).toHaveAttribute('aria-expanded', 'false');
      await expect.poll(async () => (await saved()).statUnlocked['HEXA Stat I']).toBe(false);
      expect((await saved()).owned).toBe(before.owned);
      await page.locator('#undo-progress').click();
      await expect(cancel).toBeVisible();
      await expect.poll(async () => (await saved()).statUnlocked).toEqual(before.statUnlocked);
      expect((await saved()).statLines).toEqual(before.statLines);
      expect((await saved()).levels).toEqual(before.levels);
    }
    if (info.project.use.hasTouch) await card.locator('.stat-select').tap(); else await card.locator('.stat-select').click();
    await expect(card.locator('.stat-select')).toHaveAttribute('aria-expanded', 'true');
    await expect(cancel).toBeVisible();
    await fit(page);
    await shot(page, info, job + '-stat-touch-targets');
  });
  test(job + ' views, switches, saved hidden progress and overflow', async ({ page }, info) => {
    await open(page, job);
    await fit(page);
    await shot(page, info, job + '-tracker');
    const before = await page.locator('[data-node]').evaluateAll(nodes => Object.fromEntries(nodes.map(n => [n.dataset.node, n.value])));
    await page.locator('#patch').selectOption('qa_hidden');
    await expect(page.locator('#patch')).toHaveValue('qa_hidden');
    const hiddenSkill = job === 'ren' ? 'ren_reinCore1' : 'Tiger';
    await expect(page.locator(`[data-node="${hiddenSkill}"]`)).not.toBeVisible();
    expect(await page.evaluate(({ job, hiddenSkill }) => JSON.parse(localStorage.getItem('hexa-tracker-' + job + '-v1')).levels[hiddenSkill], { job, hiddenSkill })).toBe(6);
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
    await expect(page.locator('.checkpoint.completed:visible')).toHaveCount(0);
    await fit(page);
    await page.locator('#infographic-hide').uncheck();
    await expect(page.locator('.checkpoint.completed:visible')).toHaveCount(completed);
    const other = job === 'ren' ? 'hoyoung' : 'ren';
    await page.locator('#class').selectOption(other);
    await expect(page.locator(`[data-node="${fixtures[other].model.nodes[0].short}"]`)).toHaveCount(1);
    await page.locator('#class').selectOption(job);
    await expect(page.locator('#class')).toHaveValue(job);
    await expect(page.locator(`[data-node="${fixtures[job].model.nodes[0].short}"]`)).toHaveCount(1);
    expect(await page.locator('[data-node]').evaluateAll(nodes => Object.fromEntries(nodes.map(n => [n.dataset.node, n.value])))).toEqual(before);
    await fit(page);
  });
  test(job + ' long names and failed icons', async ({ page }, info) => {
    const longName = 'Very long reviewed skill name with more words and a longunbrokentextlabel';
    await page.route('**/api/tracker-catalogue*', async route => {
      const response = await route.fetch();
      const model = await response.json();
      for (const node of model.nodes) {
        node.name = longName;
        node.shortName = node.name;
      }
      await route.fulfill({ json: model });
    });
    await page.route('**/api/priority-preview*', async route => {
      const response = await route.fetch();
      const data = await response.json();
      for (const draft of Object.values(data.drafts)) {
        draft.names = Object.fromEntries([...new Set([...Object.keys(draft.names || {}), ...draft.steps.map(step => step.skill)])].map(skill => [skill, longName]));
        draft.shortNames = { ...draft.names };
      }
      await route.fulfill({ json: data });
    });
    await page.unroute('https://**/*');
    await page.route('https://**/*', route => route.abort());
    await open(page, job);
    await fit(page);
    await expect(page.locator('.node-row:visible .node-name').first()).toHaveText(longName);
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
  test(job + ' known focus loss after native browser-chrome cycle', async ({ page }) => {
    // Issue #30: focus-triggered priority rebuilding disconnects the modal opener.
    // Keep the desired behaviour executable until the later rendering/focus batch fixes it.
    test.fail(true, 'Known Issue #30 priority refresh loses the FD opener after a browser-chrome focus cycle');
    await open(page, job);
    const fd = page.locator('#priority [data-fd-note]').first();
    await fd.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#fd-explanation-close')).toBeFocused();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(page.locator('#fd-explanation-close')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('#fd-explanation')).not.toBeVisible();
    await expect(fd).toBeFocused();
  });

}
