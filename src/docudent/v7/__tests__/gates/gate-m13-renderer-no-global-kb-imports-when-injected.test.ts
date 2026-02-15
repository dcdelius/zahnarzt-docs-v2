/**
 * Gate M13.1: Renderer No Global KB Imports When Injected
 *
 * GATE DEFINITION:
 * When renderFromKbChips is called with an injected treatmentKb,
 * it should NOT use the global loader. Output should be identical.
 */

import { describe, it, expect, vi } from 'vitest';
import { renderFromKbChips, getChipFromKb } from '../../../v7/output';

describe('Gate M13.1: Renderer Accepts Injected KB', () => {
    it('renderFromKbChips accepts treatmentKb parameter', () => {
        // Create a mock treatment KB
        const mockKb = {
            _meta: { id: 'test', version: 'v1' },
            chips: [
                {
                    id: 'test_chip',
                    label: 'Test Chip',
                    textSnippets: {
                        kurz: 'Kurze Version',
                        mittel: 'Mittlere Version',
                        lang: 'Lange Version',
                    },
                    billingRef: { GKV: '13a', PKV: 'GOZ 2060' },
                },
            ],
        };

        // Call with injected KB
        const result = renderFromKbChips({
            chips: ['test_chip'],
            treatmentId: 'test',
            insuranceType: 'GKV',
            textLength: 'mittel',
            treatmentKb: mockKb,
        });

        expect(result.fullText).toBe('Mittlere Version');
        expect(result.billingCodes).toContain('13a');
        expect(result.meta.missingChips).toHaveLength(0);
    });

    it('injected KB takes precedence over loader', () => {
        // Create a mock KB with different content than real fuellung KB
        const mockKb = {
            _meta: { id: 'fuellung', version: 'mock' },
            chips: [
                {
                    id: 'mocked_chip',
                    label: 'Mocked',
                    textSnippets: { kurz: 'MOCKED TEXT' },
                    billingRef: null, // TEXT_ONLY
                },
            ],
        };

        const result = renderFromKbChips({
            chips: ['mocked_chip'],
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'kurz',
            treatmentKb: mockKb,
        });

        // Should use mocked text, not real KB
        expect(result.fullText).toBe('MOCKED TEXT');
        expect(result.meta.textOnlyChips).toContain('mocked_chip');
    });

    it('without treatmentKb, renderer uses loader (backwards compat)', () => {
        // Call without treatmentKb - should use loader
        const result = renderFromKbChips({
            chips: ['vipr_pos'], // Known chip in fuellung KB
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
        });

        // Should work via loader
        expect(result.segments.length).toBeGreaterThan(0);
    });

    it('parity: injected KB produces same output as loader for same content', () => {
        // Get a chip from the real KB via loader
        const realChip = getChipFromKb('fuellung', 'vipr_pos');
        expect(realChip).toBeDefined();

        // Create matching mock KB
        const mockKb = {
            _meta: { id: 'fuellung', version: 'v1' },
            chips: [realChip!],
        };

        // Call with loader
        const loaderResult = renderFromKbChips({
            chips: ['vipr_pos'],
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
        });

        // Call with injected KB
        const injectedResult = renderFromKbChips({
            chips: ['vipr_pos'],
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            treatmentKb: mockKb,
        });

        // Should produce identical output
        expect(injectedResult.fullText).toBe(loaderResult.fullText);
        expect(injectedResult.billingCodes).toEqual(loaderResult.billingCodes);
    });

    it('missing chip in injected KB is reported', () => {
        const mockKb = {
            _meta: { id: 'test', version: 'v1' },
            chips: [], // Empty KB
        };

        // In production, this would throw. In test, it should track missing.
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        try {
            const result = renderFromKbChips({
                chips: ['nonexistent'],
                treatmentId: 'test',
                insuranceType: 'GKV',
                textLength: 'mittel',
                treatmentKb: mockKb,
            });

            expect(result.meta.missingChips).toContain('nonexistent');
        } finally {
            process.env.NODE_ENV = originalEnv;
        }
    });
});
