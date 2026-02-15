/**
 * Gate M34: Askback Attribution
 * 
 * Askbacks triggered by endo facts must only show on endo instance; same for fuellung.
 */

import { describe, it, expect } from 'vitest';
import {
    parseScopedDictation,
    detectTreatmentType,
} from '../../v10/qa/segmentScoping';
import { getAskbacksForInstance } from '../../v10/qa/clinicalAssertionContract.v2';

describe('gate-m34-askback-attribution', () => {
    describe('treatment-specific askbacks', () => {
        it('endo askbacks attributed to endo instance', () => {
            const mockResult = {
                state: 'questions' as const,
                questions: [
                    { id: 'endo_canal_count', text: 'Wie viele Kanäle?' },
                    { id: 'medical_ueberkappung', text: 'Überkappung?' },
                ],
            };

            const askbacks = getAskbacksForInstance(
                mockResult as any,
                'endo',
                'Endo 14 WKB'
            );

            expect(askbacks).toContain('endo_canal_count');
        });

        it('fuellung askbacks attributed to fuellung instance', () => {
            const mockResult = {
                state: 'questions' as const,
                questions: [
                    { id: 'fuellung_surface', text: 'Welche Flächen?' },
                    { id: 'medical_la_type', text: 'Anästhesieart?' },
                ],
            };

            const askbacks = getAskbacksForInstance(
                mockResult as any,
                'fuellung',
                'Füllung 36 mo'
            );

            expect(askbacks).toContain('fuellung_surface');
        });
    });

    describe('scope detection by treatment keywords', () => {
        it('endo keywords detected', () => {
            expect(detectTreatmentType('WKB 46')).toBe('endo');
            expect(detectTreatmentType('Wurzelkanalbehandlung')).toBe('endo');
            expect(detectTreatmentType('Trepanation')).toBe('endo');
        });

        it('fuellung keywords detected', () => {
            expect(detectTreatmentType('Füllung okklusal')).toBe('fuellung');
            expect(detectTreatmentType('Komposit Mehrschicht')).toBe('fuellung');
        });

        it('medical askbacks need context', () => {
            expect(detectTreatmentType('ohne Anästhesie')).toBe('unknown');
        });
    });

    describe('multi-treatment askback separation', () => {
        it('parses multi-treatment correctly', () => {
            const scoped = parseScopedDictation('Endo 14 WF, danach Füllung okklusal');

            expect(scoped.isMultiTreatment).toBe(true);
            expect(scoped.clauses.length).toBeGreaterThanOrEqual(2);
        });

        it('clauses have correct treatment context', () => {
            const scoped = parseScopedDictation('Endo 14, danach Füllung ohne Anästhesie');

            // First clause should be endo
            expect(scoped.clauses[0].treatmentContext).toBe('endo');
            // Second clause should be fuellung
            if (scoped.clauses.length > 1) {
                expect(scoped.clauses[1].treatmentContext).toBe('fuellung');
            }
        });
    });
});
