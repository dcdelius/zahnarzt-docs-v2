import { test, expect } from '@playwright/test';
import { V7PageObject } from './helpers/v7.po';

/**
 * V7 Full UI E2E Tests
 * 
 * Run: npm run test:v7:e2e
 * 
 * Coverage:
 * - Füllung flow (correct tooth, no endo leakage)
 * - Endo flow (correct tooth, endo terms present)
 * - Step gating (questions → output)
 * - Edit roundtrip
 * - No mock strings gate
 * - Visual smoke
 */

// ═══════════════════════════════════════════════════════════════
// FIXTURES
// ═══════════════════════════════════════════════════════════════

const FUELLUNG_DICTATION = 'Zahn 14 mesial Kompositfüllung, Kofferdam, Adhäsiv, ausgearbeitet und poliert.';
const ENDO_DICTATION = 'Wurzelbehandlung Zahn 46 bei apikaler Parodontitis. Trepanation durchgeführt. Spülung mit NaOCl.';

const FORBIDDEN_MOCK_STRINGS = [
    'Max Müller',
    'Mustermann',
    'Behandlungsblatt',
    'Dr. Musterarzt',
    'Beispielpraxis',
];

const ENDO_ONLY_TERMS = [
    'Trepanation',
    'Vitalexstirpation',
    'Wurzelkanal',
    'NaOCl',
    'Kanalaufbereitung',
];

// ═══════════════════════════════════════════════════════════════
// A) FÜLLUNG STANDARD FLOW
// ═══════════════════════════════════════════════════════════════

test.describe('A) Füllung Flow', () => {
    test('reaches output with correct tooth, no endo leakage', async ({ page }) => {
        const v7 = new V7PageObject(page);

        await test.step('Navigate to V7', async () => {
            await v7.gotoV7();
        });

        await test.step('Select Füllung treatment', async () => {
            await v7.selectTreatment('fuellung');
        });

        await test.step('Enter dictation', async () => {
            await v7.typeDictation(FUELLUNG_DICTATION);
        });

        await test.step('Run analysis', async () => {
            await v7.runAnalysis();
        });

        // If questions appear, answer them
        if (await v7.isQuestionsVisible()) {
            await test.step('Answer all questions', async () => {
                await v7.answerAllQuestionsMinimal();
            });

            await test.step('Go to output', async () => {
                await v7.goToOutput();
            });
        }

        await test.step('Verify output', async () => {
            const isOutputVisible = await v7.isOutputVisible();
            if (!isOutputVisible) {
                await v7.diagnose();
            }
            expect(isOutputVisible, 'Output should be visible').toBe(true);

            const outputText = await v7.getOutputText();

            // Tooth 14 must appear
            expect(outputText, 'Output should contain tooth 14').toContain('14');

            // No endo-only terms
            for (const term of ENDO_ONLY_TERMS) {
                expect(
                    outputText.includes(term),
                    `Füllung output should NOT contain endo term: ${term}`
                ).toBe(false);
            }
        });
    });
});

// ═══════════════════════════════════════════════════════════════
// B) ENDO STANDARD FLOW
// ═══════════════════════════════════════════════════════════════

