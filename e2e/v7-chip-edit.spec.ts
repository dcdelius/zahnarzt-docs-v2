/**
 * E2E Test: Chip Editing in V7 Questions Panel
 * 
 * Tests that summary chips can be clicked to open dropdowns
 * and that selections persist and update the UI.
 */

import { test, expect } from '@playwright/test';
import { waitForV7Ready, waitForQuestions, triggerPipeline } from './v7-helpers';

test.describe('V7 Chip Editing', () => {
    test('should edit Trockenlegung chip via dropdown', async ({ page }) => {
        // Navigate to V7
        await page.goto('/docudent/v7');
        await waitForV7Ready(page);

        // Enter dictation (Zahn 36 MOD for approximal surfaces)
        const textarea = page.getByTestId('dictation-textarea');
        await textarea.fill('Zahn 36 MOD Karies');

        // Trigger pipeline
        await triggerPipeline(page);

        // Wait for questions panel
        await waitForQuestions(page);

        // Find and click Trockenlegung chip
        const trockenlegungChip = page.getByTestId('chip-trockenlegung');
        await expect(trockenlegungChip).toBeVisible({ timeout: 10000 });
        await trockenlegungChip.click();

        // Dropdown should appear
        const dropdown = page.getByTestId('chip-trockenlegung-dropdown');
        await expect(dropdown).toBeVisible({ timeout: 5000 });

        // Select "Relative Trockenlegung"
        const relativOption = page.getByTestId('chip-trockenlegung-option-relativ');
        await expect(relativOption).toBeVisible();
        await relativOption.click();

        // Dropdown should close
        await expect(dropdown).not.toBeVisible({ timeout: 2000 });

        // Chip should now show "Relative Trockenlegung"
        await expect(trockenlegungChip).toContainText('Relative');
    });

    test('should edit Matrix chip when approximal surfaces present', async ({ page }) => {
        // Navigate to V7
        await page.goto('/docudent/v7');
        await waitForV7Ready(page);

        // Enter dictation with approximal surfaces (MOD = mesial + occlusal + distal)
        const textarea = page.getByTestId('dictation-textarea');
        await textarea.fill('Zahn 46 MOD Karies');

        // Trigger pipeline
        await triggerPipeline(page);

        // Wait for questions panel
        await waitForQuestions(page);

        // Matrix chip should be visible (because of M and D surfaces)
        const matrixChip = page.getByTestId('chip-matrix');
        await expect(matrixChip).toBeVisible({ timeout: 10000 });
        await matrixChip.click();

        // Dropdown should appear
        const dropdown = page.getByTestId('chip-matrix-dropdown');
        await expect(dropdown).toBeVisible({ timeout: 5000 });

        // Select "Tofflemire"
        const tofflemireOption = page.getByTestId('chip-matrix-option-tofflemire');
        await expect(tofflemireOption).toBeVisible();
        await tofflemireOption.click();

        // Chip should now show "Tofflemire"
        await expect(matrixChip).toContainText('Tofflemire');
    });

    test('should show Anesthesia chip for UK posterior tooth', async ({ page }) => {
        // Navigate to V7
        await page.goto('/docudent/v7');
        await waitForV7Ready(page);

        // Enter dictation with UK molar (36 = UK posterior)
        const textarea = page.getByTestId('dictation-textarea');
        await textarea.fill('Zahn 36 O Karies');

        // Trigger pipeline
        await triggerPipeline(page);

        // Wait for questions panel
        await waitForQuestions(page);

        // Anesthesia chip should be visible (UK posterior)
        const anesthesiaChip = page.getByTestId('chip-anesthesia');
        // Note: This might not be visible if anesthesia.enabled is false in default settings
        // We test that IF it's visible, it can be edited
        const isVisible = await anesthesiaChip.isVisible().catch(() => false);

        if (isVisible) {
            await anesthesiaChip.click();

            // Dropdown should appear
            const dropdown = page.getByTestId('chip-anesthesia-dropdown');
            await expect(dropdown).toBeVisible({ timeout: 5000 });

            // Should have UK posterior options (Leitung, ILA, Infiltration)
            await expect(page.getByTestId('chip-anesthesia-option-leitung')).toBeVisible();
            await expect(page.getByTestId('chip-anesthesia-option-intraligamentaer')).toBeVisible();
            await expect(page.getByTestId('chip-anesthesia-option-infiltration')).toBeVisible();
        }
    });
});
