#!/usr/bin/env node
/**
 * E2E CI Runner
 * 
 * Starts the dev server, waits for it to be ready, runs E2E tests, then stops.
 * Designed for CI/CD environments where no server is pre-running.
 * 
 * Run: node scripts/e2e-ci-runner.cjs
 */

const { spawn, exec } = require('child_process');
const http = require('http');

const SERVER_URL = 'http://localhost:5173';
const MAX_WAIT_SECONDS = 60;
const POLL_INTERVAL_MS = 500;

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function log(msg) {
    console.log(`[E2E-CI] ${msg}`);
}

function waitForServer(url, maxSeconds) {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const maxMs = maxSeconds * 1000;

        const check = () => {
            http.get(url, (res) => {
                if (res.statusCode === 200) {
                    resolve(true);
                } else {
                    scheduleCheck();
                }
            }).on('error', () => {
                scheduleCheck();
            });
        };

        const scheduleCheck = () => {
            if (Date.now() - start > maxMs) {
                reject(new Error(`Server did not respond within ${maxSeconds}s`));
            } else {
                setTimeout(check, POLL_INTERVAL_MS);
            }
        };

        check();
    });
}

function runPlaywright() {
    return new Promise((resolve, reject) => {
        const proc = spawn('npx', ['playwright', 'test', 'e2e/smoke.spec.ts', '--reporter=list'], {
            stdio: 'inherit',
            shell: true
        });

        proc.on('close', (code) => {
            resolve(code);
        });

        proc.on('error', (err) => {
            reject(err);
        });
    });
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║              E2E CI RUNNER                                   ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║  Starting server, running tests, stopping server             ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    // Check if server is already running
    log('Checking if server is already running...');
    let serverAlreadyRunning = false;

    try {
        await waitForServer(SERVER_URL, 2);
        serverAlreadyRunning = true;
        log('✓ Server already running at ' + SERVER_URL);
    } catch {
        log('Server not running, will start it');
    }

    let serverProcess = null;

    if (!serverAlreadyRunning) {
        // Start dev server
        log('Starting dev server...');
        serverProcess = spawn('npm', ['run', 'dev'], {
            stdio: ['ignore', 'pipe', 'pipe'],
            shell: true,
            detached: false
        });

        // Capture server output for debugging
        serverProcess.stdout.on('data', (data) => {
            if (data.toString().includes('Local:')) {
                log('Server started');
            }
        });

        serverProcess.stderr.on('data', (data) => {
            // Suppress normal stderr noise
        });

        // Wait for server to be ready
        log('Waiting for server to be ready...');
        try {
            await waitForServer(SERVER_URL, MAX_WAIT_SECONDS);
            log('✓ Server is ready');
        } catch (err) {
            log('✗ Server failed to start: ' + err.message);
            if (serverProcess) {
                serverProcess.kill('SIGTERM');
            }
            process.exit(1);
        }
    }

    // Run Playwright tests
    log('Running Playwright tests...');
    let testExitCode = 1;

    try {
        testExitCode = await runPlaywright();

        if (testExitCode === 0) {
            log('✓ All E2E tests passed');
        } else {
            log(`✗ E2E tests failed with exit code ${testExitCode}`);
        }
    } catch (err) {
        log('✗ Failed to run tests: ' + err.message);
    }

    // Stop server if we started it
    if (serverProcess && !serverAlreadyRunning) {
        log('Stopping dev server...');
        serverProcess.kill('SIGTERM');

        // Give it a moment to clean up
        await new Promise(r => setTimeout(r, 1000));
        log('✓ Server stopped');
    }

    // Summary
    console.log('\n' + '═'.repeat(70));
    if (testExitCode === 0) {
        console.log('   ✅ E2E CI: PASS');
    } else {
        console.log('   ❌ E2E CI: FAIL');
    }
    console.log('═'.repeat(70) + '\n');

    process.exit(testExitCode);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
