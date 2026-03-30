// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 60000,
  expect: { timeout: 15000 },
  fullyParallel: false, // run sequentially so user can watch
  retries: 1,  // retry flaky page load issues (6.8MB data.js)
  use: {
    baseURL: 'http://localhost:3939',
    headless: false,     // เปิด browser ให้ดู
    launchOptions: {
      slowMo: 300,       // ช้าลง 300ms ต่อ action ให้ดูตาม
    },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1280, height: 900 },
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: {
    command: 'npx serve web -p 3939 -s',
    port: 3939,
    reuseExistingServer: true,
    timeout: 30000,
  },
});
