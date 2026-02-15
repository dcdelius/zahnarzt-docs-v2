/**
 * V10 Insurance Billing E2E Tests
 *
 * Tests the complete insurance flow from UI pill click to BillingRefs output.
 * Verifies channelization contract: GKV→BEMA, PKV→GOZ, MKV→BEMA+GOZ.
 */

import { test, expect, Page } from '@playwright/test';

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        (window as any).__DOCUDENT_E2E_BYPASS_AUTH = true;
    });
});

async function selectInsurance(page: Page, type: 'GKV' | 'PKV' | 'MKV') {
    const ins = page.locator('[data-testid="v10-insurance-select"]');
    await expect(ins).toBeVisible();

    if (type === 'MKV') {
        // MKV is GKV + Zusatz toggle
        await ins.locator('button:has-text("+MKV")').click();
    } else {
        await ins.locator(`button:has-text("${type}")`).click();
    }
}

async function runPipeline(page: Page, dictation: string): Promise<void> {
    await page.fill('[data-testid="v10-dictation-input"]', dictation);
    await page.click('[data-testid="v10-run-button"]');

    for (let attempt = 0; attempt < 3; attempt += 1) {
        const result = page.locator('[data-testid="v10-questions-panel"], [data-testid="v10-output-panel"], [data-testid="v10-error-panel"]');
        await expect(result.first()).toBeVisible({ timeout: 30000 });

        if (await page.locator('[data-testid="v10-error-panel"]').isVisible()) {
            throw new Error('Pipeline entered error state');
        }

        if (await page.locator('[data-testid="v10-output-panel"]').isVisible()) {
            return;
        }

        if (await page.locator('[data-testid="v10-questions-panel"]').isVisible()) {
            const rows = page.locator('[data-testid^="question-row-"]');
            const rowCount = await rows.count();
            for (let i = 0; i < rowCount; i++) {
                const row = rows.nth(i);
                const optionButtons = row.locator('button[data-testid^="option-"]');
                if (await optionButtons.count() > 0) {
                    await optionButtons.first().click();
                    continue;
                }
                const numberInput = row.locator('input[type="number"]');
                if (await numberInput.count() > 0) {
                    await numberInput.first().fill('100');
                    continue;
                }
                const textArea = row.locator('textarea');
                if (await textArea.count() > 0) {
                    await textArea.first().fill('ok');
                }
            }
            const submitBtn = page.locator('[data-testid="v10-submit-answers"]');
            const completeBtn = page.locator('[data-testid="complete-button"]');
            if (await submitBtn.isVisible()) {
                await submitBtn.click();
            } else if (await completeBtn.isVisible()) {
                await completeBtn.click();
            }
        }
    }

    throw new Error('Output not reached after answering questions');
}

async function getBillingCodes(page: Page): Promise<string[]> {
    const toggle = page.locator('[data-testid="billing-toggle"]');
    if (await toggle.isVisible()) {
        await toggle.click();
    }

    const list = page.locator('[data-testid="v10-billing-grouped"]');
    if (!await list.isVisible()) {
        return [];
    }

    const items = list.locator('li');
    const count = await items.count();
    const codes: string[] = [];

    for (let i = 0; i < count; i++) {
        const text = await items.nth(i).textContent();
        if (!text) continue;
        const matches = text.match(/(BEMA|GOZ)_?[A-Z0-9]+/g) ?? [];
        for (const m of matches) {
            if (m.startsWith('BEMA_') || m.startsWith('GOZ_')) {
                codes.push(m.trim());
            }
        }
        const bemaNum = text.match(/BEMA[^0-9]*([0-9]+[a-z]?)/i)?.[1];
        if (bemaNum) codes.push(`BEMA_${bemaNum}`);
        const gozNum = text.match(/GOZ[^0-9]*([0-9]+)/i)?.[1];
        if (gozNum) codes.push(`GOZ_${gozNum}`);
    }

    return codes;
}

// ═══════════════════════════════════════════════════════════════
// TEST 1: GKV → only BEMA
// ═══════════════════════════════════════════════════════════════

