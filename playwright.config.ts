import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  use: {
    baseURL: 'http://127.0.0.1:3001/',
    trace: 'on-first-retry',
    launchOptions: {
      executablePath: '/home/lg/workspace/projects/AdeusMultas-Defesa-/PnboxAi/.playwright-browsers/chromium_headless_shell-1155/chrome-linux/headless_shell',
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    },
  },
});