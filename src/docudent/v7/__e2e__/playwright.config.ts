import { defineConfig, devices } from '@playwright/test';

/**
 * V7 Playwright E2E Configuration
 * 
 * Run: npm run test:v7:e2e
 * 
 * Artifacts on failure:
 * - Screenshots: test-results/
 * - Videos: test-results/
 * - Traces: test-results/
 */
export default defineConfig({
    testDir: '.',
    fullyParallel: false, // Sequential for stability
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1, // Single worker for determinism
    reporter: [
        ['html', { outputFolder: 'playwright-report' }],
        ['list'],
    ],

    // Artifact collection
    use: {
        // BaseURL is determined by webServer config (port 5173 dev, 4173 preview)
        baseURL: process.env.PLAYWRIGHT_DEV === 'true'
            ? 'http://localhost:5173'
            : 'http://localhost:4173',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',

        // Collect console errors
        contextOptions: {
            logger: {
                isEnabled: () => true,
                log: (name, severity, message) => {
                    if (severity === 'error') {
                        console.error(`[Browser ${name}] ${message}`);
                    }
                },
            },
        },
    },

    // Projects
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],

    // Web server — supports both dev and preview modes
    // DEV mode: faster for local testing (set PLAYWRIGHT_DEV=true)
    // PROD mode: uses build + preview for CI (default)
    webServer: {
        // IMPORTANT: env vars must be prefixed to command for Vite to inline during build
        command: process.env.PLAYWRIGHT_DEV === 'true'
            ? 'VITE_STUB_EXTRACTION=true npm run dev -- --port 5173 --strictPort --host localhost'
            : 'VITE_STUB_EXTRACTION=true npm run build && npm run preview -- --port 4173 --strictPort --host localhost',
        url: process.env.PLAYWRIGHT_DEV === 'true'
            ? 'http://localhost:5173'
            : 'http://localhost:4173',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
        stdout: 'pipe',
        stderr: 'pipe',
    },

    // Timeouts - increased for full pipeline tests
    timeout: 60 * 1000, // 60s per test
    expect: {
        timeout: 15 * 1000,
    },

    // Output directory
    outputDir: 'test-results/',
});
