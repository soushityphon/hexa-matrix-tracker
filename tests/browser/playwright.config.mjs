import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'rendered.spec.mjs',
  timeout: 30000,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'browser-report', open: 'never' }]],
  outputDir: 'browser-results',
  use: { baseURL: 'http://127.0.0.1:4173', browserName: 'chromium', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'phone', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: 'narrow-phone', use: { viewport: { width: 320, height: 800 }, isMobile: true, hasTouch: true } }
  ],
  webServer: { command: 'node tests/browser/server.mjs', url: 'http://127.0.0.1:4173', reuseExistingServer: false }
});
