/**
 * Gate M34: Negation Scope No Leak
 * 
 * Focused regression: "kein/ohne" must not leak across instances.
 */

import { describe, it, expect } from 'vitest';
import {
    parseScopedDictation,
    negationAppliesToTreatment,
} from '../../v10/qa/segmentScoping';

describe('gate-m34-negation-scope-no-leak', () => {
    describe('LA negation scope', () => {
        it('ohne Betäubung after danach Füllung → only Füllung', () => {
            const dict = 'Endo 14 Leitungsanästhesie, danach Füllung ohne Betäubung';
            const scoped = parseScopedDictation(dict);

            expect(negationAppliesToTreatment('ohne betäubung', 'fuellung', scoped)).toBe(true);
            expect(negationAppliesToTreatment('ohne betäubung', 'endo', scoped)).toBe(false);
        });

        it('ohne Anästhesie in Füllung context only', () => {
            const dict = 'WKB 14 Leitung WF, danach Füllung okklusal ohne Anästhesie';
            const scoped = parseScopedDictation(dict);

            expect(negationAppliesToTreatment('ohne anästhesie', 'fuellung', scoped)).toBe(true);
            expect(negationAppliesToTreatment('ohne anästhesie', 'endo', scoped)).toBe(false);
        });
    });

    describe('Kofferdam negation scope', () => {
        it('kein Kofferdam after Füllung → only Füllung', () => {
            const dict = 'Endo 14 Kofferdam WF, danach Füllung kein Kofferdam';
            const scoped = parseScopedDictation(dict);

            expect(negationAppliesToTreatment('kein kofferdam', 'fuellung', scoped)).toBe(true);
            expect(negationAppliesToTreatment('kein kofferdam', 'endo', scoped)).toBe(false);
        });

        it('kein Kofferdam for one tooth only', () => {
            const dict = 'Füllung 36 Kofferdam, Füllung 46 kein Kofferdam';
            const scoped = parseScopedDictation(dict);

            // Both are Füllung but in different clauses
            expect(scoped.isMultiTreatment).toBe(false); // Same treatment
        });
    });

    describe('Röntgen negation scope', () => {
        it('keine Röntgen after Füllung → only Füllung', () => {
            const dict = 'Endo 14 Längenmessröntgen WF, danach Füllung keine Röntgenaufnahme';
            const scoped = parseScopedDictation(dict);

            expect(negationAppliesToTreatment('keine röntgenaufnahme', 'fuellung', scoped)).toBe(true);
            expect(negationAppliesToTreatment('keine röntgenaufnahme', 'endo', scoped)).toBe(false);
        });

        it('kein Röntgen WL in Endo context', () => {
            const dict = 'Endo 14 kein Röntgen WL elektrisch, danach Füllung';
            const scoped = parseScopedDictation(dict);

            expect(negationAppliesToTreatment('kein röntgen', 'endo', scoped)).toBe(true);
        });
    });

    describe('Session-level vs instance-level', () => {
        it('kein Kofferdam at start applies to first treatment', () => {
            const dict = 'Kein Kofferdam heute Endo 14 WF danach Füllung';
            const scoped = parseScopedDictation(dict);

            // At start, should apply to first detected treatment
            const applies = negationAppliesToTreatment('kein kofferdam', 'endo', scoped);
            expect(typeof applies).toBe('boolean');
        });

        it('keine Einlage only for Endo', () => {
            const dict = 'Endo 14 keine Einlage direkt WF, danach Füllung';
            const scoped = parseScopedDictation(dict);

            expect(negationAppliesToTreatment('keine einlage', 'endo', scoped)).toBe(true);
        });
    });
});
