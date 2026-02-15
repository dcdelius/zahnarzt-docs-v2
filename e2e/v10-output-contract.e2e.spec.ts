/**
 * E2E: V10 Output Contract
 *
 * Verifies that V10 produces KZV-style perfect documentation output
 * with proper sections, not placeholder text.
 */

import { test, expect } from '@playwright/test';

test.describe('V10 Output Contract', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/docudent/v10');
        await page.waitForLoadState('networkidle');
    });

    test('should produce structured documentation sections', async ({ page }) => {
        // Enter dictation
        const dictationInput = page.getByTestId('dictation-input');
        await dictationInput.fill('Zahn 27 mod mit Anästhesie, tief mit CP');

        // Select treatment
        await page.getByTestId('treatment-fuellung').click();

        // Select insurance
        await page.getByTestId('insurance-gkv').click();

        // Run pipeline
        await page.getByTestId('run-button').click();
        await page.waitForSelector('[data-testid="questions-container"], [data-testid="output-paper"]', {
            timeout: 10000,
        });

        // Answer any remaining questions
        const questionsVisible = await page.isVisible('[data-testid="questions-container"]');
        if (questionsVisible) {
            // Answer material question if present
            const materialOption = page.getByTestId('option-komposit');
            if (await materialOption.isVisible()) {
                await materialOption.click();
            }

            // Answer CP material question if present
            const cpMaterialOption = page.getByTestId('option-caoh');
            if (await cpMaterialOption.isVisible()) {
                await cpMaterialOption.click();
            }

            // Submit answers
            const submitButton = page.getByTestId('submit-answers-button');
            if (await submitButton.isVisible()) {
                await submitButton.click();
            }
        }

        // Wait for output
        await page.waitForSelector('[data-testid="output-paper"]', { timeout: 15000 });

        // ASSERT: Check for structured sections
        const dokumentationSection = page.getByTestId('section-dokumentation');
        const abrechnungSection = page.getByTestId('section-abrechnung');
        const hinweiseSection = page.getByTestId('section-hinweise');

        // At minimum, Dokumentation section should exist
        await expect(dokumentationSection).toBeVisible();

        // Get Dokumentation content
        const dokumentationText = await dokumentationSection.textContent();
        console.log('[E2E OUTPUT] Dokumentation:', dokumentationText);

        // ASSERT: Must contain tooth number
        expect(dokumentationText).toMatch(/27|Zahn\s*27/);

        // ASSERT: Must contain surface indication
        expect(dokumentationText).toMatch(/MOD|mod|mesio|okkluso|distal/i);

        // ASSERT: Must contain anesthesia (if detected)
        expect(dokumentationText).toMatch(/anästhesie|infiltration|lokalanästhesie/i);

        // ASSERT: Must NOT be placeholder-only text
        expect(dokumentationText).not.toBe('Füllungstherapie durchgeführt.');
        expect(dokumentationText).not.toBe('Füllung durchgeführt.');

        // ASSERT: Must NOT contain raw booleans
        expect(dokumentationText).not.toMatch(/\btrue\b/);
        expect(dokumentationText).not.toMatch(/\bfalse\b/);

        // Check if Abrechnung section exists (may not always be present)
        if (await abrechnungSection.isVisible()) {
            const abrechnungText = await abrechnungSection.textContent();
            console.log('[E2E OUTPUT] Abrechnung:', abrechnungText);

            // Should contain billing codes (formatted)
            expect(abrechnungText).toMatch(/BEMA|GOZ|13|25|40/);
        }

        // Check if Hinweise section exists (may not always be present)
        if (await hinweiseSection.isVisible()) {
            const hinweiseText = await hinweiseSection.textContent();
            console.log('[E2E OUTPUT] Hinweise:', hinweiseText);

            // If anesthesia present, should have LA warning
            expect(hinweiseText).toMatch(/Betäubung|Lokalanästhesie|Beschwerden/i);
        }
    });

    test('output should NOT show placeholder when pipeline completes', async ({ page }) => {
        // Enter simple dictation
        const dictationInput = page.getByTestId('dictation-input');
        await dictationInput.fill('Zahn 36 okklusal mit Komposit');

        await page.getByTestId('treatment-fuellung').click();
        await page.getByTestId('insurance-gkv').click();
        await page.getByTestId('run-button').click();

        // Wait for output or questions
        await page.waitForSelector('[data-testid="questions-container"], [data-testid="output-paper"]', {
            timeout: 10000,
        });

        // Answer questions if needed
        const questionsVisible = await page.isVisible('[data-testid="questions-container"]');
        if (questionsVisible) {
            const allOptions = await page.locator('[data-testid^="option-"]').all();
            for (const option of allOptions.slice(0, 2)) { // Click first 2 options
                if (await option.isVisible()) {
                    await option.click();
                }
            }

            const submitButton = page.getByTestId('submit-answers-button');
            if (await submitButton.isVisible()) {
                await submitButton.click();
            }
        }

        // Wait for output
        await page.waitForSelector('[data-testid="output-paper"]', { timeout: 15000 });

        // Get full output text
        const outputPaper = page.getByTestId('output-paper');
        const fullText = await outputPaper.textContent();
        console.log('[E2E OUTPUT] Full text length:', fullText?.length);

        // ASSERT: Content should be substantial, not just placeholder
        expect(fullText?.length).toBeGreaterThan(100);

        // ASSERT: Should contain the tooth from dictation
        expect(fullText).toMatch(/36/);
    });

    test('MKV dictation should produce MKV section with amount', async ({ page }) => {
        // Enter MKV dictation with amount
        const dictationInput = page.getByTestId('dictation-input');
        await dictationInput.fill('Zahn 27 mod mit Anästhesie, tief, MKV 120€');

        await page.getByTestId('treatment-fuellung').click();
        await page.getByTestId('insurance-mkv').click(); // MKV insurance
        await page.getByTestId('run-button').click();

        // Handle questions
        await page.waitForSelector('[data-testid="questions-container"], [data-testid="output-paper"]', {
            timeout: 10000,
        });

        const questionsVisible = await page.isVisible('[data-testid="questions-container"]');
        if (questionsVisible) {
            const materialOption = page.getByTestId('option-komposit');
            if (await materialOption.isVisible()) {
                await materialOption.click();
            }

            const submitButton = page.getByTestId('submit-answers-button');
            if (await submitButton.isVisible()) {
                await submitButton.click();
            }
        }

        // Wait for output
        await page.waitForSelector('[data-testid="output-paper"]', { timeout: 15000 });

        // Check for MKV section
        const mkvSection = page.getByTestId('section-mkv');
        if (await mkvSection.isVisible()) {
            const mkvText = await mkvSection.textContent();
            console.log('[E2E OUTPUT] MKV:', mkvText);

            // Should contain amount
            expect(mkvText).toMatch(/120|Mehrkosten/i);
        }

        // ASSERT: No phantom teeth from "120€"
        const dokumentation = page.getByTestId('section-dokumentation');
        const dokText = await dokumentation.textContent();

        // Should contain 27, but NOT 12 or 20 (from 120€)
        expect(dokText).toMatch(/27/);
        expect(dokText).not.toMatch(/Zahn\s*12(?!\d)|Zahn\s*20(?!\d)/); // 12 or 20 standalone
    });
});
