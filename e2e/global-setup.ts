/**
 * E2E Global Setup - Login once and save storageState
 * 
 * This runs ONCE before all tests, logs in, and saves the auth state.
 * Tests then use this state via `storageState` option.
 */

import { chromium, FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AUTH_STATE_PATH = path.join(__dirname, '.auth/state.json');
const BASE_URL = 'http://localhost:4173';

async function globalSetup(config: FullConfig) {
    console.log('[globalSetup] Starting authentication...');

    // Ensure .auth directory exists
    const authDir = path.dirname(AUTH_STATE_PATH);
    if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true });
    }

    // Launch browser for login
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        // Navigate to login page directly
        console.log('[globalSetup] Navigating to app...');
        await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Give page time to redirect/render
        await page.waitForTimeout(2000);

        // Check current URL - if on login, authenticate
        const currentUrl = page.url();
        console.log('[globalSetup] Current URL:', currentUrl);

        // Try login if we see login elements
        const emailInput = page.locator('input[type="email"], input[placeholder*="Mail"]').first();
        const isLoginVisible = await emailInput.isVisible({ timeout: 5000 }).catch(() => false);

        if (isLoginVisible) {
            console.log('[globalSetup] Login form visible, authenticating...');

            const email = process.env.E2E_LOGIN_EMAIL || 'dcdelius@me.com';
            const password = process.env.E2E_LOGIN_PASSWORD || 'Magenta!';

            await emailInput.fill(email);

            const passwordField = page.locator('input[type="password"]').first();
            await passwordField.fill(password);

            const loginButton = page.locator('button:has-text("Einloggen"), button:has-text("Login")').first();
            await loginButton.click();

            // Wait for login to complete
            await page.waitForTimeout(3000);
            console.log('[globalSetup] Login submitted, waiting for redirect...');
        }

        // Navigate to V10 
        await page.goto(`${BASE_URL}/docudent/v10`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000);

        // Check if V10 page loaded or we're redirected to login again
        const v10Ready = await page.locator('[data-testid="v10-dictation-input"]').isVisible({ timeout: 10000 }).catch(() => false);

        if (v10Ready) {
            console.log('[globalSetup] V10 page loaded successfully');
            await context.storageState({ path: AUTH_STATE_PATH });
            console.log('[globalSetup] Auth state saved to:', AUTH_STATE_PATH);
        } else {
            console.log('[globalSetup] WARNING: V10 page did not load. Tests may fail.');
            // Save whatever state we have
            await context.storageState({ path: AUTH_STATE_PATH });
        }

    } finally {
        await browser.close();
    }
}

export default globalSetup;
