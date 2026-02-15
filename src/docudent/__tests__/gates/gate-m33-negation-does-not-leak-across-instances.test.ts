/**
 * Gate M33: Negation Does Not Leak Across Instances
 * 
 * Tests that negations in one treatment don't affect another treatment.
 */

import { describe, it, expect } from 'vitest';
import {
    parseScopedDictation,
    negationAppliesToTreatment,
} from '../../v10/qa/segmentScoping';

describe('gate-m33-negation-does-not-leak-across-instances', () => {
    describe('LA negation scoping', () => {
        it('"ohne Betäubung" after Füllung does not block Endo LA', () => {
            const dictation = 'Endo 14 Leitungsanästhesie 2 Kanäle, danach Füllung ohne Betäubung';
            const scoped = parseScopedDictation(dictation);

            // "ohne Betäubung" should only apply to Füllung
            const appliesTo = {
                endo: negationAppliesToTreatment('ohne betäubung', 'endo', scoped),
                fuellung: negationAppliesToTreatment('ohne betäubung', 'fuellung', scoped),
            };

            expect(appliesTo.fuellung).toBe(true);
            expect(appliesTo.endo).toBe(false);
        });

        it('"ohne Anästhesie" in Füllung context does not leak', () => {
            const dictation = 'Endo 14, danach Füllung okklusal ohne Anästhesie';
            const scoped = parseScopedDictation(dictation);

            const appliesTo = {
                endo: negationAppliesToTreatment('ohne anästhesie', 'endo', scoped),
                fuellung: negationAppliesToTreatment('ohne anästhesie', 'fuellung', scoped),
            };

            expect(appliesTo.fuellung).toBe(true);
            expect(appliesTo.endo).toBe(false);
        });
    });

    describe('Kofferdam negation scoping', () => {
        it('"kein Kofferdam" for Füllung does not block Endo Kofferdam', () => {
            const dictation = 'Endo 14 Kofferdam WF, danach Füllung kein Kofferdam';
            const scoped = parseScopedDictation(dictation);

            const appliesTo = {
                endo: negationAppliesToTreatment('kein kofferdam', 'endo', scoped),
                fuellung: negationAppliesToTreatment('kein kofferdam', 'fuellung', scoped),
            };

            expect(appliesTo.fuellung).toBe(true);
            expect(appliesTo.endo).toBe(false);
        });
    });

    describe('Röntgen negation scoping', () => {
        it('"keine Röntgenaufnahme" for Füllung does not block Endo Röntgen', () => {
            const dictation = 'Endo 14 Längenmessröntgen WF, danach Füllung keine Röntgenaufnahme';
            const scoped = parseScopedDictation(dictation);

            const appliesTo = {
                endo: negationAppliesToTreatment('keine röntgenaufnahme', 'endo', scoped),
                fuellung: negationAppliesToTreatment('keine röntgenaufnahme', 'fuellung', scoped),
            };

            expect(appliesTo.fuellung).toBe(true);
            expect(appliesTo.endo).toBe(false);
        });
    });

    describe('single treatment baseline', () => {
        it('single treatment - negation applies to it', () => {
            const dictation = 'Füllung 36 ohne Betäubung';
            const scoped = parseScopedDictation(dictation);

            expect(scoped.isMultiTreatment).toBe(false);

            const applies = negationAppliesToTreatment('ohne betäubung', 'fuellung', scoped);
            expect(applies).toBe(true);
        });
    });
});
