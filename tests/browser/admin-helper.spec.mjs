import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

test('Admin Helper text entry, safe preview and conflict retention',async({page})=>{
  const row={coreId:'masteryCore1',source:{coreId:'masteryCore1',sourceName:'Harmony',icon:'https://maplescouter.com/hexaskill/Hoyeong_2.png'},name:'Harmony',shortName:'Harmony',category:'Mastery',tag:'M1'};
  let saved={schema:1,job:'호영',rows:[row]},conflict=false;
  await page.route('https://maplescouter.com/**',route=>route.abort());
  await page.route('**/priority-review.html',route=>route.fulfill({contentType:'text/html',body:readFileSync(new URL('../../priority-review.html',import.meta.url),'utf8')}));
  await page.route('**/api/admin-panel**',async route=>{
    if(route.request().method()==='PUT') {
      if(conflict)return route.fulfill({status:409,body:'Skills changed in another tab. Your edits are still here. Load latest skills to review the saved version.'});
      saved=route.request().postDataJSON();return route.fulfill({json:{saved:true,skillsRevision:'b'.repeat(64)}});
    }
    return route.fulfill({json:{drafts:{},priorityRevisions:{},invalidRecords:[],skills:saved,skillsRevision:'a'.repeat(64)}});
  });
  await page.goto('/priority-review.html');
  const input=page.getByLabel('Helper explanation',{exact:true});
  await expect(input).toBeVisible();
  await input.fill('First **bold**');await input.press('End');await input.press('Enter');await input.pressSequentially('Second <img src=x onerror=alert(1)>');
  const text='First **bold**\nSecond <img src=x onerror=alert(1)>';
  await expect(input).toHaveValue(text);
  const preview=page.locator('.helper-content-preview');
  await expect(preview.locator('strong').first()).toHaveText('M1 · Harmony');
  await expect(preview.locator('div').last().locator('strong')).toHaveText('bold');
  await expect(preview.locator('br')).toHaveCount(1);
  await expect(preview.locator('img[onerror]')).toHaveCount(0);
  await expect(preview).toContainText('<img src=x onerror=alert(1)>');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
  await page.getByRole('button',{name:'Save skills',exact:true}).click();
  await expect(page.locator('#status')).toContainText('Skills saved');
  expect(saved.rows[0].helperExplanation).toBe(text);
  conflict=true;await input.fill('Unsaved explanation');
  await page.getByRole('button',{name:'Save skills',exact:true}).click();
  await expect(page.locator('#status')).toContainText('changed in another tab');
  await expect(input).toHaveValue('Unsaved explanation');
  await page.screenshot({path:test.info().outputPath('admin-helper.png'),fullPage:true});
});
