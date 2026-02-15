import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Configuration for Docudent V10
 * 
 * AUTH BYPASS:
 * VITE_E2E_BYPASS_AUTH=1 enables app-side auth bypass:
 * - Firebase auth skipped entirely
 * - Mock user: e2e@local.test / E2E Test User
 * - No IndexedDB token persistence issues
 * 
 * This is the recommended approach for Playwright E2E stability.
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173';
const enableWebServer = process.env.PLAYWRIGHT_NO_WEBSERVER !== '1';

export default defineConfig({
    testDir: './e2e',
    fullyParallel: false,
    forbidOnly: !!process.env.CI,

    // Retries: 1 is sufficient with auth bypass (no login latency)
    retries: process.env.CI ? 1 : 1,
    workers: 1,
    reporter: process.env.CI ? 'github' : 'list',

    // Timeout settings — can be tighter with auth bypass
    timeout: 45000,
    expect: {
        timeout: 10000,
    },

    use: {
        baseURL,
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

    // Build with auth bypass enabled.
    // IMPORTANT: Use stub extraction for deterministic E2E runs (no external LLM dependency).
    webServer: enableWebServer ? {
        command: 'VITE_E2E_BYPASS_AUTH=1 VITE_STUB_EXTRACTION=true npm run build && npm run preview -- --host 127.0.0.1 --port 4173',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180000,
        stdout: 'pipe',
        stderr: 'pipe',
    } : undefined,
});
