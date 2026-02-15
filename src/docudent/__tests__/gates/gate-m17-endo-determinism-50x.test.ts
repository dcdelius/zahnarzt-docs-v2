/**
 * Gate Test: M17 Endo Determinism 50x
 *
 * Verifies that endo KB loading and rendering is deterministic.
 */

import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import { renderFromKbChips } from '../../v7/output/renderFromKbChips';

describe('gate-m17-endo-determinism-50x', () => {
    const kbPath = path.join(
        process.cwd(),
        'src/docudent/core/billing/knowledgeBase/treatments/endo/unified.json'
    );

    const combKbPath = path.join(
        process.cwd(),
        'src/docudent/v10/kb/combinability/combinability_kb.v1.json'
    );

    test('endo KB loading is deterministic (50x)', () => {
        const hashes: string[] = [];

        for (let i = 0; i < 50; i++) {
            const content = fs.readFileSync(kbPath, 'utf-8');
            const hash = createHash('sha256').update(content).digest('hex');
            hashes.push(hash);
        }

        const uniqueHashes = [...new Set(hashes)];
        expect(uniqueHashes.length).toBe(1);
    });

    test('endo KB chip order is stable', () => {
        const kb = JSON.parse(fs.readFileSync(kbPath, 'utf-8'));
        const chipIds = kb.chips.map((c: { id: string }) => c.id);

        // Verify order is consistent with expected phases
        const phases = kb.phasen_reihenfolge;
        expect(phases).toContain('befund');
        expect(phases).toContain('aufbereitung');
        expect(phases).toContain('wurzelfuellung');

        // Befund chips should come before aufbereitung chips
        const viprIndex = chipIds.indexOf('vipr_neg');
        const aufbereitungIndex = chipIds.indexOf('kanalaufbereitung_1');
        expect(viprIndex).toBeLessThan(aufbereitungIndex);
    });

    test('endo rendering is deterministic (50x)', () => {
        const kb = JSON.parse(fs.readFileSync(kbPath, 'utf-8'));
        const testChips = ['vipr_neg', 'la_leitung', 'kanalaufbereitung_3', 'wf_kalt'];

        const outputs: string[] = [];

        for (let i = 0; i < 50; i++) {
            const result = renderFromKbChips({
                chips: testChips,
                treatmentId: 'endo',
                insuranceType: 'GKV',
                textLength: 'mittel',
                treatmentKb: kb,
            });

            outputs.push(result.fullText);
        }

        const uniqueOutputs = [...new Set(outputs)];
        expect(uniqueOutputs.length).toBe(1);
    });

    test('combinability KB is deterministic (50x)', () => {
        const hashes: string[] = [];

        for (let i = 0; i < 50; i++) {
            const content = fs.readFileSync(combKbPath, 'utf-8');
            const hash = createHash('sha256').update(content).digest('hex');
            hashes.push(hash);
        }

        const uniqueHashes = [...new Set(hashes)];
        expect(uniqueHashes.length).toBe(1);
    });

    test('billing code extraction is deterministic (50x)', () => {
        const kb = JSON.parse(fs.readFileSync(kbPath, 'utf-8'));
        const testChips = ['la_leitung', 'kofferdam', 'trepanation', 'kanalaufbereitung_3', 'wf_kalt'];

        const billingArrays: string[][] = [];

        for (let i = 0; i < 50; i++) {
            const result = renderFromKbChips({
                chips: testChips,
                treatmentId: 'endo',
                insuranceType: 'GKV',
                textLength: 'kurz',
                treatmentKb: kb,
            });

            billingArrays.push(result.billingCodes);
        }

        // All 50 billing arrays should be identical
        const first = JSON.stringify(billingArrays[0]);
        for (const arr of billingArrays) {
            expect(JSON.stringify(arr)).toBe(first);
        }

        // Verify correct codes
        expect(billingArrays[0]).toContain('BEMA_41a');
        expect(billingArrays[0]).toContain('BEMA_12');
        expect(billingArrays[0]).toContain('BEMA_31');
        expect(billingArrays[0]).toContain('BEMA_32');
        expect(billingArrays[0]).toContain('BEMA_34');
    });
});
