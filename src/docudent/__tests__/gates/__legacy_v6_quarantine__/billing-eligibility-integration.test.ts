/**
 * Integration Tests: Billing Eligibility Guard in Production Pipeline
 * 
 * These tests verify that the billing eligibility guard is correctly
 * wired into the real v6/outputService → generateFinalOutput() path.
 * 
 * IT1: V4 dictation "Lokalanästhesie" with NO anesthesia_type answer
 *      → output.billingCodes must NOT include BEMA_40/BEMA_41a
 * 
 * IT2: Same dictation but with user answer anesthesia_type=infiltr
 *      → billingCodes includes BEMA_40
 * 
 * NOTE: The production pipeline uses extracted.mentioned.anesthesia.type from LLM.
 * For IT3 (explicit dictation), we must set mentioned.anesthesia in extraction.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { generateFinalOutput } from '../../v6/services/outputService';

// Skip DEV checks to avoid "dead answer" errors in test environment
beforeEach(() => {
    globalThis.__SKIP_DEV_CHECKS__ = true;
});

afterEach(() => {
    globalThis.__SKIP_DEV_CHECKS__ = false;
});

describe('Integration: Billing Eligibility Guard in Production Pipeline', () => {

    /**
     * Helper to create minimal extraction.
     * 
     * The production pipeline uses:
     * - rawDictation: for billing guard's provenance detection
     * - mentioned.anesthesia.type: for chipResolver's extractionMapping
     */
    function createExtraction(
        tooth: string,
        surfaces: string[],
        rawDictation: string,
        options?: {
            anesthesiaType?: 'infiltr' | 'leitung';
        }
    ) {
        const extraction: Record<string, any> = {
            tooth,
            surfaces,
            diagnosis: 'caries',
            rawDictation,
            mentioned: {}
        };

        // Set mentioned.anesthesia.type (what LLM extraction would provide)
        if (options?.anesthesiaType) {
            extraction.mentioned.anesthesia = { type: options.anesthesiaType };
        }

        return extraction;
    }

    describe('IT1: V4 - Generic "Lokalanästhesie" without confirmation', () => {

        it('should NOT include anesthesia billing when type not confirmed', async () => {
            // V4 scenario: Generic anesthesia in rawDictation but NO type in extraction
            const extracted = createExtraction('26', ['o'], 'Zahn 26, Okklusalfüllung, Lokalanästhesie.');

            const result = await generateFinalOutput({
                extracted: extracted as any,
                answers: new Map(),
                insuranceType: 'GKV',
                textLength: 'kurz',
                hasMKV: false,
                treatmentId: 'fuellung',
            });

            const hasAnesthesiaBilling = result.billingCodes.some(code =>
                code.includes('BEMA_40') || code.includes('BEMA_41') ||
                code.includes('GOZ_0090') || code.includes('GOZ_0100')
            );

            console.log('[IT1] billingCodes:', result.billingCodes);
            expect(hasAnesthesiaBilling).toBe(false);
            expect(result.billingCodes.some(c => c.includes('BEMA_13'))).toBe(true);
        });

        it('should block BEMA_40 even when tooth position suggests infiltration', async () => {
            const extracted = createExtraction('14', ['m'], 'Zahn 14, mesiale Füllung, Anästhesie durchgeführt.');

            const result = await generateFinalOutput({
                extracted: extracted as any,
                answers: new Map(),
                insuranceType: 'GKV',
                textLength: 'kurz',
                hasMKV: false,
                treatmentId: 'fuellung',
            });

            const hasAnesthesiaBilling = result.billingCodes.some(code =>
                code.includes('BEMA_40') || code.includes('BEMA_41')
            );

            console.log('[IT1b] billingCodes:', result.billingCodes);
            expect(hasAnesthesiaBilling).toBe(false);
        });
    });

    describe('IT2: User confirms anesthesia_type', () => {

        it('should INCLUDE BEMA_40 when user answers anesthesia_type=infiltr', async () => {
            // Extraction has generic anesthesia mention, user confirms type
            const extracted = createExtraction('26', ['o'], 'Zahn 26, Okklusalfüllung, Lokalanästhesie.', {
                anesthesiaType: 'infiltr' // LLM extracted type OR user confirmed
            });

            const answers = new Map<string, unknown>();
            answers.set('anesthesia_type', 'infiltr');

            const result = await generateFinalOutput({
                extracted: extracted as any,
                answers,
                insuranceType: 'GKV',
                textLength: 'kurz',
                hasMKV: false,
                treatmentId: 'fuellung',
            });

            console.log('[IT2] billingCodes:', result.billingCodes);
            expect(result.billingCodes).toContain('BEMA_40');
        });

        it('should INCLUDE BEMA_41a when user answers anesthesia_type=leitung', async () => {
            const extracted = createExtraction('36', ['m', 'o', 'd'], 'Zahn 36, MOD, Lokalanästhesie.', {
                anesthesiaType: 'leitung'
            });

            const answers = new Map<string, unknown>();
            answers.set('anesthesia_type', 'leitung');

            const result = await generateFinalOutput({
                extracted: extracted as any,
                answers,
                insuranceType: 'GKV',
                textLength: 'kurz',
                hasMKV: false,
                treatmentId: 'fuellung',
            });

            console.log('[IT2b] billingCodes:', result.billingCodes);
            expect(result.billingCodes).toContain('BEMA_41a');
        });
    });

    describe('IT3: Explicit anesthesia type in dictation', () => {

        it('should INCLUDE BEMA_40 when "Infiltration" is explicit in dictation', async () => {
            // LLM would extract type from explicit mention
            const extracted = createExtraction('47', ['m', 'o', 'd'],
                'Zahn 47, MOD, Infiltration mit Articain, Komposit, Kofferdam.', {
                anesthesiaType: 'infiltr' // LLM extracted from dictation
            });

            const result = await generateFinalOutput({
                extracted: extracted as any,
                answers: new Map(),
                insuranceType: 'GKV',
                textLength: 'kurz',
                hasMKV: false,
                treatmentId: 'fuellung',
            });

            console.log('[IT3] billingCodes:', result.billingCodes);
            expect(result.billingCodes).toContain('BEMA_40');
        });

        it('should INCLUDE BEMA_41a when "Leitungsanästhesie" is explicit', async () => {
            const extracted = createExtraction('37', ['o'],
                'Zahn 37, okklusal, Leitungsanästhesie, Komposit.', {
                anesthesiaType: 'leitung'
            });

            const result = await generateFinalOutput({
                extracted: extracted as any,
                answers: new Map(),
                insuranceType: 'GKV',
                textLength: 'kurz',
                hasMKV: false,
                treatmentId: 'fuellung',
            });

            console.log('[IT3b] billingCodes:', result.billingCodes);
            expect(result.billingCodes).toContain('BEMA_41a');
        });
    });

    describe('IT4: MKV policy chips', () => {

        it('should include GOZ_2197 when hasMKV=true (settings_policy)', async () => {
            const extracted = createExtraction('36', ['m', 'o', 'd'],
                'Zahn 36, MOD, Kompositfüllung, Mehrschichttechnik.');

            const result = await generateFinalOutput({
                extracted: extracted as any,
                answers: new Map(),
                insuranceType: 'GKV',
                textLength: 'kurz',
                hasMKV: true,
                treatmentId: 'fuellung',
            });

            console.log('[IT4] billingCodes:', result.billingCodes);
            expect(result.billingCodes).toContain('GOZ_2197');
        });

        it('should NOT include GOZ_2197 when hasMKV=false', async () => {
            const extracted = createExtraction('36', ['m', 'o', 'd'],
                'Zahn 36, MOD, Kompositfüllung.');

            const result = await generateFinalOutput({
                extracted: extracted as any,
                answers: new Map(),
                insuranceType: 'GKV',
                textLength: 'kurz',
                hasMKV: false,
                treatmentId: 'fuellung',
            });

            console.log('[IT4b] billingCodes:', result.billingCodes);
            expect(result.billingCodes).not.toContain('GOZ_2197');
        });
    });
});
