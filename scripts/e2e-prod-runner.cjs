/**
 * M71: E2E Production Runner
 * 
 * Deterministic CI script that:
 * 1. Builds the app
 * 2. Starts preview server on known port
 * 3. Runs Playwright E2E tests
 * 4. Shuts down cleanly
 * 
 * Usage:
 *   node scripts/e2e-prod-runner.cjs
 *   npm run test:e2e:prod
 */

const { spawn, execSync } = require('child_process');
const http = require('http');

const PREVIEW_PORT = 4173;
const PREVIEW_HOST = 'localhost';
const MAX_WAIT_MS = 60000;
const POLL_INTERVAL_MS = 1000;

function log(msg) {
    console.log(`[E2E-PROD] ${new Date().toISOString()} - ${msg}`);
}

function waitForServer(port, host, maxWait) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();

        function check() {
            const req = http.get(`http://${host}:${port}`, (res) => {
                resolve();
            });
            req.on('error', () => {
                if (Date.now() - startTime > maxWait) {
                    reject(new Error(`Server did not start within ${maxWait}ms`));
                } else {
                    setTimeout(check, POLL_INTERVAL_MS);
                }
            });
            req.end();
        }

        check();
    });
}

async function main() {
    let previewProcess = null;
    let exitCode = 0;

    try {
        // Step 1: Build
        log('Building production bundle...');
        execSync('npm run build', { stdio: 'inherit' });
        log('Build complete.');

        // Step 2: Start preview server
        log(`Starting preview server on port ${PREVIEW_PORT}...`);
        previewProcess = spawn('npm', ['run', 'preview', '--', '--port', String(PREVIEW_PORT)], {
            stdio: 'pipe',
            detached: false,
        });

        previewProcess.stdout.on('data', (data) => {
            if (process.env.DEBUG) console.log(`[preview] ${data}`);
        });
        previewProcess.stderr.on('data', (data) => {
            if (process.env.DEBUG) console.error(`[preview] ${data}`);
        });

        // Wait for server to be ready
        await waitForServer(PREVIEW_PORT, PREVIEW_HOST, MAX_WAIT_MS);
        log('Preview server ready.');

        // Step 3: Run Playwright tests
        log('Running Playwright E2E tests...');
        try {
            execSync(
                `npx playwright test src/docudent/v10/__e2e__/v10-prod-repro.e2e.spec.ts --reporter=list`,
                {
                    stdio: 'inherit',
                    env: {
                        ...process.env,
                        BASE_URL: `http://${PREVIEW_HOST}:${PREVIEW_PORT}`,
                    },
                }
            );
            log('E2E tests passed.');
        } catch (e) {
            log('E2E tests FAILED.');
            exitCode = 1;
        }

    } catch (e) {
        log(`Error: ${e.message}`);
        exitCode = 2;
    } finally {
        // Step 4: Cleanup
        if (previewProcess) {
            log('Shutting down preview server...');
            previewProcess.kill('SIGTERM');
            // Give it a moment to shut down gracefully
            await new Promise(resolve => setTimeout(resolve, 1000));
            try {
                previewProcess.kill('SIGKILL');
            } catch {
                // Already dead
            }
        }
        log(`Finished with exit code ${exitCode}.`);
    }

    process.exit(exitCode);
}

main();
