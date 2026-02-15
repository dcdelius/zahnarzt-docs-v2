import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Configuration for Docudent V10 (src/docudent/v10/__e2e__)
 */
export default defineConfig({
    testDir: './src/docudent/v10/__e2e__',
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 1,
    workers: 1,
    reporter: process.env.CI ? 'github' : 'list',
    timeout: 45000,
    expect: {
        timeout: 10000,
    },
    use: {
        baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        actionTimeout: 10000,
        navigationTimeout: 20000,
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: process.env.PLAYWRIGHT_NO_WEBSERVER !== '1' ? {
        command: 'VITE_E2E_BYPASS_AUTH=1 VITE_STUB_EXTRACTION=true npm run build && npm run preview -- --host 127.0.0.1 --port 4173',
        url: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173',
        reuseExistingServer: !process.env.CI,
        timeout: 180000,
        stdout: 'pipe',
        stderr: 'pipe',
    } : undefined,
});