test.describe('B) Endo Flow', () => {
    test('reaches output with correct tooth, endo terms present', async ({ page }) => {
        const v7 = new V7PageObject(page);

        await v7.gotoV7();
        await v7.selectTreatment('endo');
        await v7.typeDictation(ENDO_DICTATION);
        await v7.runAnalysis();

        if (await v7.isQuestionsVisible()) {
            await v7.answerAllQuestionsMinimal();
            await v7.goToOutput();
        }

        const isOutputVisible = await v7.isOutputVisible();
        if (!isOutputVisible) {
            await v7.diagnose();
        }
        expect(isOutputVisible, 'Output should be visible').toBe(true);

        const outputText = await v7.getOutputText();
        const lowered = outputText.toLowerCase();

        // Tooth 46 must appear
        expect(outputText, 'Output should contain tooth 46').toContain('46');

        // At least one endo term should appear
        const hasEndoTerm =
            lowered.includes('wurzel') ||
            lowered.includes('kanal') ||
            lowered.includes('trepan') ||
            lowered.includes('spül');

        expect(hasEndoTerm, 'Endo output should contain endo terminology').toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════════
// C) STEP GATING
// ═══════════════════════════════════════════════════════════════

test.describe('C) Step Gating', () => {
    test('questions answered unlocks output (fuellung)', async ({ page }) => {
        const v7 = new V7PageObject(page);

        await v7.gotoV7();
        await v7.selectTreatment('fuellung');
        await v7.typeDictation(FUELLUNG_DICTATION);
        await v7.runAnalysis();

        // Should see questions OR output (depends on treatment)
        const hasQuestions = await v7.isQuestionsVisible();
        const hasOutput = await v7.isOutputVisible();

        expect(hasQuestions || hasOutput, 'Should see questions or output after analysis').toBe(true);

        if (hasQuestions) {
            await v7.answerAllQuestionsMinimal();
            await v7.goToOutput();
            expect(await v7.isOutputVisible(), 'Output visible after completing questions').toBe(true);
        }
    });

    test('questions answered unlocks output (endo)', async ({ page }) => {
        const v7 = new V7PageObject(page);

        await v7.gotoV7();
        await v7.selectTreatment('endo');
        await v7.typeDictation(ENDO_DICTATION);
        await v7.runAnalysis();

        const hasQuestions = await v7.isQuestionsVisible();
        const hasOutput = await v7.isOutputVisible();

        expect(hasQuestions || hasOutput, 'Should see questions or output after analysis').toBe(true);

        if (hasQuestions) {
            await v7.answerAllQuestionsMinimal();
            await v7.goToOutput();
            expect(await v7.isOutputVisible(), 'Output visible after completing questions').toBe(true);
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// D) EDIT ROUNDTRIP
// ═══════════════════════════════════════════════════════════════

test.describe('D) Edit Roundtrip', () => {
    test('output → edit → questions → output works', async ({ page }) => {
        const v7 = new V7PageObject(page);

        await v7.gotoV7();
        await v7.selectTreatment('fuellung');
        await v7.typeDictation(FUELLUNG_DICTATION);
        await v7.runAnalysis();

        if (await v7.isQuestionsVisible()) {
            await v7.answerAllQuestionsMinimal();
            await v7.goToOutput();
        }

        expect(await v7.isOutputVisible(), 'Should be at output').toBe(true);

        // Click edit
        await v7.clickEdit();

        // Should be back at questions
        expect(await v7.isQuestionsVisible(), 'Should be back at questions after edit').toBe(true);

        // Go back to output
        await v7.goToOutput();

        expect(await v7.isOutputVisible(), 'Should be at output again').toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════════
// E) NO MOCK STRINGS GATE
// ═══════════════════════════════════════════════════════════════

test.describe('E) No Mock Strings Gate', () => {
    test('output never contains forbidden demo strings', async ({ page }) => {
        const v7 = new V7PageObject(page);

        await v7.gotoV7();
        await v7.selectTreatment('fuellung');
        await v7.typeDictation(FUELLUNG_DICTATION);
        await v7.runAnalysis();

        if (await v7.isQuestionsVisible()) {
            await v7.answerAllQuestionsMinimal();
            await v7.goToOutput();
        }

        const outputText = await v7.getOutputText();

        for (const mock of FORBIDDEN_MOCK_STRINGS) {
            expect(
                outputText.includes(mock),
                `Output should NOT contain mock string: "${mock}"`
            ).toBe(false);
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// F) VISUAL SMOKE
// ═══════════════════════════════════════════════════════════════

test.describe('F) Visual Smoke', () => {
    test('output paper renders without catastrophic layout issues', async ({ page }) => {
        const v7 = new V7PageObject(page);

        await v7.gotoV7();
        await v7.selectTreatment('fuellung');
        await v7.typeDictation(FUELLUNG_DICTATION);
        await v7.runAnalysis();

        if (await v7.isQuestionsVisible()) {
            await v7.answerAllQuestionsMinimal();
            await v7.goToOutput();
        }

        // Take screenshot of output paper only
        const paper = page.locator('[data-testid="output-paper"]');
        expect(await paper.isVisible(), 'Output paper should be visible').toBe(true);

        // Screenshot for visual comparison
        await paper.screenshot({ path: 'test-results/output-paper-smoke.png' });

        // Basic size check (should not be tiny or huge)
        const box = await paper.boundingBox();
        expect(box, 'Output paper should have dimensions').not.toBeNull();
        if (box) {
            expect(box.width).toBeGreaterThan(200);
            expect(box.height).toBeGreaterThan(100);
        }
    });
});
