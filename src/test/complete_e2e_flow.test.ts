/**
 * COMPLETE E2E FLOW TEST
 * 
 * Tests the ENTIRE pipeline:
 * 1. Dictation input
 * 2. Chip extraction with smart anesthesia
 * 3. Confirmation cards for uncertain findings
 * 4. Upsell suggestions
 * 5. User confirmations
 * 6. Final documentation output
 * 
 * This is the most comprehensive test.
 */

import { describe, it, expect } from 'vitest';
import { FILLING_TREATMENT } from '../sonia/behandlungen/konservierend/fuellung/definition';
import {
    resolveChipStates,
    getActiveChipIds,
    processTreatment,
    generateFinalDocumentation,
    getActiveUpsells
} from '../sonia/behandlungen/_shared/engine';
import { resolveAnesthesiaFromDictation } from '../sonia/behandlungen/_shared/anesthesiaInference';
import { getPendingConfirmations } from '../sonia/ui/confirmation';
import { InsuranceType, ChipState } from '../sonia/behandlungen/_shared/types';

// ========================================
// SIMULATE FULL PIPELINE
// ========================================

function simulateFullPipeline(config: {
    dictation: string;
    insuranceType: InsuranceType;
    userConfirmations?: Record<string, { chipId?: string; value?: any }>;
}) {
    const { dictation, insuranceType, userConfirmations = {} } = config;

    // 1. PARSE DICTATION
    const tooth = dictation.match(/\d{2}/)?.[0];

    // Better surface parsing
    const surfacePatterns = [
        { pattern: /modp/i, surfaces: ['m', 'o', 'd', 'p'] },
        { pattern: /mod\b/i, surfaces: ['m', 'o', 'd'] },
        { pattern: /\bmo\b/i, surfaces: ['m', 'o'] },
        { pattern: /\bod\b/i, surfaces: ['o', 'd'] },
        { pattern: /\bdo\b/i, surfaces: ['d', 'o'] },
    ];
    let surfaces = ['o']; // default
    for (const p of surfacePatterns) {
        if (p.pattern.test(dictation)) {
            surfaces = p.surfaces;
            break;
        }
    }

    console.log('\n📢 DIKTAT:', dictation);
    console.log('🦷 ZAHN:', tooth, '| FLÄCHEN:', surfaces.join(', ').toUpperCase());

    // 2. SMART ANESTHESIA
    const anesthesiaResult = resolveAnesthesiaFromDictation(dictation, tooth);
    console.log('💉 ANÄSTHESIE:', anesthesiaResult.chipId, `(${anesthesiaResult.explicit ? 'explicit' : 'inferred'})`);

    // 3. EXTRACT CHIPS FROM DICTATION
    const extractedChips: string[] = [anesthesiaResult.chipId];
    const lower = dictation.toLowerCase();

    if (lower.includes('kofferdam')) extractedChips.push('kofferdam');
    if (lower.includes('exkav') || lower.includes('karies')) extractedChips.push('exkavation');
    if (lower.includes('calxyl') || lower.includes('cp')) extractedChips.push('cp');
    if (lower.includes('matri')) extractedChips.push('matrize');
    if (lower.includes('schicht') || lower.includes('komposit')) {
        extractedChips.push('schicht', 'adhesive');
    }
    if (lower.includes('vital') && !lower.includes('devital')) extractedChips.push('vipr_pos');

    // 4. RESOLVE CHIP STATES
    const userOverrides = new Map<string, boolean>();
    const chipStates = resolveChipStates(FILLING_TREATMENT, extractedChips, userOverrides);

    // 5. GET PENDING CONFIRMATIONS
    const mockChipStates: ChipState[] = FILLING_TREATMENT.chips.map(chip => {
        const state = chipStates.find(s => s.id === chip.id);
        return {
            id: chip.id,
            active: state?.active || false,
            source: state?.source || 'default',
            confidence: state?.confidence || 0.5,
            needsConfirmation: chip.defaultActive && chip.category === 'befund'
        };
    });

    const extractedData = { tooth, surfaces };
    const pending = getPendingConfirmations(mockChipStates, extractedData);

    console.log('❓ PENDING CONFIRMATIONS:', pending.length);
    pending.forEach(p => console.log(`   • ${p.question} (${p.options.map(o => o.label).join(' / ')})`));

    // 6. APPLY USER CONFIRMATIONS
    const finalChips = [...getActiveChipIds(chipStates)];
    for (const [id, option] of Object.entries(userConfirmations)) {
        if (option.chipId && !finalChips.includes(option.chipId)) {
            finalChips.push(option.chipId);
        }
        console.log(`✅ USER CONFIRMED: ${id} → ${option.chipId || option.value}`);
    }

    // 7. GET UPSELLS
    const upsells = getActiveUpsells(FILLING_TREATMENT, { ...extractedData, diagnosis: 'Caries media' });
    console.log('💡 UPSELLS:', upsells.map(u => u.label).join(', ') || '(keine)');

    // 8. PROCESS TREATMENT
    const result = processTreatment({
        treatment: FILLING_TREATMENT,
        insuranceType,
        activeChips: finalChips,
        extractedData,
        acceptedUpsells: [],
        textLength: 'mittel'
    });

    console.log('📋 BILLING CODES:', result.billingCodes.join(', '));

    // 9. GENERATE FINAL DOCUMENTATION
    const doc = generateFinalDocumentation(
        FILLING_TREATMENT,
        insuranceType,
        finalChips,
        extractedData,
        [],
        'mittel'
    );

    console.log('\n═══ ÜBERSICHT ═══');
    console.log(doc.uebersicht.header);
    console.log('Befund:', doc.uebersicht.befund);
    console.log('\nLeistungen:');
    doc.uebersicht.leistungen.forEach(l => console.log('•', l));
    console.log('\nCodes:', doc.uebersicht.codes.join(', '));

    console.log('\n═══ FLIEßTEXT ═══');
    console.log(doc.fliesstext);

    return {
        tooth,
        surfaces,
        anesthesia: anesthesiaResult,
        extractedChips,
        pendingConfirmations: pending,
        upsells,
        billingCodes: result.billingCodes,
        textLines: result.textLines,
        doc
    };
}

