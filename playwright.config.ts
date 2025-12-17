import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Configuration for Docudent V7
 * 
 * Runs with DOCUDENT_TEST_MODE=stub_extraction for offline testing.
 * 
 * STABILITY NOTES:
 * - webServer waits for dev server to be ready
 * - retries handle transient failures
 * - actionTimeout prevents hanging on unresponsive elements
 */
export default defineConfig({
    testDir: './e2e',
    fullyParallel: false,
    forbidOnly: !!process.env.CI,

    // Retries: Always retry once to handle flakiness
    retries: process.env.CI ? 2 : 1,
    workers: 1,
    reporter: process.env.CI ? 'github' : 'list',

    // Timeout settings — generous but not infinite
    timeout: 45000,         // Per-test timeout
    expect: {
        timeout: 10000,     // Expect assertions
    },

    use: {
        baseURL: 'http://localhost:5173',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',

        // Action timeout prevents hanging on unclickable elements
        actionTimeout: 10000,

        // Navigation timeout for page.goto
        navigationTimeout: 30000,
    },

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],

    // Run local dev server with stub extraction before tests
    webServer: {
        command: 'VITE_E2E_TEST_MODE=true VITE_STUB_EXTRACTION=true npm run dev',
        url: 'http://localhost:5173/docudent/v7',
        reuseExistingServer: !process.env.CI,
        timeout: 180000,  // 3 minutes for cold start
        stdout: 'pipe',
        stderr: 'pipe',
    },
});

