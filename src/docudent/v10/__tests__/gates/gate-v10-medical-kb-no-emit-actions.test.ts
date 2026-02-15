import { describe, it, expect } from 'vitest';
import { medicalKbV10 } from '../../../medical_kb';

describe('Gate: V10 Medical KB Has No Chip Emission Actions', () => {
    const kb = medicalKbV10;

    it('rules have no emit_chip actions', () => {
        const emitRules: string[] = [];
        for (const rule of kb.rules ?? []) {
            for (const action of rule.then ?? []) {
                if (action.type === 'emit_chip') {
                    emitRules.push(rule.id);
                }
            }
        }
        expect(emitRules).toEqual([]);
    });

    it('concepts have no emitChips effects', () => {
        const emitConcepts: string[] = [];
        for (const concept of kb.concepts ?? []) {
            if (concept.effects?.emitChips?.length) {
                emitConcepts.push(`concept:${concept.id}`);
            }
            for (const c of concept.cases ?? []) {
                if (c.effects?.emitChips?.length) {
                    emitConcepts.push(`concept:${concept.id}:${c.id}`);
                }
            }
        }
        expect(emitConcepts).toEqual([]);
    });
});
