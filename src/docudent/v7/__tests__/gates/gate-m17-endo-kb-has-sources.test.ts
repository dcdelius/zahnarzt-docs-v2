/**
 * M17 Gate: Endo KB Has Sources
 *
 * Verifies that all endo-related KB entries have proper sourceRefs.
 */

import { describe, it, expect } from 'vitest';
import medicalKb from '../../../medical_kb/medical_kb.v1.json';

describe('Gate M17: Endo KB Has Sources', () => {
    describe('Endo Concepts', () => {
        const endoConcepts = (medicalKb as any).endoConcepts || [];

        it('has at least 3 endo concepts', () => {
            expect(endoConcepts.length).toBeGreaterThanOrEqual(3);
        });

        for (const concept of endoConcepts) {
            it(`concept "${concept.name}" has sourceRefs`, () => {
                expect(concept.sourceRefs).toBeDefined();
                expect(concept.sourceRefs.length).toBeGreaterThan(0);
            });

            it(`concept "${concept.name}" has valid id`, () => {
                expect(concept.id).toBeDefined();
                expect(concept.id.startsWith('endo-')).toBe(true);
            });
        }
    });

    describe('Endo Rules', () => {
        const endoRules = (medicalKb as any).endoRules || [];

        it('has at least 3 endo rules', () => {
            expect(endoRules.length).toBeGreaterThanOrEqual(3);
        });

        for (const rule of endoRules) {
            it(`rule "${rule.name}" has sourceRefs`, () => {
                expect(rule.sourceRefs).toBeDefined();
                expect(rule.sourceRefs.length).toBeGreaterThan(0);
            });

            it(`rule "${rule.name}" has when/then clauses`, () => {
                expect(rule.when).toBeDefined();
                expect(rule.then).toBeDefined();
            });
        }
    });

    describe('Endo Askbacks', () => {
        const endoAskbacks = (medicalKb as any).endoAskbacks || [];

        it('has at least 5 endo askbacks', () => {
            expect(endoAskbacks.length).toBeGreaterThanOrEqual(5);
        });

        for (const askback of endoAskbacks) {
            it(`askback "${askback.name}" has sourceRefs`, () => {
                expect(askback.sourceRefs).toBeDefined();
                expect(askback.sourceRefs.length).toBeGreaterThan(0);
            });

            it(`askback "${askback.name}" has questionKey`, () => {
                expect(askback.questionKey).toBeDefined();
                expect(askback.questionKey.length).toBeGreaterThan(0);
            });

            it(`askback "${askback.name}" has treatmentId=endo`, () => {
                expect(askback.treatmentId).toBe('endo');
            });
        }
    });

    describe('Endo Chips', () => {
        const chips = (medicalKb as any).chips || [];
        const endoChips = chips.filter((c: any) => c.treatmentId === 'endo');

        it('has at least 7 endo chips', () => {
            expect(endoChips.length).toBeGreaterThanOrEqual(7);
        });

        for (const chip of endoChips) {
            it(`chip "${chip.name}" has sourceRefs`, () => {
                expect(chip.sourceRefs).toBeDefined();
                expect(chip.sourceRefs.length).toBeGreaterThan(0);
            });

            it(`chip "${chip.name}" has kbChipId`, () => {
                expect(chip.kbChipId).toBeDefined();
                expect(chip.kbChipId.startsWith('endo_')).toBe(true);
            });
        }
    });
});
