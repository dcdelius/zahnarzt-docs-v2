/**
 * Gate Test: Medical KB Has Sources
 *
 * Verifies that all medical-tagged rules in medical_kb.v1.json have sourceRefs.
 * This is a core invariant: medical knowledge must be traceable to sources.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

interface SourceRef {
    sourceId: string;
    anchorId: string;
}

interface Rule {
    id: string;
    name: string;
    tags: string[];
    sourceRefs?: SourceRef[];
    active: boolean;
}

interface Askback {
    id: string;
    category: string;
    sourceRefs?: SourceRef[];
}

interface MedicalKB {
    rules: Rule[];
    askbacks: Askback[];
    chips: Array<{ id: string; sourceRefs?: SourceRef[] }>;
    defaults: Array<{ id: string; sourceRefs?: SourceRef[] }>;
}

describe('Gate: Medical KB Has Sources', () => {
    let kb: MedicalKB;

    beforeAll(() => {
        const kbPath = path.join(
            process.cwd(),
            'src/docudent/medical_kb/medical_kb.v1.json'
        );
        kb = JSON.parse(fs.readFileSync(kbPath, 'utf-8'));
    });

    // ═══════════════════════════════════════════════════════════════
    // Test 1: All medical rules have sourceRefs
    // ═══════════════════════════════════════════════════════════════
    it('all medical-tagged rules must have at least one sourceRef', () => {
        const medicalRules = kb.rules.filter(r => r.tags.includes('medical'));

        // Should have medical rules
        expect(medicalRules.length).toBeGreaterThan(0);

        // Each medical rule must have sourceRefs
        const rulesWithoutSources = medicalRules.filter(
            r => !r.sourceRefs || r.sourceRefs.length === 0
        );

        if (rulesWithoutSources.length > 0) {
            const ids = rulesWithoutSources.map(r => r.id);
            throw new Error(
                `Medical rules without sourceRefs: ${ids.join(', ')}`
            );
        }

        expect(rulesWithoutSources.length).toBe(0);
    });

    // ═══════════════════════════════════════════════════════════════
    // Test 2: Medical askbacks have sourceRefs
    // ═══════════════════════════════════════════════════════════════
    it('medical-category askbacks should have sourceRefs', () => {
        const medicalAskbacks = kb.askbacks.filter(a => a.category === 'medical');

        expect(medicalAskbacks.length).toBeGreaterThan(0);

        const askbacksWithoutSources = medicalAskbacks.filter(
            a => !a.sourceRefs || a.sourceRefs.length === 0
        );

        // All medical askbacks should have sources
        expect(askbacksWithoutSources.length).toBe(0);
    });

    // ═══════════════════════════════════════════════════════════════
    // Test 3: SourceRefs have required fields
    // ═══════════════════════════════════════════════════════════════
    it('all sourceRefs must have sourceId and anchorId', () => {
        const allSourceRefs: SourceRef[] = [];

        for (const rule of kb.rules) {
            if (rule.sourceRefs) allSourceRefs.push(...rule.sourceRefs);
        }
        for (const askback of kb.askbacks) {
            if (askback.sourceRefs) allSourceRefs.push(...askback.sourceRefs);
        }
        for (const chip of kb.chips) {
            if (chip.sourceRefs) allSourceRefs.push(...chip.sourceRefs);
        }

        expect(allSourceRefs.length).toBeGreaterThan(0);

        for (const ref of allSourceRefs) {
            expect(ref.sourceId).toBeDefined();
            expect(ref.sourceId.length).toBeGreaterThan(0);
            expect(ref.anchorId).toBeDefined();
            expect(ref.anchorId.length).toBeGreaterThan(0);
        }
    });

    // ═══════════════════════════════════════════════════════════════
    // Test 4: KB has minimum content
    // ═══════════════════════════════════════════════════════════════
    it('KB should have minimum required content', () => {
        // At least 3 rules
        expect(kb.rules.length).toBeGreaterThanOrEqual(3);

        // At least 1 askback
        expect(kb.askbacks.length).toBeGreaterThanOrEqual(1);

        // At least 1 chip
        expect(kb.chips.length).toBeGreaterThanOrEqual(1);
    });
});
