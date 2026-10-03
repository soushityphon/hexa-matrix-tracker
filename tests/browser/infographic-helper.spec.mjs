import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {fixtures,progress} from './fixtures.mjs';
const icon=readFileSync(new URL('../../assets/sol-erda.png',import.meta.url));
for(const job of ['hoyoung','ren'])test(job+' desktop hover Helper and no-hover phone exclusion',async({page},info)=>{
  await page.route('https://**/*',route=>route.fulfill({contentType:'image/png',body:icon}));
  const data=structuredClone(fixtures);
  data[job].model.nodes[1].helperExplanation='Helpful **detail**\nText <script>stays text</script>\n'+('Long readable explanation line.\n'.repeat(70));
  await page.route('**/api/tracker-catalogue**',route=>{
    const selected=new URL(route.request().url()).searchParams.get('job')==='렌'?'ren':'hoyoung';
    return route.fulfill({json:data[selected].model});
  });
  await page.addInitScript(saves=>{for(const [key,value] of Object.entries(saves)){const name='hexa-tracker-'+key+'-v1';if(localStorage.getItem(name)===null)localStorage.setItem(name,JSON.stringify(value));}},progress);
  await page.goto('/');await page.locator('#class').selectOption(job);
  await expect(page.locator('[data-node]:visible').first()).toBeVisible();await page.locator('#view-infographic').click();
  const control=page.locator('#infographic-helper'),panel=page.locator('#helper-panel'),grid=page.locator('#infographic-grid');
  if(info.project.name!=='desktop'){
    await expect(page.locator('.helper-control')).toBeHidden();await expect(control).toBeDisabled();await expect(panel).toBeHidden();
    const beforeTouch=await page.evaluate(job=>localStorage.getItem('hexa-tracker-'+job+'-v1'),job);
    await grid.locator('[data-checkpoint]').first().hover();await expect(panel).toBeHidden();await expect(grid.locator('.skill-hover')).toHaveCount(0);
    expect(await page.evaluate(()=>localStorage.getItem('hexa-tracker-helper-v1'))).toBeNull();
    expect(await page.evaluate(job=>localStorage.getItem('hexa-tracker-'+job+'-v1'),job)).toBe(beforeTouch);
    await page.locator('#class').selectOption(job==='hoyoung'?'ren':'hoyoung');await expect(page.locator('.helper-control')).toBeHidden();
    await page.screenshot({path:info.outputPath('helper-excluded-phone.png'),fullPage:false});await expect(page.locator('.helper-control')).toBeHidden();return;
  }
  expect(await grid.locator('[data-checkpoint][title]').count()).toBe(0);
  await expect(grid.locator('[data-checkpoint]').first()).toHaveAttribute('aria-label',/level.*complete/i);
  await expect(control).toBeChecked();await expect(panel).toBeHidden();
  expect(await page.locator('.summary-panel #helper-panel').count()).toBe(0);
  const geometry=()=>page.locator('.summary-panel').evaluate(node=>({height:node.getBoundingClientRect().height,columns:getComputedStyle(node.querySelector('.summary-metrics')).gridTemplateColumns}));
  const summary=await geometry();
  const before=await page.evaluate(job=>localStorage.getItem('hexa-tracker-'+job+'-v1'),job);
  const previewSkill=data[job].model.nodes[1].short,tiles=grid.locator('[data-skill="'+previewSkill+'"]');
  await tiles.first().hover();await expect(panel).toBeVisible();await expect(panel).toHaveAttribute('data-skill',previewSkill);
  await expect(grid.locator('.skill-hover')).toHaveCount(await tiles.count());
  await expect(panel.locator('.helper-explanation strong')).toHaveText('detail');await expect(panel.locator('script')).toHaveCount(0);
  await expect(panel.locator('[data-location]')).toHaveCount(18);await expect(panel.locator('[data-target="true"]')).toHaveCount(1);
  const quadrantFills=await panel.evaluate(node=>['skill','mastery','enhancement','common'].map(category=>getComputedStyle(node.querySelector('.matrix-'+category)).fill));
  expect(quadrantFills).toEqual(['rgb(85, 34, 204)','rgb(136, 34, 102)','rgb(51, 102, 153)','rgb(102, 102, 153)']);
  expect(await geometry()).toEqual(summary);
  const bounds=await panel.evaluate(node=>{const p=node.getBoundingClientRect(),l=node.querySelector('.helper-location').getBoundingClientRect(),h=node.querySelector('.helper-heading').getBoundingClientRect(),t=node.querySelector('.helper-explanation').getBoundingClientRect();return {left:p.left,top:p.top,right:p.right,bottom:p.bottom,width:innerWidth,height:innerHeight,order:l.bottom<=h.top && h.bottom<=t.top};});
  expect(bounds.right-bounds.left).toBeCloseTo(460,0);expect(bounds.order).toBe(true);expect(bounds.left).toBeGreaterThanOrEqual(0);expect(bounds.top).toBeGreaterThanOrEqual(0);expect(bounds.right).toBeLessThanOrEqual(bounds.width);expect(bounds.bottom).toBeLessThanOrEqual(bounds.height);
  // Real pointer transfer across the small gap, then wheel scrolling inside text.
  const box=await panel.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
  await expect(panel).toBeVisible();await panel.locator('.helper-explanation').hover();await page.mouse.wheel(0,150);
  await expect.poll(()=>panel.evaluate(node=>node.scrollTop+node.querySelector('.helper-explanation').scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(job=>localStorage.getItem('hexa-tracker-'+job+'-v1'),job)).toBe(before);
  await page.screenshot({path:info.outputPath('helper-popup.png'),fullPage:false});await expect(panel).toBeVisible();
  await page.locator('.summary-panel h2').hover();await expect(panel).toBeHidden();await expect(grid.locator('.skill-hover')).toHaveCount(0);
  // A Stat uses its existing numbered icon, with no guessed Matrix coordinates.
  const stat=grid.locator('[data-skill="HEXA Stat II"]').first();await stat.hover();await expect(panel).toBeVisible();await expect(panel.locator('.helper-location')).toBeHidden();await expect(panel.locator('.helper-stat-icon')).toHaveCount(0);await expect(panel.locator('.helper-heading img')).toHaveAttribute('src','assets/hexa-stats/stat-2-unlocked.png');await expect(panel.locator('.helper-heading')).toContainText('HEXA Stat II');await page.screenshot({path:info.outputPath('helper-stat-compact.png'),fullPage:false});await expect(panel).toBeVisible();await expect(panel.locator('[data-location]')).toHaveCount(0);
  await page.keyboard.press('Escape');await expect(panel).toBeHidden();
  // Use the actual next checkpoint and existing reverse Undo, with no automatic guide.
  const first=grid.locator('[aria-current="step"]'),checkpoint=await first.getAttribute('data-checkpoint');
  await first.click();await expect(panel).toBeHidden();await grid.locator('[data-checkpoint='+JSON.stringify(checkpoint)+']').click();await expect(panel).toBeHidden();
  const restored=JSON.parse(await page.evaluate(job=>localStorage.getItem('hexa-tracker-'+job+'-v1'),job));
  const original=JSON.parse(before),{infographicUndo:originalUndo,...originalProgress}=original,{infographicUndo:restoredUndo,...restoredProgress}=restored;
  expect(restoredProgress).toEqual(originalProgress);
  // Existing Undo keeps empty source-scoped bookkeeping after restoring the save.
  expect(Object.values(restoredUndo || {}).flatMap(history=>Object.values(history.skills || {})).flat()).toHaveLength(0);
  const restoredSummary=await geometry();
  await control.uncheck();await tiles.first().hover();await expect(grid.locator('.skill-hover')).toHaveCount(await tiles.count());await expect(panel).toBeHidden();expect(await geometry()).toEqual(restoredSummary);
  await page.reload();await expect(control).not.toBeChecked();await expect(panel).toBeHidden();expect(await geometry()).toEqual(restoredSummary);
  await page.locator('#class').selectOption(job==='hoyoung'?'ren':'hoyoung');await expect(control).toBeDisabled();await expect(page.locator('#helper-support')).toContainText('Not supported');expect(await page.evaluate(()=>localStorage.getItem('hexa-tracker-helper-v1'))).toBe('false');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
});
