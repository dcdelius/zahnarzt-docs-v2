/**
 * Gate Test: M17 Endo Renderer Parity
 *
 * Verifies that:
 * 1. All endo chips render without unresolved variables
 * 2. Chips → Billing are properly coupled
 * 3. No TEXT_ONLY leistung chips (befund may be null)
 */

import { describe, test, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { renderFromKbChips } from '../../v7/output/renderFromKbChips';

interface EndoKb {
    _meta: { id: string; version: string };
    chips: Array<{
        id: string;
        label: string;
        phase: string;
        category: string;
        textSnippets: { kurz?: string; mittel?: string; lang?: string };
        billingRef?: { GKV?: string | null; PKV?: string } | null;
        variablen?: Record<string, { default?: unknown }>;
    }>;
}

describe('gate-m17-endo-renderer-parity', () => {
    let endoKb: EndoKb;

    beforeAll(() => {
        const kbPath = path.join(
            process.cwd(),
            'src/docudent/core/billing/knowledgeBase/treatments/endo/unified.json'
        );
        endoKb = JSON.parse(fs.readFileSync(kbPath, 'utf-8'));
    });

    test('endo KB loads with correct version', () => {
        expect(endoKb._meta.id).toBe('endo');
        expect(endoKb._meta.version).toMatch(/^2025-01-v2/);
    });

    test('all chips render without unresolved variables using injected KB', () => {
        for (const chip of endoKb.chips) {
            const result = renderFromKbChips({
                chips: [chip.id],
                treatmentId: 'endo',
                insuranceType: 'GKV',
                textLength: 'lang',
                context: {
                    tooth: '26',
                    kanalzahl: 3,
                },
                treatmentKb: endoKb,
            });

            // No missing chips
            expect(result.meta.missingChips).toHaveLength(0);

            // No unresolved variable placeholders in text
            const hasUnresolved = result.fullText.includes('[') && result.fullText.includes(']');
            expect(hasUnresolved).toBe(false);
        }
    });

    test('leistung category chips produce text', () => {
        const leistungChips = endoKb.chips.filter((c) => c.category === 'leistung');
        expect(leistungChips.length).toBeGreaterThan(10);

        for (const chip of leistungChips) {
            const result = renderFromKbChips({
                chips: [chip.id],
                treatmentId: 'endo',
                insuranceType: 'GKV',
                textLength: 'mittel',
                treatmentKb: endoKb,
            });

            expect(result.fullText.length).toBeGreaterThan(0);
        }
    });

    test('chips with billingRef produce billing codes', () => {
        const chipsWithBilling = endoKb.chips.filter(
            (c) => c.billingRef && (c.billingRef.GKV || c.billingRef.PKV)
        );

        expect(chipsWithBilling.length).toBeGreaterThan(10);

        for (const chip of chipsWithBilling) {
            const result = renderFromKbChips({
                chips: [chip.id],
                treatmentId: 'endo',
                insuranceType: chip.billingRef!.GKV ? 'GKV' : 'PKV',
                textLength: 'kurz',
                treatmentKb: endoKb,
            });

            expect(result.billingCodes.length).toBeGreaterThan(0);
        }
    });

    test('renderer uses injected KB (no loader call)', () => {
        // Create a mock KB with only one chip
        const mockKb = {
            _meta: { id: 'endo', version: 'mock' },
            chips: [
                {
                    id: 'test_chip',
                    label: 'Test',
                    phase: 'test',
                    category: 'leistung',
                    textSnippets: { kurz: 'TEST', mittel: 'TEST', lang: 'TEST' },
                    billingRef: { GKV: 'BEMA_TEST' },
                },
            ],
        };

        const result = renderFromKbChips({
            chips: ['test_chip'],
            treatmentId: 'endo',
            insuranceType: 'GKV',
            textLength: 'kurz',
            treatmentKb: mockKb,
        });

        // Should use the mock KB, not the real one
        expect(result.fullText).toBe('TEST');
        expect(result.billingCodes).toEqual(['BEMA_TEST']);
    });

    test('full endo flow renders complete text', () => {
        const flowChips = [
            'vipr_neg',
            'perk_neg',
            'la_leitung',
            'kofferdam',
            'trepanation',
            'kanalaufbereitung_3',
            'spuelung_naocl',
            'einlage_caoh2',
        ];

        const result = renderFromKbChips({
            chips: flowChips,
            treatmentId: 'endo',
            insuranceType: 'GKV',
            textLength: 'mittel',
            treatmentKb: endoKb,
        });

        expect(result.meta.missingChips).toHaveLength(0);
        expect(result.fullText.length).toBeGreaterThan(50);
        expect(result.segments.length).toBe(flowChips.length);
    });
});
