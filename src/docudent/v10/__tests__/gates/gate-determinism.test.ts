/**
 * Gate Test: Determinism - Same input → identical output
 *
 * Contract: Running V10 pipeline 10 times with identical input
 * must produce exactly the same:
 * - billingCodes
 * - droppedCodes
 * - fullText hash
 */

import { describe, it, expect } from 'vitest';
import { runV10 } from '../../pipeline/runV10';
import { createHash } from 'crypto';

describe('Gate: Determinism', () => {
    const RUNS = 10;

    const testInput = {
        dictation: 'Zahn 36 mod Kompositfüllung Mehrschichttechnik',
        treatmentId: 'fuellung' as const,
        insuranceType: 'PKV' as const,
        textLength: 'mittel' as const,
        answers: new Map([
            ['medical_mkv_confirmed', 'nur_kasse'],
            ['medical_caries_depth', 'normal'],
            ['medical_ueberkappung', 'nein'],
            ['fuellung_material', 'Komposit'],
            ['fuellung_isolation', 'keine'],
            ['fuellung_layering', 'yes'],
            ['fuellung_adhesive', 'yes'],
            ['medical_vipr', 'positiv'],
            ['medical_perk', 'negativ'],
        ]),
    };

    it(`${RUNS}x run → identical billingCodes`, async () => {
        const results: string[][] = [];

        for (let i = 0; i < RUNS; i++) {
            const result = await runV10(testInput);
            if (result.state === 'output') {
                results.push([...result.output.billingCodes].sort());
            }
        }

        expect(results.length).toBe(RUNS);

        const first = JSON.stringify(results[0]);
        for (let i = 1; i < RUNS; i++) {
            expect(JSON.stringify(results[i]), `Run ${i + 1} differs from run 1`).toBe(first);
        }

        console.log(`[DETERMINISM] ${RUNS}x identical:`, results[0]);
    });

    it(`${RUNS}x run → identical fullText hash`, async () => {
        const hashes: string[] = [];

        for (let i = 0; i < RUNS; i++) {
            const result = await runV10(testInput);
            if (result.state === 'output') {
                const hash = createHash('sha256')
                    .update(result.output.fullText)
                    .digest('hex')
                    .slice(0, 16);
                hashes.push(hash);
            }
        }

        expect(hashes.length).toBe(RUNS);

        const first = hashes[0];
        for (let i = 1; i < RUNS; i++) {
            expect(hashes[i], `Run ${i + 1} hash differs`).toBe(first);
        }
    });

    it(`MKV Determinism: ${RUNS}x → identical droppedCodes`, async () => {
        const mkvInput = {
            dictation: 'Zahn 36 mod Kompositfüllung',
            treatmentId: 'fuellung' as const,
            insuranceType: 'MKV' as const,
            textLength: 'mittel' as const,
            answers: new Map([
                ['medical_mkv_confirmed', 'mehrkosten'],
                ['medical_caries_depth', 'normal'],
                ['medical_ueberkappung', 'nein'],
                ['fuellung_material', 'Komposit'],
                ['fuellung_isolation', 'keine'],
                ['fuellung_layering', 'yes'],
                ['fuellung_adhesive', 'yes'],
                ['mkv_confirmed', 'mehrkosten'],
                ['fuellung_mkv_justification', 'Mehrschichttechnik'],
                ['mkv_betrag', '120'],
            ]),
            testOnly: {
                enabled: true,
                forceExtraction: {
                    tooth: '36',
                    surfaces: ['m', 'o', 'd'],
                    materialMentioned: 'komposit',
                    mehrkostenConfirmed: true,
                    mkvAmount: 120,
                },
            },
        };

        const results: { codes: string[]; dropped: string[] }[] = [];

        for (let i = 0; i < RUNS; i++) {
            const result = await runV10(mkvInput);
            if (result.state === 'output') {
                results.push({
                    codes: [...result.output.billingCodes].sort(),
                    dropped: (result.meta.combinability as any)?.droppedCodes?.sort() || [],
                });
            }
        }

        const first = JSON.stringify(results[0]);
        for (let i = 1; i < RUNS; i++) {
            expect(JSON.stringify(results[i]), `Run ${i + 1} differs`).toBe(first);
        }
    });
});
