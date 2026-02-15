/**
 * Gate Test: M26 Emit Rules Target Valid Chips
 *
 * HARD RULE: Every emit_chip rule in medical_kb MUST target a chip that exists
 * in the relevant treatment's unified.json.
 *
 * Orphan rules (targeting non-existent chips) cause runtime errors.
 *
 * Severity: CRITICAL
 */

import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

interface EmitChipAction {
    type: 'emit_chip';
    target: string;
    rationale?: string;
}

interface WhenCondition {
    field: string;
    op: string;
    value: unknown;
}

interface ConceptEffects {
    emitChips?: string[];
}

interface ConceptCase {
    id: string;
    when: WhenCondition[];
    effects: ConceptEffects;
}

interface Concept {
    id: string;
    when?: WhenCondition[];
    effects?: ConceptEffects;
    cases?: ConceptCase[];
}

interface MedicalKb {
    concepts: Concept[];
}

interface TreatmentKb {
    _meta: { id: string };
    chips: Array<{ id: string }>;
}

const MEDICAL_KB_PATH = './src/docudent/medical_kb/medical_kb.v1.json';
const KB_DIR = './src/docudent/core/billing/knowledgeBase/treatments';
const REGISTERED_PACKS = ['fuellung', 'endo'];

function loadMedicalKb(): MedicalKb {
    return JSON.parse(fs.readFileSync(MEDICAL_KB_PATH, 'utf8'));
}

function loadTreatmentChipIds(treatmentId: string): Set<string> {
    const kbPath = path.join(KB_DIR, treatmentId, 'unified.json');
    if (!fs.existsSync(kbPath)) return new Set();
    const kb: TreatmentKb = JSON.parse(fs.readFileSync(kbPath, 'utf8'));
    return new Set((kb.chips || []).map(c => c.id));
}

function extractTreatmentFromConditions(conditions: WhenCondition[] | undefined): string | null {
    if (!conditions) return null;
    // Look for treatment filter in when conditions
    for (const cond of conditions) {
        if (cond.field === 'facts.treatmentId' && cond.op === 'eq') {
            return cond.value as string;
        }
    }
    return null;
}

describe('gate-m26-emit-rules-target-valid-chips', () => {
    const medicalKb = loadMedicalKb();
    const treatmentChips = new Map<string, Set<string>>();

    for (const treatmentId of REGISTERED_PACKS) {
        treatmentChips.set(treatmentId, loadTreatmentChipIds(treatmentId));
    }

    const emitTargets: Array<{
        conceptId: string;
        treatmentId: string;
        targetChip: string;
    }> = [];

    for (const concept of medicalKb.concepts || []) {
        if (concept.effects?.emitChips?.length) {
            const treatmentId = extractTreatmentFromConditions(concept.when);
            if (treatmentId) {
                for (const targetChip of concept.effects.emitChips) {
                    emitTargets.push({ conceptId: `concept:${concept.id}`, treatmentId, targetChip });
                }
            }
        }
        for (const c of concept.cases || []) {
            if (!c.effects?.emitChips?.length) continue;
            const treatmentId = extractTreatmentFromConditions(c.when);
            if (!treatmentId) continue;
            for (const targetChip of c.effects.emitChips) {
                emitTargets.push({ conceptId: `concept:${concept.id}:${c.id}`, treatmentId, targetChip });
            }
        }
    }

    test('all emit_chip concepts target valid chips in treatment KB', () => {
        const orphanRules: {
            ruleId: string;
            treatmentId: string;
            targetChip: string;
        }[] = [];

        for (const target of emitTargets) {
            const validChips = treatmentChips.get(target.treatmentId);
            if (!validChips) continue;
            if (!validChips.has(target.targetChip)) {
                orphanRules.push({
                    ruleId: target.conceptId,
                    treatmentId: target.treatmentId,
                    targetChip: target.targetChip,
                });
            }
        }

        console.log('\n📊 M26 Emit Rule Validation:');
        console.log(`   Total emit_chip concepts: ${emitTargets.length}`);
        console.log(`   Orphan rules (targeting non-existent chips): ${orphanRules.length}`);

        if (orphanRules.length > 0) {
            console.log('\n❌ ORPHAN RULES FOUND:');
            for (const o of orphanRules) {
                console.log(`   ${o.ruleId}: targets "${o.targetChip}" but not in ${o.treatmentId}/unified.json`);
            }
        }

        expect(orphanRules.length).toBe(0);
    });

    test('all treatments have emit concepts (sanity check)', () => {
        const treatmentWithRules = new Set<string>();

        for (const target of emitTargets) {
            treatmentWithRules.add(target.treatmentId);
        }

        console.log('\n📋 Treatments with emit rules:');
        for (const t of REGISTERED_PACKS) {
            const hasRules = treatmentWithRules.has(t);
            console.log(`   ${t}: ${hasRules ? '✓' : '✗'}`);
        }

        // Both treatments should have emit concepts
        expect(treatmentWithRules.size).toBe(REGISTERED_PACKS.length);
    });

    test('emit concepts summary by treatment', () => {
        const rulesByTreatment = new Map<string, string[]>();

        for (const target of emitTargets) {
            if (!rulesByTreatment.has(target.treatmentId)) {
                rulesByTreatment.set(target.treatmentId, []);
            }
            rulesByTreatment.get(target.treatmentId)!.push(target.targetChip);
        }

        console.log('\n📋 Emit rules by treatment:');
        for (const [treatmentId, chips] of rulesByTreatment) {
            console.log(`   ${treatmentId}: ${chips.length} emit rules`);
            console.log(`     Chips: ${[...new Set(chips)].sort().join(', ')}`);
        }

        expect(rulesByTreatment.size).toBeGreaterThan(0);
    });
});
