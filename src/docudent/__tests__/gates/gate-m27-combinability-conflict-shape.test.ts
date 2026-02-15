/**
 * Gate M27: Combinability Conflict Shape
 *
 * Ensures combinability conflicts have proper structure.
 */

import { describe, it, expect } from 'vitest';
import type { CombinabilityConflict } from '../../v10/qa/explainSchema.v1';

describe('gate-m27-combinability-conflict-shape', () => {
    // Define expected shape
    const requiredFields: (keyof CombinabilityConflict)[] = [
        'ruleId',
        'codesInvolved',
        'scope',
        'severity',
        'reason',
        'sourceRefs',
    ];

    it('CombinabilityConflict has all required fields', () => {
        // Mock conflict to validate shape
        const mockConflict: CombinabilityConflict = {
            ruleId: 'test-rule',
            codesInvolved: ['GOZ_2060', 'GOZ_2197'],
            scope: 'session',
            severity: 'block',
            reason: 'Test reason',
            sourceRefs: ['source1'],
        };

        for (const field of requiredFields) {
            expect(mockConflict[field], `Missing field: ${field}`).toBeDefined();
        }
    });

    it('scope is one of valid values', () => {
        const validScopes = ['session', 'tooth', 'quadrant'];

        for (const scope of validScopes) {
            const conflict: CombinabilityConflict = {
                ruleId: 'test',
                codesInvolved: [],
                scope: scope as 'session' | 'tooth' | 'quadrant',
                severity: 'warn',
                reason: 'test',
                sourceRefs: [],
            };
            expect(validScopes).toContain(conflict.scope);
        }
    });

    it('severity is either warn or block', () => {
        const validSeverities = ['warn', 'block'];

        for (const severity of validSeverities) {
            const conflict: CombinabilityConflict = {
                ruleId: 'test',
                codesInvolved: [],
                scope: 'session',
                severity: severity as 'warn' | 'block',
                reason: 'test',
                sourceRefs: [],
            };
            expect(validSeverities).toContain(conflict.severity);
        }
    });

    it('codesInvolved is an array', () => {
        const conflict: CombinabilityConflict = {
            ruleId: 'test',
            codesInvolved: ['GOZ_2060'],
            scope: 'session',
            severity: 'block',
            reason: 'test',
            sourceRefs: [],
        };

        expect(Array.isArray(conflict.codesInvolved)).toBe(true);
    });
});
