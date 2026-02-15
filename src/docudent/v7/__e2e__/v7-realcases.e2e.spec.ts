import { test, expect } from '@playwright/test';
import { V7PageObject } from './helpers/v7.po';
import { ALL_FIXTURES, type RealCaseFixture } from './fixtures/realCases';
import { validateResult, formatViolations, type ValidationContext } from './helpers/truthRules';
import { generateAuditReport, formatReportAsMarkdown } from './helpers/llmAuditor';

/**
 * V7 REALCASES — 20 Clinical Cases with Truth Gates
 * 
 * Run: npm run test:v7:realcases
 * 
 * These tests:
 * 1. Run each of 20 clinical fixtures through the full V7 UI flow
 * 2. Apply deterministic truth rules for medical/billing correctness
 * 3. Generate audit reports on failure
 * 
 * NO PATIENT IDENTITY DATA.
 */

// ═══════════════════════════════════════════════════════════════
// TEST CONFIGURATION
// ═══════════════════════════════════════════════════════════════

test.describe.configure({ mode: 'serial' });

// ═══════════════════════════════════════════════════════════════
// REALCASES TEST SUITE
// ═══════════════════════════════════════════════════════════════

test.describe('REALCASES: Full Clinical Flow', () => {
    // Run all 20 fixtures
    for (const fixture of ALL_FIXTURES) {
        test(`[${fixture.id}] ${fixture.treatmentId.toUpperCase()} flow`, async ({ page }) => {
            // Skip if fixture has skip reason
            if (fixture.skip) {
                test.skip(true, fixture.skip);
            }

            const v7 = new V7PageObject(page);
            const testContext: TestContext = {
                fixture,
                shownQuestionIds: [],
                billingCodes: [],
                billingReason: undefined,
                outputText: '',
            };

            // Step 1: Navigate and setup
            await test.step('Navigate to V7', async () => {
                await v7.gotoV7();
            });

            // Step 2: Select treatment
            await test.step('Select treatment', async () => {
                await v7.selectTreatment(fixture.treatmentId);
            });

            // Step 3: Enter dictation
            await test.step('Enter dictation', async () => {
                await v7.typeDictation(fixture.dictation);
            });

            // Step 4: Run analysis
            await test.step('Run analysis', async () => {
                await v7.runAnalysis();
            });

            // P12.8c: Handle expectUnsupported - assert unsupported UI is shown
            if (fixture.expectUnsupported) {
                await test.step('Verify unsupported state is shown', async () => {
                    // Wait for the unsupported state UI to appear
                    const unsupportedSelector = `[data-testid="unsupported-${fixture.expectUnsupported}"]`;
                    const unsupported = page.locator(unsupportedSelector);

                    await expect(
                        unsupported,
                        `Expected unsupported state with reason '${fixture.expectUnsupported}' to be visible`
                    ).toBeVisible({ timeout: 10000 });

                    console.log(`[${fixture.id}] Correctly shows unsupported state: ${fixture.expectUnsupported}`);
                });

                // Skip remaining steps for unsupported fixtures
                return;
            }

            // Step 5: Handle questions if present
            if (await v7.isQuestionsVisible()) {
                await test.step('Answer questions', async () => {
                    // Collect question IDs for rule checking
                    testContext.shownQuestionIds = await collectQuestionIds(page);

                    // Answer all questions
                    await v7.answerAllQuestionsMinimal();
                });

                await test.step('Go to output', async () => {
                    await v7.goToOutput();
                });
            }

            // Step 6: Verify output is visible
            await test.step('Verify output visible', async () => {
                const isOutputVisible = await v7.isOutputVisible();
                if (!isOutputVisible) {
                    await logDiagnostics(v7, fixture);
                }
                expect(isOutputVisible, `Output should be visible for ${fixture.id}`).toBe(true);
            });

            // Step 7: Extract output data
            await test.step('Extract output data', async () => {
                testContext.outputText = await v7.getOutputText();

                // Try to get billing info
                await v7.openBillingAccordionIfPresent();
                const billingText = await v7.getBillingCodesText();
                testContext.billingCodes = extractBillingCodes(billingText);
                testContext.billingReason = extractBillingReason(billingText);
            });

            // Step 8: Run truth rules
            await test.step('Validate with truth rules', async () => {
                const validationCtx: ValidationContext = {
                    fixture,
                    outputText: testContext.outputText,
                    billingCodes: testContext.billingCodes,
                    billingReason: testContext.billingReason,
                    shownQuestionIds: testContext.shownQuestionIds,
                };

                const result = validateResult(validationCtx);

                // Log violations for debugging
                if (result.violations.length > 0) {
                    console.log(`\n═══════════════════════════════════════════════════════════════`);
                    console.log(`[${fixture.id}] VIOLATIONS:`);
                    console.log(formatViolations(result.violations));
                    console.log(`Output (first 500 chars):\n${testContext.outputText.slice(0, 500)}`);
                    console.log(`═══════════════════════════════════════════════════════════════\n`);

                    // Generate audit report (informational)
                    const report = generateAuditReport(
                        fixture,
                        testContext.outputText,
                        testContext.billingCodes,
                        testContext.billingReason,
                        result.violations
                    );
                    console.log(formatReportAsMarkdown(report));
                }

                // Assert on hard failures only
                const hardViolations = result.violations.filter(v => v.severity === 'hard');
                expect(
                    hardViolations.length,
                    `[${fixture.id}] Hard violations:\n${formatViolations(hardViolations)}`
                ).toBe(0);
            });
        });
    }
});

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

