/**
 * E2E Storage Helper
 * 
 * Standardizes localStorage setup for deterministic E2E tests.
 * All tests should use this to ensure no cross-test contamination.
 */

import { Page } from '@playwright/test';

export interface StorageOptions {
    /** Force questions fixture (makes pipeline return questions state) */
    forceQuestionsFixture?: boolean;
    /** Clear panel hidden flag (ensures panel can appear) */
    clearPanelHidden?: boolean;
}

/**
 * Initialize localStorage for E2E tests.
 * Should be called via page.addInitScript BEFORE navigation.
 * 
 * @example
 * await initStorage(page, { forceQuestionsFixture: true, clearPanelHidden: true });
 * await page.goto('/docudent/v7');
 */
export async function initStorage(page: Page, opts: StorageOptions = {}): Promise<void> {
    const { forceQuestionsFixture = false, clearPanelHidden = true } = opts;

    await page.addInitScript(
        ([forceQ, clearHidden]) => {
            // Clear panel hidden flag (default: yes)
            if (clearHidden) {
                localStorage.removeItem('v7_multiinstance_panel_hidden');
            }

            // Set or clear questions fixture
            if (forceQ) {
                localStorage.setItem('v7_questions_fixture', 'force_questions');
            } else {
                localStorage.removeItem('v7_questions_fixture');
            }

            // Clear any other test-related keys
            localStorage.removeItem('v7_test_marker');
        },
        [forceQuestionsFixture, clearPanelHidden]
    );
}

/**
 * Clear the questions fixture after answering questions.
 * Only needed if using Approach A (explicit clearing).
 * With Approach B, this is not needed as answers cause canProceed=true.
 */
export async function clearQuestionsFixture(page: Page): Promise<void> {
    await page.evaluate(() => {
        localStorage.removeItem('v7_questions_fixture');
    });
}

/**
 * Set panel hidden to test the reset control.
 */
export async function setPanelHidden(page: Page, hidden: boolean): Promise<void> {
    await page.evaluate(([h]) => {
        if (h) {
            localStorage.setItem('v7_multiinstance_panel_hidden', 'true');
        } else {
            localStorage.removeItem('v7_multiinstance_panel_hidden');
        }
    }, [hidden]);
}

/**
 * Initialize localStorage for Live E2E tests (no stub mode).
 * 
 * This clears ALL test fixtures and ensures the panel can appear.
 * Used for sanity tests that validate the real pipeline path.
 * 
 * @example
 * await initLiveStorage(page);
 * await page.goto('/docudent/v7');
 */
export async function initLiveStorage(page: Page): Promise<void> {
    await page.addInitScript(() => {
        // Clear ALL test fixtures
        localStorage.removeItem('v7_multiinstance_panel_hidden');
        localStorage.removeItem('v7_questions_fixture');
        localStorage.removeItem('v7_test_marker');
    });
}
