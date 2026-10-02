import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {progress} from './fixtures.mjs';

const icon=readFileSync(new URL('../../assets/sol-erda.png',import.meta.url));
test.beforeEach(async({page})=>{
  await page.route('https://**/*',route=>route.fulfill({contentType:'image/png',body:icon}));
  await page.addInitScript(saves=>{
    for(const [job,save] of Object.entries(saves))localStorage.setItem('hexa-tracker-'+job+'-v1',JSON.stringify(save));
  },progress);
});
for(const job of ['hoyoung','ren']) {
  test(job+' focus uses fresh cache and refresh status does not move panels',async({page})=>{
    await page.goto('/');await page.locator('#class').selectOption(job);
    await expect(page.locator('#owned')).toBeEnabled();
    const panels=()=>page.locator('.toolbar,.matrix-panel,.priority-panel').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().top));
    const before=await panels();
    let requests=0,release;
    const gate=new Promise(resolve=>{release=resolve;});
    await page.route('**/api/**',async route=>{requests++;await gate;await route.continue();});
    await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
    await expect(page.locator('#owned')).toBeEnabled();
    expect(requests).toBe(0);expect(await panels()).toEqual(before);
    await page.clock.setFixedTime(new Date(Date.now()+31000));
    await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
    await expect(page.locator('#owned')).toBeDisabled();
    await expect.poll(()=>requests).toBe(2);
    await expect(page.locator('#priority-sync')).toContainText('Refreshing data');
    await expect(page.locator('.load-status')).toHaveCSS('position','fixed');
    expect(await panels()).toEqual(before);
    const bounds=await page.locator('.load-status').evaluate(node=>{
      const box=node.getBoundingClientRect();return {left:box.left,right:box.right,bottom:box.bottom,width:innerWidth,height:innerHeight};
    });
    expect(bounds.left).toBeGreaterThanOrEqual(0);expect(bounds.right).toBeLessThanOrEqual(bounds.width);
    expect(bounds.bottom).toBeLessThanOrEqual(bounds.height);
    release();await expect(page.locator('#owned')).toBeEnabled();
    await expect(page.locator('#priority-sync')).toHaveText('');
    expect(await panels()).toEqual(before);
  });
  test(job+' Import keeps file-picker selection through focus, cancel and restore',async({page})=>{
    await page.goto('/');
    await page.locator('#class').selectOption(job);
    await expect(page.locator('#import-progress')).toBeEnabled();
    const key='hexa-tracker-'+job+'-v1',other='hexa-tracker-'+(job==='ren'?'hoyoung':'ren')+'-v1';
    const saved=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
    const original=await saved();
    const exporting=page.waitForEvent('download');
    await page.locator('#export-progress').click();
    const file=await exporting,exported=JSON.parse(await readFile(await file.path(),'utf8'));
    // Keep only this class in the validated backup to exercise replacement
    // scope as well as the real exported skill/settings identities.
    delete exported.classes[job==='ren'?'Hoyeong':'Len'];
    const buffer=Buffer.from(JSON.stringify(exported));
    const payload={name:file.suggestedFilename(),mimeType:'application/json',buffer};
    const changed=original.owned+10;
    await page.locator('#owned').fill(String(changed));
    await expect.poll(async()=>(await saved()).owned).toBe(changed);
    const otherBefore=await page.evaluate(key=>localStorage.getItem(key),other);

    async function choose(accept) {
      const picker=page.waitForEvent('filechooser');
      await page.locator('#import-progress').click();
      const chooser=await picker;
      await page.clock.setFixedTime(new Date(await page.evaluate(()=>Date.now())+31000));
      // Headless file choosers do not create an OS window. Reproduce the
      // return-focus event explicitly before native selection/change delivery.
      await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
      page.once('dialog',async dialog=>{
        expect(dialog.message()).toContain('Restore progress for');
        if(accept)await dialog.accept();else await dialog.dismiss();
      });
      await chooser.setFiles(payload);
    }
    await choose(false);
    await expect(page.locator('#backup-status')).toHaveText('Import cancelled.');
    expect((await saved()).owned).toBe(changed);
    const safetyDownload=page.waitForEvent('download');
    await choose(true);
    const safety=JSON.parse(await readFile(await(await safetyDownload).path(),'utf8'));
    expect(safety.classes[job==='ren'?'Len':'Hoyeong'].progress.owned).toBe(changed);
    await expect(page.locator('#backup-status')).toContainText('Imported');
    expect((await saved()).owned).toBe(original.owned);
    expect((await saved()).levels).toEqual(original.levels);
    expect(await page.evaluate(key=>localStorage.getItem(key),other)).toBe(otherBefore);
    await expect(page.locator('#import-progress')).toBeEnabled();
    // Cancelling the picker itself also restores ordinary focus refreshes.
    const cancelledPicker=page.waitForEvent('filechooser');
    await page.locator('#import-progress').click();await cancelledPicker;
    await page.locator('#import-progress-file').dispatchEvent('cancel');
    await page.clock.setFixedTime(new Date(await page.evaluate(()=>Date.now())+31000));
    await page.route('**/api/tracker-catalogue**',route=>route.fulfill({status:503,body:'offline'}));
    await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
    await expect(page.locator('#retry-priorities')).toBeVisible();
    expect((await saved()).owned).toBe(original.owned);
  });
}