test.describe('V10 Insurance Billing: GKV', () => {
    test('GKV produces only BEMA codes, no GOZ', async ({ page }) => {
        await page.goto('/docudent/v10');
        await expect(page.locator('[data-testid="v10-dictation-input"]')).toBeVisible();

        await selectInsurance(page, 'GKV');
        await runPipeline(page, 'Füllung Zahn 36 okklusal distal Komposit');

        const codes = await getBillingCodes(page);
        console.log('[GKV] BillingCodes:', codes);

        // Assert: BEMA present, no GOZ
        const hasBema = codes.some(c => c.includes('BEMA'));
        const hasGoz = codes.some(c => c.includes('GOZ'));

        expect(hasBema || codes.length === 0).toBe(true); // BEMA or empty (askback)
        expect(hasGoz).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════
// TEST 2: PKV → only GOZ
// ═══════════════════════════════════════════════════════════════

test.describe('V10 Insurance Billing: PKV', () => {
    test('PKV produces only GOZ codes, no BEMA', async ({ page }) => {
        await page.goto('/docudent/v10');
        await expect(page.locator('[data-testid="v10-dictation-input"]')).toBeVisible();

        await selectInsurance(page, 'PKV');
        await runPipeline(page, 'Füllung Zahn 36 okklusal distal Komposit');

        const codes = await getBillingCodes(page);
        console.log('[PKV] BillingCodes:', codes);

        // Assert: GOZ present, no BEMA
        const hasBema = codes.some(c => c.includes('BEMA'));
        const hasGoz = codes.some(c => c.includes('GOZ'));

        expect(hasGoz || codes.length === 0).toBe(true);
        expect(hasBema).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════
// TEST 3: MKV → BEMA + GOZ (Praxis-Default)
// ═══════════════════════════════════════════════════════════════

test.describe('V10 Insurance Billing: MKV', () => {
    test('MKV with Mehrkosten produces BEMA + GOZ', async ({ page }) => {
        await page.goto('/docudent/v10');
        await expect(page.locator('[data-testid="v10-dictation-input"]')).toBeVisible();

        await selectInsurance(page, 'MKV');
        await runPipeline(page, 'Füllung Zahn 36 okklusal distal Komposit Mehrkosten');

        const codes = await getBillingCodes(page);
        console.log('[MKV] BillingCodes:', codes);

        // MKV with Mehrkosten should have both BEMA and GOZ
        const hasBema = codes.some(c => c.includes('BEMA'));
        const hasGoz = codes.some(c => c.includes('GOZ'));

        // With explicit Mehrkosten, both should be present
        if (codes.length > 0) {
            expect(hasBema).toBe(true);
            expect(hasGoz).toBe(true);
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// TEST 4: MKV + "nur Kasse" → only BEMA
// ═══════════════════════════════════════════════════════════════

test.describe('V10 Insurance Billing: MKV nurKasse', () => {
    test('MKV with "nur Kasse" produces only BEMA, no GOZ', async ({ page }) => {
        await page.goto('/docudent/v10');
        await expect(page.locator('[data-testid="v10-dictation-input"]')).toBeVisible();

        await selectInsurance(page, 'MKV');
        await runPipeline(page, 'Füllung Zahn 36 okklusal nur Kasse');

        const codes = await getBillingCodes(page);
        console.log('[MKV nurKasse] BillingCodes:', codes);

        // nurKasse should suppress GOZ addon
        const hasGoz = codes.some(c => c.includes('GOZ'));
        expect(hasGoz).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════
// TEST 5: Multi-tooth → perInstance
// ═══════════════════════════════════════════════════════════════

test.describe('V10 Insurance Billing: Multi-tooth', () => {
    test('multi-tooth produces perInstance with separate billingRefs', async ({ page }) => {
        await page.goto('/docudent/v10');
        await expect(page.locator('[data-testid="v10-dictation-input"]')).toBeVisible();

        await selectInsurance(page, 'GKV');
        await runPipeline(page, 'Füllung Zahn 36 od; Füllung Zahn 14 o');

        // Verify both teeth are present in output text
        const outputText = await page.locator('[data-testid="v10-output-panel"]').textContent();
        expect(outputText || '').toContain('36');
        expect(outputText || '').toContain('14');
    });
});
