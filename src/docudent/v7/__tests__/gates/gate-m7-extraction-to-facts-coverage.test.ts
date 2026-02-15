/**
 * Gate M7: Extraction to Facts Coverage
 *
 * Tests that the mapping layer produces correct facts from extraction.
 * Ensures known triggers produce expected facts values.
 */

import { describe, it, expect } from 'vitest';
import { buildFactsFromExtraction, detectCariesDepth, detectBleeding, detectSensitivity } from '../../medical/extractionToFacts';
import { stubExtractFromDictation } from '../../pipeline/__test__/stubExtractor';

describe('Gate M7: Extraction to Facts Coverage', () => {
    // ═══════════════════════════════════════════════════════════════
    // CARIES DEPTH DETECTION
    // ═══════════════════════════════════════════════════════════════

    describe('Caries depth detection', () => {
        it.each([
            ['Caries profunda', 'profunda'],
            ['caries profunda', 'profunda'],
            ['sehr tiefe Kavität', 'profunda'],
            ['tiefe Karies', 'pulp_near'],
            ['pulpanah exkaviert', 'pulp_near'],
            ['pulpannah', 'pulp_near'], // typo variant
            ['near pulp', 'pulp_near'],
            ['deep caries', 'profunda'], // 'deep' in profunda synonyms
            ['Karies media', 'normal'],
            ['caries media', 'normal'],
            ['normale Kavität', 'normal'], // 'normal' matches normal tokens
        ])('detectCariesDepth("%s") → %s', (input, expected) => {
            expect(detectCariesDepth(input)).toBe(expected);
        });

        it('diagnosis "Caries profunda" → facts.cariesDepth = profunda', () => {
            const extracted = stubExtractFromDictation('Zahn 16 MOD bei Caries profunda.', 'fuellung');
            const facts = buildFactsFromExtraction({
                extracted: extracted as any,
                treatmentId: 'fuellung',
            });
            expect(facts.cariesDepth).toBe('profunda');
        });

        it('diagnosis "Karies media" → facts.cariesDepth = normal', () => {
            const extracted = stubExtractFromDictation('Zahn 16 okklusal bei Karies media.', 'fuellung');
            const facts = buildFactsFromExtraction({
                extracted: extracted as any,
                treatmentId: 'fuellung',
            });
            expect(facts.cariesDepth).toBe('normal');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // BLEEDING DETECTION
    // ═══════════════════════════════════════════════════════════════

    describe('Bleeding detection', () => {
        it.each([
            ['Blutung bei Exkavation', { detected: true, heavy: false }],
            ['starke Blutung', { detected: true, heavy: true }],
            ['massive Blutung aufgetreten', { detected: true, heavy: true }],
            ['Blutstillung erfolgt', { detected: false, heavy: false, hemostasisMentioned: true }],
            ['keine Blutung', { detected: true, heavy: false }], // contains "Blutung"
        ])('detectBleeding("%s")', (input, expected) => {
            const result = detectBleeding(input);
            expect(result.detected).toBe(expected.detected);
            if (expected.heavy !== undefined) {
                expect(result.heavy).toBe(expected.heavy);
            }
        });

        it('extraction with bleeding → facts.bleeding.detected = yes', () => {
            const extracted = stubExtractFromDictation('Zahn 16 Füllung. Blutung bei Exkavation.', 'fuellung');
            const facts = buildFactsFromExtraction({
                extracted: extracted as any,
                treatmentId: 'fuellung',
            });
            expect(facts.bleeding?.detected).toBe('yes');
        });

        it('extraction with heavy bleeding → facts.bleeding.heavy = true', () => {
            const extracted = stubExtractFromDictation('Zahn 16. Starke Blutung bei Exkavation.', 'fuellung');
            const facts = buildFactsFromExtraction({
                extracted: extracted as any,
                treatmentId: 'fuellung',
            });
            expect(facts.bleeding?.detected).toBe('yes');
            expect(facts.bleeding?.heavy).toBe(true);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // SENSITIVITY DETECTION
    // ═══════════════════════════════════════════════════════════════

    describe('Sensitivity detection', () => {
        it.each([
            ['empfindlich auf Kälte', { detected: true }],
            ['sehr empfindlich', { detected: true, level: 'high' }],
            ['hypersensibel', { detected: true }],
            ['überempfindlich', { detected: true }],
            ['Duraphat aufgetragen', { detected: false, desensitizerMentioned: true }],
        ])('detectSensitivity("%s")', (input, expected) => {
            const result = detectSensitivity(input);
            expect(result.detected).toBe(expected.detected);
            if (expected.level !== undefined) {
                expect(result.level).toBe(expected.level);
            }
        });

        it('extraction with sensitivity → facts.sensitivity.reported = yes', () => {
            const extracted = stubExtractFromDictation('Zahn 16. Patient empfindlich auf Kälte.', 'fuellung');
            const facts = buildFactsFromExtraction({
                extracted: extracted as any,
                treatmentId: 'fuellung',
            });
            expect(facts.sensitivity?.reported).toBe('yes');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // TREATMENT ISOLATION
    // ═══════════════════════════════════════════════════════════════

    describe('Treatment isolation', () => {
        it('Endo treatment does not get Füllung facts', () => {
            const extracted = stubExtractFromDictation('Zahn 16 Endo Trepanation.', 'endo');
            const facts = buildFactsFromExtraction({
                extracted: extracted as any,
                treatmentId: 'endo',
            });
            expect(facts.treatmentId).toBe('endo');
            expect(facts.bleeding).toBeUndefined();
            expect(facts.sensitivity).toBeUndefined();
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // COVERAGE ASSERTIONS
    // ═══════════════════════════════════════════════════════════════

    describe('Coverage assertions', () => {
        it('known profunda triggers never produce unknown depth', () => {
            const profundaTriggers = [
                'Caries profunda',
                'tiefe Karies',
                'pulpanah',
                'sehr tief',
                'deep caries',
            ];

            for (const trigger of profundaTriggers) {
                const extracted = stubExtractFromDictation(`Zahn 16 Füllung bei ${trigger}.`, 'fuellung');
                const facts = buildFactsFromExtraction({
                    extracted: extracted as any,
                    treatmentId: 'fuellung',
                });
                expect(facts.cariesDepth).not.toBe('unknown');
            }
        });

        it('bleeding mentions always set facts.bleeding', () => {
            const bleedingTriggers = [
                'Blutung',
                'blutet',
                'starke Blutung',
            ];

            for (const trigger of bleedingTriggers) {
                const extracted = stubExtractFromDictation(`Zahn 16 Füllung. ${trigger} bei Exkavation.`, 'fuellung');
                const facts = buildFactsFromExtraction({
                    extracted: extracted as any,
                    treatmentId: 'fuellung',
                });
                expect(facts.bleeding).toBeDefined();
                expect(facts.bleeding?.detected).toBe('yes');
            }
        });
    });
});
