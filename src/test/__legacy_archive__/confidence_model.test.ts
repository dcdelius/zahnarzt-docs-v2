/**
 * CONFIDENCE MODEL + OVERRIDE LOGIC TESTS
 * 
 * Tests for:
 * 1. scoreConfidence() deterministic calculation
 * 2. Thresholds by field class (befund/meta/prozess)
 * 3. resolveChipStates() with user > dictation > default priority
 * 4. Mutual exclusivity enforcement
 * 5. Backwards compatibility with existing workflow
 */

import { describe, it, expect } from 'vitest';
import {
    scoreConfidence,
    getThresholdForField,
    needsConfirmation,
    applyConfidenceToExtraction
} from '../sonia/extraction/normalizeExtractedData';
import {
    resolveChipStates,
    getActiveChipIds,
    chipNeedsConfirmation,
    processTreatment,
    generateFinalDocumentation
} from '../sonia/behandlungen/_shared/engine';
import { FILLING_TREATMENT } from '../sonia/behandlungen/konservierend/fuellung/definition';
import { FIELD_THRESHOLDS } from '../sonia/behandlungen/_shared/types';

describe('Confidence Model Tests', () => {

    // ========================================
    // TEST 1: scoreConfidence deterministic
    // ========================================

    describe('scoreConfidence() deterministic calculation', () => {
        it('user source always returns 1.0', () => {
            expect(scoreConfidence('tooth', '16', undefined, 'user')).toBe(1.0);
            expect(scoreConfidence('diagnosis', 'Caries', ['irgendwas'], 'user')).toBe(1.0);
        });

        it('default source returns 0.5', () => {
            expect(scoreConfidence('vitality', true, undefined, 'default')).toBe(0.5);
        });

        it('inferred source returns 0.3', () => {
            expect(scoreConfidence('tooth', '16', undefined, 'inferred')).toBe(0.3);
        });

        it('dictation with evidence increases confidence', () => {
            const noEvidence = scoreConfidence('tooth', '16', undefined, 'dictation');
            const shortEvidence = scoreConfidence('tooth', '16', ['16'], 'dictation');
            const longEvidence = scoreConfidence('tooth', '16', ['Füllung an Zahn 16 durchgeführt'], 'dictation');

            console.log('No evidence:', noEvidence);
            console.log('Short evidence:', shortEvidence);
            console.log('Long evidence:', longEvidence);

            expect(longEvidence).toBeGreaterThan(shortEvidence);
            expect(shortEvidence).toBeGreaterThan(noEvidence);
        });
    });

    // ========================================
    // TEST 2: Thresholds by field class
    // ========================================

    describe('Thresholds by field class', () => {
        it('befund fields have threshold 0.85', () => {
            expect(getThresholdForField('diagnosis')).toBe(0.85);
            expect(getThresholdForField('vitality')).toBe(0.85);
            expect(getThresholdForField('percussion')).toBe(0.85);
        });

        it('meta fields have threshold 0.70', () => {
            expect(getThresholdForField('tooth')).toBe(0.70);
            expect(getThresholdForField('surfaces')).toBe(0.70);
            expect(getThresholdForField('material')).toBe(0.70);
        });

        it('prozess fields have threshold 0.60', () => {
            expect(getThresholdForField('anesthesia')).toBe(0.60);
            expect(getThresholdForField('adhesive')).toBe(0.60);
        });

        it('unknown fields default to prozess threshold', () => {
            expect(getThresholdForField('unknown_field')).toBe(0.60);
        });
    });

    // ========================================
    // TEST 3: resolveChipStates priority
    // ========================================

    describe('resolveChipStates() priority: user > dictation > default', () => {
        it('defaults set chips with low confidence', () => {
            const states = resolveChipStates(FILLING_TREATMENT, [], new Map());

            // vipr_pos has defaultActive: true
            const vipr = states.find(s => s.id === 'vipr_pos');
            expect(vipr).toBeDefined();
            expect(vipr?.active).toBe(true);
            expect(vipr?.source).toBe('default');
            expect(vipr?.confidence).toBe(0.5);
        });

        it('dictation overrides defaults', () => {
            // Diktat sagt "Leitungsanästhesie" statt default "Infiltration"
            const extractedChips = ['la_leitung'];
            const states = resolveChipStates(FILLING_TREATMENT, extractedChips, new Map());

            const laLeitung = states.find(s => s.id === 'la_leitung');
            const laInfiltr = states.find(s => s.id === 'la_infiltr');

            console.log('LA Leitung:', laLeitung);
            console.log('LA Infiltr:', laInfiltr);

            expect(laLeitung?.active).toBe(true);
            expect(laLeitung?.source).toBe('dictation');

            // Infiltration sollte durch mutual exclusivity deaktiviert sein
            expect(laInfiltr?.active).toBe(false);
        });

        it('user overrides dictation', () => {
            const extractedChips = ['la_leitung'];
            const userOverrides = new Map([['la_infiltr', true]]);

            const states = resolveChipStates(FILLING_TREATMENT, extractedChips, userOverrides);

            const laInfiltr = states.find(s => s.id === 'la_infiltr');
            const laLeitung = states.find(s => s.id === 'la_leitung');

            console.log('After user override:');
            console.log('LA Infiltr:', laInfiltr);
            console.log('LA Leitung:', laLeitung);

            expect(laInfiltr?.active).toBe(true);
            expect(laInfiltr?.source).toBe('user');
            expect(laInfiltr?.confidence).toBe(1.0);

            // Leitung sollte durch mutual exclusivity deaktiviert sein
            expect(laLeitung?.active).toBe(false);
        });
    });

    // ========================================
    // TEST 4: Mutual exclusivity
    // ========================================

    describe('Mutual exclusivity enforcement', () => {
        it('activating chip deactivates exclusive chips', () => {
            const extractedChips = ['cp'];  // Cp = indirekte Überkappung
            const states = resolveChipStates(FILLING_TREATMENT, extractedChips, new Map());

            const cp = states.find(s => s.id === 'cp');
            const p = states.find(s => s.id === 'p');
            const cpNotRequired = states.find(s => s.id === 'cp_not_required');

            expect(cp?.active).toBe(true);
            expect(p?.active).toBe(false);
            expect(cpNotRequired?.active).toBe(false);
        });

        it('user click enforces mutual exclusivity', () => {
            // First: p is active via dictation
            const extractedChips = ['p'];
            // Then: user clicks cp
            const userOverrides = new Map([['cp', true]]);

            const states = resolveChipStates(FILLING_TREATMENT, extractedChips, userOverrides);

            const cp = states.find(s => s.id === 'cp');
            const p = states.find(s => s.id === 'p');

            expect(cp?.active).toBe(true);
            expect(cp?.source).toBe('user');
            expect(p?.active).toBe(false);  // Deaktiviert durch mutual exclusivity
        });
    });

    // ========================================
    // TEST 5: Backwards compatibility
    // ========================================

    describe('Backwards compatibility with existing workflow', () => {
        it('getActiveChipIds converts ChipState[] to string[]', () => {
            const states = resolveChipStates(
                FILLING_TREATMENT,
                ['la_infiltr', 'kofferdam', 'exkavation'],
                new Map()
            );

            const activeIds = getActiveChipIds(states);

            expect(activeIds).toContain('la_infiltr');
            expect(activeIds).toContain('kofferdam');
            expect(activeIds).toContain('exkavation');
            // Also includes defaults
            expect(activeIds).toContain('vipr_pos');
        });

        it('existing processTreatment still works', () => {
            // Standard workflow - ensure nothing is broken
            const context = {
                treatment: FILLING_TREATMENT,
                insuranceType: 'GKV' as const,
                activeChips: ['la_infiltr', 'kofferdam', 'exkavation', 'adhesive', 'schicht', 'vipr_pos', 'perk_neg'],
                extractedData: { surfaces: ['o', 'd'] },
                acceptedUpsells: [],
                textLength: 'mittel' as const
            };

            const result = processTreatment(context);

            console.log('Existing workflow output:');
            console.log('TextLines:', result.textLines.length);
            console.log('Billing:', result.billingCodes);

            expect(result.textLines.length).toBeGreaterThan(0);
            expect(result.billingCodes).toContain('BEMA 13b');
            expect(result.billingCodes).toContain('BEMA 40');
        });

        it('generateFinalDocumentation still works', () => {
            const doc = generateFinalDocumentation(
                FILLING_TREATMENT,
                'GKV',
                ['la_infiltr', 'kofferdam', 'exkavation', 'adhesive', 'schicht', 'vipr_pos', 'perk_neg'],
                { surfaces: ['o', 'd'] },
                [],
                'mittel'
            );

            console.log('Final documentation:');
            console.log('Fliesstext length:', doc.fliesstext.length);
            console.log('Codes:', doc.uebersicht.codes);

            expect(doc.fliesstext.length).toBeGreaterThan(200);
            expect(doc.uebersicht.codes).toContain('BEMA 13b');
        });
    });
});
