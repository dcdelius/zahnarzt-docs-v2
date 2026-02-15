/**
 * Gate M9: No Chip Without KB Definition
 *
 * Verifies that every chip emitted by medical engine exists in treatment KB.
 */

import { describe, it, expect } from 'vitest';
import { medicalKb } from '../../../medical_kb';
import { hasChipInKb, getAllChipIds, validateMedicalChipsExistInKb } from '../../output';

describe('Gate M9: No Chip Without KB Definition', () => {
    // ═══════════════════════════════════════════════════════════════
    // TEST: All medical KB chips exist in fuellung KB
    // ═══════════════════════════════════════════════════════════════

    describe('Medical KB chips in fuellung', () => {
        // Collect all chip IDs that medical engine can emit FOR FUELLUNG
        const medicalChipIds = new Set<string>();

        // From chip definitions (only chips without treatmentId or treatmentId='fuellung')
        for (const chip of medicalKb.chips) {
            const treatmentId = (chip as any).treatmentId;
            if (!treatmentId || treatmentId === 'fuellung') {
                medicalChipIds.add(chip.kbChipId);
            }
        }

        // From rule actions (only rules without endo tag)
        for (const rule of medicalKb.rules) {
            if (!(rule.tags || []).includes('endo')) {
                for (const action of rule.then) {
                    if (action.type === 'emit_chip' && action.target) {
                        medicalChipIds.add(action.target);
                    }
                }
            }
        }

        it('all fuellung medical chips exist in fuellung unified.json', () => {
            const validation = validateMedicalChipsExistInKb(
                Array.from(medicalChipIds),
                'fuellung'
            );

            expect(validation.missing).toHaveLength(0);
            expect(validation.valid).toBe(true);
        });

        // Individual chip tests for clarity
        const knownMedicalChips = ['cp', 'cp_not_required'];

        for (const chipId of knownMedicalChips) {
            it(`chip "${chipId}" exists in fuellung KB`, () => {
                expect(hasChipInKb('fuellung', chipId)).toBe(true);
            });
        }
    });

    // ═══════════════════════════════════════════════════════════════
    // TEST: Fuellung KB has expected core chips
    // ═══════════════════════════════════════════════════════════════

    describe('Fuellung KB coverage', () => {
        const expectedCoreChips = [
            'vipr_pos',
            'vipr_neg',
            'perk_neg',
            'la_infiltr',
            'la_leitung',
            'kofferdam',
            'cp',
            'cp_not_required',
        ];

        for (const chipId of expectedCoreChips) {
            it(`core chip "${chipId}" exists`, () => {
                expect(hasChipInKb('fuellung', chipId)).toBe(true);
            });
        }
    });

    // ═══════════════════════════════════════════════════════════════
    // TEST: All chips have required text snippets
    // ═══════════════════════════════════════════════════════════════

    describe('Chip text coverage', () => {
        const allChips = getAllChipIds('fuellung');

        it('all chips have at least one text snippet', () => {
            const kb = require('../../../core/billing/knowledgeBase/treatments/fuellung/unified.json');

            for (const chip of kb.chips) {
                const hasAnyText =
                    chip.textSnippets?.kurz ||
                    chip.textSnippets?.mittel ||
                    chip.textSnippets?.lang;

                expect(hasAnyText, `Chip ${chip.id} has no text snippets`).toBeTruthy();
            }
        });
    });
});
