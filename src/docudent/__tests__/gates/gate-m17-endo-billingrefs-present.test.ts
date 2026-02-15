/**
 * Gate Test: M17 Endo BillingRefs Present
 *
 * Verifies that all endo leistung category chips have valid billingRef.
 * Befund chips may have null billingRef (they are documentation only).
 */

import { describe, test, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

interface EndoChip {
    id: string;
    label: string;
    phase: string;
    category: string;
    billingRef?: { GKV?: string | null; PKV?: string } | null;
    hinweis?: string;
}

interface EndoKb {
    _meta: { id: string; version: string };
    chips: EndoChip[];
}

describe('gate-m17-endo-billingrefs-present', () => {
    let endoKb: EndoKb;
    let leistungChips: EndoChip[];
    let befundChips: EndoChip[];

    beforeAll(() => {
        const kbPath = path.join(
            process.cwd(),
            'src/docudent/core/billing/knowledgeBase/treatments/endo/unified.json'
        );
        endoKb = JSON.parse(fs.readFileSync(kbPath, 'utf-8'));
        leistungChips = endoKb.chips.filter((c) => c.category === 'leistung');
        befundChips = endoKb.chips.filter((c) => c.category === 'befund');
    });

    test('has more than 15 leistung chips', () => {
        expect(leistungChips.length).toBeGreaterThan(15);
    });

    test('all billable leistung chips have GKV or PKV billingRef', () => {
        // Chips that are explicitly non-billable (have hinweis about inkludiert)
        const inkludiertChips = leistungChips.filter(
            (c) => c.hinweis?.includes('inkludiert') || c.hinweis?.includes('Sitzungspauschale')
        );

        // Billable chips must have at least one billing code
        const billableChips = leistungChips.filter((c) => !inkludiertChips.includes(c));

        const missingBilling: string[] = [];
        for (const chip of billableChips) {
            const hasGKV = chip.billingRef?.GKV && chip.billingRef.GKV !== null;
            const hasPKV = chip.billingRef?.PKV;

            if (!hasGKV && !hasPKV) {
                missingBilling.push(chip.id);
            }
        }

        expect(missingBilling).toEqual([]);
    });

    test('befund chips correctly have null billingRef', () => {
        for (const chip of befundChips) {
            // Befund chips should either have null billingRef or no billingRef
            expect(
                chip.billingRef === null || chip.billingRef === undefined
            ).toBe(true);
        }
    });

    test('core endo procedures have correct BEMA codes', () => {
        const expectedBemaCodes: Record<string, string> = {
            trepanation: 'BEMA_31',
            kanalaufbereitung_1: 'BEMA_32',
            kanalaufbereitung_3: 'BEMA_32',
            wf_kalt: 'BEMA_34',
            einlage_caoh2: 'BEMA_35',
            la_leitung: 'BEMA_41a',
            la_infiltr: 'BEMA_40',
            kofferdam: 'BEMA_12',
        };

        for (const [chipId, expectedCode] of Object.entries(expectedBemaCodes)) {
            const chip = endoKb.chips.find((c) => c.id === chipId);
            expect(chip).toBeDefined();
            expect(chip!.billingRef?.GKV).toBe(expectedCode);
        }
    });

    test('core endo procedures have correct GOZ codes', () => {
        const expectedGozCodes: Record<string, string> = {
            trepanation: 'GOZ_2360',
            kanalaufbereitung_1: 'GOZ_2410',
            wf_kalt: 'GOZ_2440',
            einlage_caoh2: 'GOZ_2430',
            laengenmessung_elek: 'GOZ_2400',
        };

        for (const [chipId, expectedCode] of Object.entries(expectedGozCodes)) {
            const chip = endoKb.chips.find((c) => c.id === chipId);
            expect(chip).toBeDefined();
            expect(chip!.billingRef?.PKV).toBe(expectedCode);
        }
    });

    test('WF phase has all three technique variants', () => {
        const wfChips = endoKb.chips.filter((c) => c.phase === 'wurzelfuellung');
        expect(wfChips.length).toBe(3);

        const wfIds = wfChips.map((c) => c.id).sort();
        expect(wfIds).toEqual(['wf_einzel', 'wf_kalt', 'wf_warm']);
    });

    test('all WF chips have BEMA_34 and GOZ_2440', () => {
        const wfChips = endoKb.chips.filter((c) => c.phase === 'wurzelfuellung');

        for (const chip of wfChips) {
            expect(chip.billingRef?.GKV).toBe('BEMA_34');
            expect(chip.billingRef?.PKV).toBe('GOZ_2440');
        }
    });

    test('laengenmessung_elek has no GKV (PKV only)', () => {
        const chip = endoKb.chips.find((c) => c.id === 'laengenmessung_elek');
        expect(chip).toBeDefined();
        expect(chip!.billingRef?.GKV).toBeNull();
        expect(chip!.billingRef?.PKV).toBe('GOZ_2400');
    });
});
