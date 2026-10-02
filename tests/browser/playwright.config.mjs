import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';

export default defineConfig({
  testDir: '.',
  testMatch: 'rendered.spec.mjs',
  timeout: 30000,
  workers: 1,
  retries: 0,
  maxFailures: 3,
  globalTimeout: 180000,
  reporter: [['list'], ['html', { outputFolder: resolve(import.meta.dirname, '../../browser-report'), open: 'never' }]],
  outputDir: resolve(import.meta.dirname, '../../browser-results'),
  use: { baseURL: 'http://127.0.0.1:4173', browserName: 'chromium', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'phone', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: 'narrow-phone', use: { viewport: { width: 320, height: 800 }, isMobile: true, hasTouch: true } }
  ],
  webServer: { command: 'node tests/browser/server.mjs', cwd: resolve(import.meta.dirname, '../..'), url: 'http://127.0.0.1:4173', reuseExistingServer: false }
});
