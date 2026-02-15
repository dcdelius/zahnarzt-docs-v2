/**
 * Gate: Combinability KB Compiler
 *
 * Ensures kombinationen.json compiles without errors.
 */

import { describe, it, expect } from 'vitest';
import kombinationen from '../../../core/billing/knowledgeBase/regeln/kombinationen.json';
import { compileRules } from '../../kb/combinability/compiler';

describe('Gate: Combinability KB Compiler', () => {
    it('compiles kombinationen.json without errors', () => {
        const kb = compileRules(kombinationen as any, 'kombinationen.json');
        expect(kb.rules.length).toBeGreaterThan(0);
        expect(kb._meta.ruleCount).toBe(kb.rules.length);
    });
});
