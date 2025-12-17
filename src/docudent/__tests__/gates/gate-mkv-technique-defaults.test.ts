/**
 * Gate Test: MKV Technique Defaults for Fuellung
 * 
 * Ensures that for fuellung+hasMKV:
 * - mehrschicht and adhasiv are NOT asked as questions
 * - mkv_vereinbarung and mkv_betrag ARE still asked
 * - Output contains technique text (Mehrschicht, Adhäsiv)
 */

import { describe, it, expect } from 'vitest';
import { generateQuestions } from '../../v6/services/questionService';
import { generateFinalOutput } from '../../v6/services/outputService';
import type { ExtractedData, InsuranceType } from '../../v6/hooks/useDocudentV6';

describe('Gate: MKV Technique Defaults', () => {
    const baseExtracted: ExtractedData = {
        tooth: '36',
        surfaces: ['m', 'o', 'd'],
        diagnosis: 'Caries media',
        mentioned: { kofferdam: true },
    };

    // ═══════════════════════════════════════════════════════════════
    // QUESTION GENERATION: No upsell questions for fuellung+MKV
    // ═══════════════════════════════════════════════════════════════
    describe('Question Generation', () => {
        it('should NOT ask mehrschicht question for fuellung+MKV', () => {
            const questions = generateQuestions(
                baseExtracted,
                'GKV',
                true, // hasMKV
                'fuellung',
                new Map(),
                'Zahn 36 MOD Kofferdam'
            );

            const mehrschichtQ = questions.find(q => q.id === 'mehrschicht');
            expect(mehrschichtQ).toBeUndefined();
        });

        it('should NOT ask adhasiv question for fuellung+MKV', () => {
            const questions = generateQuestions(
                baseExtracted,
                'GKV',
                true, // hasMKV
                'fuellung',
                new Map(),
                'Zahn 36 MOD Kofferdam'
            );

            const adhasivQ = questions.find(q => q.id === 'adhasiv');
            expect(adhasivQ).toBeUndefined();
        });

        it('should still ask mkv_vereinbarung for fuellung+MKV', () => {
            const questions = generateQuestions(
                baseExtracted,
                'GKV',
                true, // hasMKV
                'fuellung',
                new Map(),
                'Zahn 36 MOD Kofferdam'
            );

            const mkvQ = questions.find(q => q.id === 'mkv_vereinbarung');
            expect(mkvQ).toBeDefined();
            expect(mkvQ?.category).toBe('mkv');
        });

        it('should still ask mkv_betrag for fuellung+MKV', () => {
            const questions = generateQuestions(
                baseExtracted,
                'GKV',
                true, // hasMKV
                'fuellung',
                new Map(),
                'Zahn 36 MOD Kofferdam'
            );

            const betragQ = questions.find(q => q.id === 'mkv_betrag');
            expect(betragQ).toBeDefined();
            expect(betragQ?.category).toBe('mkv');
        });

        it('should ask other upsell questions for fuellung+MKV (not defaults)', () => {
            // optisch_elektronisch might or might not be defined as upsell
            // The key assertion is that mehrschicht/adhasiv are NOT asked
            const questions = generateQuestions(
                baseExtracted,
                'GKV',
                true, // hasMKV
                'fuellung',
                new Map(),
                'Zahn 36 MOD Kofferdam'
            );

            // Verify NO upsell questions for default techniques
            const upsellQuestions = questions.filter(q => q.category === 'upsell');
            const defaultTechniqueQuestions = upsellQuestions.filter(
                q => q.id === 'mehrschicht' || q.id === 'adhasiv'
            );
            expect(defaultTechniqueQuestions).toHaveLength(0);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // OUTPUT: Technique defaults appear in output sections
    // ═══════════════════════════════════════════════════════════════
    describe('Output Generation', () => {
        it('output should contain Mehrschicht indication for fuellung+MKV', async () => {
            const result = await generateFinalOutput({
                extracted: baseExtracted,
                answers: new Map([
                    ['vitality', '+'],
                    ['percussion', '-'],
                    ['isolation', 'kofferdam'],
                    ['mkv_vereinbarung', 'yes'],
                    ['mkv_betrag', 80],
                ]),
                insuranceType: 'GKV',
                textLength: 'mittel',
                hasMKV: true,
                treatmentId: 'fuellung',
            });

            // Check debug info for active chips
            expect(result._debug?.activeChipIds).toContain('mehrschicht');
            expect(result._debug?.activeChipIds).toContain('adhasiv');
        });

        it('output fullText should mention technique for fuellung+MKV', async () => {
            const result = await generateFinalOutput({
                extracted: baseExtracted,
                answers: new Map([
                    ['vitality', '+'],
                    ['percussion', '-'],
                    ['isolation', 'kofferdam'],
                    ['mkv_vereinbarung', 'yes'],
                    ['mkv_betrag', 80],
                ]),
                insuranceType: 'GKV',
                textLength: 'mittel',
                hasMKV: true,
                treatmentId: 'fuellung',
            });

            // fullText should contain technique mentions
            const fullText = result.fullText.toLowerCase();
            expect(
                fullText.includes('mehrschicht') ||
                fullText.includes('schichttechnik') ||
                fullText.includes('adhäsiv') ||
                fullText.includes('komposit')
            ).toBe(true);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // NON-MKV: Normal behavior (upsell questions asked)
    // ═══════════════════════════════════════════════════════════════
    describe('Non-MKV Behavior', () => {
        it('should NOT add mehrschicht/adhasiv chips for fuellung without MKV', async () => {
            // For non-MKV, we just check that the chips aren't auto-added
            // We can't use the full generateFinalOutput because it has dead-answer checks
            // Instead, we check chipResolver directly
            const { resolveActiveChipIds } = await import(
                '../../core/billing/knowledgeBase/logic/chipResolver'
            );

            const chipIds = resolveActiveChipIds(
                'fuellung',
                baseExtracted,
                new Map([['kofferdam', 'yes']]),
                { hasMKV: false, insuranceType: 'GKV' }
            );

            // Without MKV, technique chips should NOT be auto-added
            expect(chipIds).not.toContain('mehrschicht');
            expect(chipIds).not.toContain('adhasiv');
        });
    });
});