interface TestContext {
    fixture: RealCaseFixture;
    shownQuestionIds: string[];
    billingCodes: string[];
    billingReason?: string;
    outputText: string;
}

/**
 * Collect question IDs from the questions panel
 */
async function collectQuestionIds(page: import('@playwright/test').Page): Promise<string[]> {
    const ids: string[] = [];
    const rows = page.locator('[data-testid^="question-row-"]');
    const count = await rows.count();

    for (let i = 0; i < count; i++) {
        const testid = await rows.nth(i).getAttribute('data-testid');
        if (testid) {
            ids.push(testid.replace('question-row-', ''));
        }
    }

    return ids;
}

/**
 * Extract billing codes from billing section text
 */
function extractBillingCodes(billingText: string): string[] {
    if (!billingText) return [];

    // Match common code patterns: BEMA (letters+numbers), GOZ (4 digits)
    const codePattern = /\b([A-Z]{1,3}\d{1,4}|\d{4}[a-z]?)\b/g;
    const matches = billingText.match(codePattern) || [];

    return [...new Set(matches)];
}

/**
 * Extract billing reason from text
 */
function extractBillingReason(billingText: string): string | undefined {
    if (!billingText) return undefined;

    // Look for common reason patterns
    const reasonPatterns = [
        /Keine Abrechnung möglich[:\s]*(.*?)(?:\.|$)/i,
        /Grund[:\s]*(.*?)(?:\.|$)/i,
        /Nicht abrechenbar[:\s]*(.*?)(?:\.|$)/i,
    ];

    for (const pattern of reasonPatterns) {
        const match = billingText.match(pattern);
        if (match) return match[1].trim();
    }

    return undefined;
}

/**
 * Log diagnostics for debugging
 */
async function logDiagnostics(v7: V7PageObject, fixture: RealCaseFixture): Promise<void> {
    console.log(`
═══════════════════════════════════════════════════════════════
DIAGNOSTIC DUMP: ${fixture.id}
═══════════════════════════════════════════════════════════════
Treatment: ${fixture.treatmentId}
Insurance: ${fixture.insuranceType}
Dictation: ${fixture.dictation.slice(0, 200)}...
Route: ${await v7.getCurrentRoute()}
Questions Visible: ${await v7.isQuestionsVisible()}
Output Visible: ${await v7.isOutputVisible()}
═══════════════════════════════════════════════════════════════
`);
}
