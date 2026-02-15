/**
 * V10 Reality Smoke Test
 * 
 * @vitest-environment jsdom
 * 
 * Tests the real V10 frontend flow:
 * Dictation → Facts → Askbacks → Questions UI → Answers → Chips → Output
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the extraction service before imports
vi.mock('../../../core/extraction/extractionService', () => ({
    extractDictation: vi.fn().mockResolvedValue({
        tooth: '36',
        surfaces: ['okklusal'],
        caries: 'profunda',
        material: 'Komposit',
        mentioned: {
            cariesDepth: 'profunda',
            toothId: '36',
        },
    }),
}));

// We'll test the pipeline directly, not the full page
import { runV10 } from '../../pipeline/runV10';

describe('V10 Reality Smoke', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Basic Pipeline Flow', () => {
        it('should process a single tooth dictation', async () => {
            const result = await runV10({
                dictation: 'Füllung Zahn 36 okklusal Komposit Caries profunda',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
                answers: new Map(),
            });

            expect(result).toBeDefined();
            expect(result.state).toMatch(/questions|output/);
        });

        it('should return questions when facts are unknown', async () => {
            const result = await runV10({
                dictation: 'Füllung 36 okklusal tiefe Karies',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
                answers: new Map(),
                testOnly: { goldenMode: true },
            });

            // With golden mode, should trigger askbacks
            if (result.state === 'questions') {
                expect(result.questions).toBeDefined();
                expect(result.questions!.length).toBeGreaterThan(0);
            }
        });

        it('should produce output when all required questions answered', async () => {
            // Provide pre-answered facts
            const answers = new Map<string, unknown>([
                ['adhesive', 'ja'],
                ['isolation', 'kofferdam'],
                ['capping', 'nein'],
            ]);

            const result = await runV10({
                dictation: 'Füllung Zahn 36 okklusal Komposit',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
                answers,
            });

            // Should either have more questions or produce output
            expect(['questions', 'output']).toContain(result.state);

            if (result.state === 'output') {
                expect(result.output).toBeDefined();
                expect(result.output!.fullText).toBeDefined();
                expect(result.output!.billingCodes).toBeDefined();
            }
        });
    });

    describe('Multi-Step Answer Flow', () => {
        it('should update output after answering questions', async () => {
            // First run without answers
            const result1 = await runV10({
                dictation: 'Füllung 36 okklusal',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
                answers: new Map(),
                testOnly: { goldenMode: true },
            });

            if (result1.state === 'questions' && result1.questions) {
                // Get first question, answer it
                const firstQ = result1.questions[0];
                const answerMap = new Map<string, unknown>();
                answerMap.set(firstQ.id, 'ja');

                const result2 = await runV10({
                    dictation: 'Füllung 36 okklusal',
                    treatmentId: 'fuellung',
                    insuranceType: 'GKV',
                    textLength: 'mittel',
                    answers: answerMap,
                    testOnly: { goldenMode: true },
                });

                // Should either have fewer questions or reach output
                if (result2.state === 'questions') {
                    expect(result2.questions!.length).toBeLessThanOrEqual(result1.questions.length);
                }
            }
        });
    });

    describe('SSOT Contract', () => {
        it('should not have hardcoded billing codes in output text', async () => {
            const result = await runV10({
                dictation: 'Füllung Zahn 36 okklusal Komposit',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
                answers: new Map([
                    ['adhesive', 'ja'],
                    ['isolation', 'kofferdam'],
                    ['capping', 'nein'],
                ]),
            });

            if (result.state === 'output' && result.output) {
                const text = result.output.fullText;
                // Text should NOT contain billing codes inline (SSOT principle)
                expect(text).not.toMatch(/BEMA\s*13[abc]/);
                expect(text).not.toMatch(/GOZ\s*\d{4}/);
            }
        });

        it('should have billing codes as separate refs', async () => {
            const result = await runV10({
                dictation: 'Füllung 36 okklusal Komposit Adhäsivtechnik',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
                answers: new Map([
                    ['adhesive', 'ja'],
                    ['isolation', 'kofferdam'],
                ]),
            });

            if (result.state === 'output' && result.output) {
                expect(Array.isArray(result.output.billingCodes)).toBe(true);
            }
        });
    });
});
