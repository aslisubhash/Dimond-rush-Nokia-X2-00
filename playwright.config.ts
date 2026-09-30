import { defineConfig } from '@playwright/test';

/** End-to-end smoke tests against the Vite dev server (debug hooks are enabled in dev). */
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 600_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5188',
    viewport: { width: 1280, height: 720 },
    launchOptions: { args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] },
  },
  webServer: {
    command: 'npx vite --port 5188 --strictPort',
    url: 'http://localhost:5188',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
