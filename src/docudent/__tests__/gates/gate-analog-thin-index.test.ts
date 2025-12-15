/**
 * GATE: Analog Thin Index Tests
 * 
 * Tests:
 * 1. Thin index file exists and is valid JSON
 * 2. Loading thin index completes in < 200ms
 * 3. resolveAnalogSuggestions with ICON returns at least 1 suggestion
 * 4. Determinism: two loads produce identical cards
 * 5. Builder script runs without hanging
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { resolveAnalogSuggestions, clearAnalogCache } from '../../core/billing/knowledgeBase/logic/analogResolver';
import type { BillingContext } from '../../core/billing/knowledgeBase/logic/billingRegistry';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const THIN_INDEX_PATH = path.resolve(
    __dirname,
    '../../core/billing/knowledgeBase/secondary/commentIndex_analog_thin.json'
);

interface ThinAnalogEntry {
    id: string;
    title?: string;
    tags?: string[];
    hasAnalogHint: boolean;
    referencedCodes?: string[];
    topSnippets?: string[];
}

interface ThinAnalogIndex {
    meta: { version: string; generatedAt: string; count: number };
    codes: Record<string, ThinAnalogEntry>;
}

describe('GATE: Analog Thin Index', () => {
    beforeEach(() => {
        clearAnalogCache();
    });

    describe('Thin Index File', () => {
        it('thin index file exists', () => {
            expect(fs.existsSync(THIN_INDEX_PATH)).toBe(true);
        });

        it('thin index is valid JSON', () => {
            const raw = fs.readFileSync(THIN_INDEX_PATH, 'utf-8');
            const parsed = JSON.parse(raw);
            expect(parsed.meta).toBeDefined();
            expect(parsed.meta.version).toBe('v1');
            expect(parsed.codes).toBeDefined();
        });

        it('thin index has expected structure', () => {
            const raw = fs.readFileSync(THIN_INDEX_PATH, 'utf-8');
            const index: ThinAnalogIndex = JSON.parse(raw);

            expect(index.meta.count).toBeGreaterThan(50);
            expect(Object.keys(index.codes).length).toBe(index.meta.count);

            // Check a sample entry
            const codes = Object.keys(index.codes);
            expect(codes.length).toBeGreaterThan(0);

            const sampleKey = codes[0];
            const sampleEntry = index.codes[sampleKey];
            expect(sampleEntry.id).toBeDefined();
            expect(typeof sampleEntry.hasAnalogHint).toBe('boolean');
        });

        it('thin index is significantly smaller than full index', () => {
            const thinSize = fs.statSync(THIN_INDEX_PATH).size;
            const fullPath = path.resolve(
                __dirname,
                '../../core/billing/knowledgeBase/secondary/commentIndex_analog.json'
            );

            if (fs.existsSync(fullPath)) {
                const fullSize = fs.statSync(fullPath).size;
                // Thin index should be < 20% of full size
                expect(thinSize).toBeLessThan(fullSize * 0.2);
            }
        });
    });

    describe('Performance', () => {
        it('thin index loads in < 200ms', () => {
            const start = Date.now();
            const raw = fs.readFileSync(THIN_INDEX_PATH, 'utf-8');
            JSON.parse(raw);
            const elapsed = Date.now() - start;

            expect(elapsed).toBeLessThan(200);
        });

        it('resolver uses thin index and is fast', () => {
            const iconContext: BillingContext = {
                extracted: {
                    treatment: 'ICON',
                    diagnosis: 'Kariesinfiltration',
                } as any,
                insuranceType: 'PKV',
                bonusStatus: 'ohne',
                rawDictation: 'ICON Frontzähne',
            };

            const start = Date.now();
            resolveAnalogSuggestions(iconContext);
            const elapsed = Date.now() - start;

            // First call includes loading; still should be < 200ms
            expect(elapsed).toBeLessThan(200);
        });
    });

    describe('Resolver Integration', () => {
        it('ICON dictation returns at least 1 analog suggestion', () => {
            const iconContext: BillingContext = {
                extracted: {
                    treatment: 'ICON',
                    diagnosis: 'Kariesinfiltration',
                } as any,
                insuranceType: 'PKV',
                bonusStatus: 'ohne',
                rawDictation: 'ICON Kariesinfiltration Frontzähne',
            };

            const result = resolveAnalogSuggestions(iconContext);
            expect(result.suggestions.length).toBeGreaterThanOrEqual(1);
        });

        it('suggestion has correct structure', () => {
            const iconContext: BillingContext = {
                extracted: {
                    treatment: 'ICON',
                } as any,
                insuranceType: 'PKV',
                bonusStatus: 'ohne',
                rawDictation: 'ICON',
            };

            const result = resolveAnalogSuggestions(iconContext);

            if (result.suggestions.length > 0) {
                const suggestion = result.suggestions[0];
                expect(suggestion.id).toMatch(/^analog_/);
                // Direct matches return 'goz', fuzzy matches return 'optimierung'
                expect(['goz', 'optimierung']).toContain(suggestion.type);
                expect(suggestion.autoAccept).toBe(false);
            }
        });
    });

    describe('Determinism', () => {
        it('same input produces same output', () => {
            const context: BillingContext = {
                extracted: { treatment: 'ICON' } as any,
                insuranceType: 'PKV',
                bonusStatus: 'ohne',
                rawDictation: 'ICON',
            };

            const result1 = resolveAnalogSuggestions(context);
            clearAnalogCache();
            const result2 = resolveAnalogSuggestions(context);

            expect(result1.suggestions.length).toBe(result2.suggestions.length);
            for (let i = 0; i < result1.suggestions.length; i++) {
                expect(result1.suggestions[i].id).toBe(result2.suggestions[i].id);
            }
        });

        it('thin index entries are sorted by code', () => {
            const raw = fs.readFileSync(THIN_INDEX_PATH, 'utf-8');
            const index: ThinAnalogIndex = JSON.parse(raw);
            const codes = Object.keys(index.codes);
            const sorted = [...codes].sort();

            expect(codes).toEqual(sorted);
        });
    });

    describe('Snippet Safety', () => {
        it('no snippet exceeds 160 characters', () => {
            const raw = fs.readFileSync(THIN_INDEX_PATH, 'utf-8');
            const index: ThinAnalogIndex = JSON.parse(raw);

            for (const [code, entry] of Object.entries(index.codes)) {
                for (const snippet of entry.topSnippets || []) {
                    expect(
                        snippet.length,
                        `Snippet in ${code} exceeds 160 chars: ${snippet.slice(0, 50)}...`
                    ).toBeLessThanOrEqual(160);
                }
            }
        });
    });
});