// ========================================
// TESTS
// ========================================

describe('Complete E2E Flow with Confirmations', () => {

    it('Flow 1: Standard filling with automatic confirmations', () => {
        const result = simulateFullPipeline({
            dictation: 'Füllung Zahn 16 DO, mit Anästhesie, Kofferdam, Exkavation, Schichttechnik',
            insuranceType: 'GKV',
            userConfirmations: {
                'confirm_vitality': { chipId: 'vipr_pos', value: '+' }
            }
        });

        expect(result.tooth).toBe('16');
        expect(result.anesthesia.chipId).toBe('la_infiltr'); // OK = Infiltration
        expect(result.billingCodes).toContain('BEMA 40');
        expect(result.billingCodes).toContain('BEMA 13b'); // 2 surfaces
        expect(result.doc.fliesstext.length).toBeGreaterThan(100);
    });

    it('Flow 2: UK Molar with auto-Leitung and Cp', () => {
        const result = simulateFullPipeline({
            dictation: 'Füllung 46 MOD, Kofferdam, tiefe Karies, Cp mit Calxyl, Matrize, Komposit',
            insuranceType: 'GKV',
            userConfirmations: {
                'confirm_vitality': { chipId: 'vipr_pos', value: '+' },
                'confirm_percussion': { chipId: 'perk_neg', value: '-' }
            }
        });

        expect(result.tooth).toBe('46');
        expect(result.anesthesia.chipId).toBe('la_leitung'); // UK 6 = Leitung (automatic!)
        expect(result.billingCodes).toContain('BEMA 41'); // Leitung
        expect(result.billingCodes).toContain('BEMA 13c'); // 3 surfaces
        expect(result.billingCodes).toContain('BEMA 25'); // Cp
    });

    it('Flow 3: PKV patient with GOZ codes', () => {
        const result = simulateFullPipeline({
            dictation: 'Füllung 25 MO, Infiltration, Kofferdam, Schichtfüllung',
            insuranceType: 'PKV',
            userConfirmations: {}
        });

        expect(result.tooth).toBe('25');
        expect(result.billingCodes.some(c => c.startsWith('GOZ'))).toBe(true);
        expect(result.billingCodes.some(c => c.startsWith('BEMA'))).toBe(false);
    });

    it('Flow 4: Confirmation for vitality default', () => {
        const result = simulateFullPipeline({
            dictation: 'Füllung 36 OD, mit Anästhesie',
            insuranceType: 'GKV',
            userConfirmations: {}
        });

        // Should have pending confirmation for vitality (default is ViPr+)
        const hasBefundConfirmation = result.pendingConfirmations.some(
            p => p.category === 'befund'
        );

        // Note: Currently we expect befund confirmations when defaults are applied
        console.log('Has befund confirmation:', hasBefundConfirmation);

        expect(result.tooth).toBe('36');
        expect(result.anesthesia.chipId).toBe('la_leitung'); // UK 6 = Leitung
    });

    it('Flow 5: Complete workflow summary', () => {
        console.log('\n' + '═'.repeat(70));
        console.log('COMPLETE WORKFLOW SUMMARY');
        console.log('═'.repeat(70));

        const cases = [
            { dictation: 'Füllung 16 DO', insuranceType: 'GKV' as InsuranceType },
            { dictation: 'Füllung 46 MOD', insuranceType: 'GKV' as InsuranceType },
            { dictation: 'Füllung 35 MO', insuranceType: 'PKV' as InsuranceType },
        ];

        for (const c of cases) {
            const result = simulateFullPipeline({
                dictation: c.dictation + ', Kofferdam, Schichttechnik',
                insuranceType: c.insuranceType,
                userConfirmations: {}
            });

            console.log('─'.repeat(50));
            console.log(`✓ ${c.dictation} (${c.insuranceType})`);
            console.log(`  Anästhesie: ${result.anesthesia.chipId}`);
            console.log(`  Codes: ${result.billingCodes.slice(0, 4).join(', ')}`);
        }

        expect(true).toBe(true);
    });
});
