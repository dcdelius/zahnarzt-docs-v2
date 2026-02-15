/**
 * Gate Test: Compiler Determinism
 *
 * Contract: Same source → identical compiled KB (hash).
 */

import { describe, it, expect } from 'vitest';
import { compileRules } from '../../kb/combinability/compiler';

describe('Gate: Compiler Determinism', () => {
    const sampleRules = [
        {
            id: 'test_rule_1',
            typ: 'ausschluss' as const,
            titel: 'Test Rule 1',
            beschreibung: 'Test description',
            betrifft: ['GOZ_1000'],
            regel: { operator: 'darf_nicht' },
            schweregrad: 'regress' as const,
            quelle: { dokument: 'Test Doc' },
        },
        {
            id: 'test_rule_2',
            typ: 'bedingung' as const,
            titel: 'Test Rule 2',
            beschreibung: 'Test description 2',
            betrifft: ['BEMA_13'],
            regel: { operator: 'nur_wenn', bedingung: 'test' },
            schweregrad: 'warnung' as const,
            quelle: { dokument: 'Test Doc 2' },
        },
    ];

    it('same source → identical hash (10 runs)', () => {
        const hashes: string[] = [];

        for (let i = 0; i < 10; i++) {
            const kb = compileRules(sampleRules, 'test.json');
            hashes.push(kb._meta.hash);
        }

        const first = hashes[0];
        for (let i = 1; i < 10; i++) {
            expect(hashes[i], `Run ${i + 1} hash differs`).toBe(first);
        }
    });

    it('same source → identical sourceHash', () => {
        const kb1 = compileRules(sampleRules, 'test.json');
        const kb2 = compileRules(sampleRules, 'test.json');

        expect(kb1._meta.sourceHash).toBe(kb2._meta.sourceHash);
    });

    it('different source → different hash', () => {
        const kb1 = compileRules(sampleRules, 'test.json');
        const kb2 = compileRules([sampleRules[0]], 'test.json');

        expect(kb1._meta.hash).not.toBe(kb2._meta.hash);
    });

    it('rules are deterministically sorted by id', () => {
        // Reverse order input
        const reversed = [...sampleRules].reverse();
        const kb = compileRules(reversed, 'test.json');

        expect(kb.rules[0].id).toBe('test_rule_1');
        expect(kb.rules[1].id).toBe('test_rule_2');
    });
});
