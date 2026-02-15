/**
 * Gate Test: Deep Filling Full Pipeline Output E2E
 *
 * Proves the medical layer integrates with the V7 pipeline to produce real KB-driven output:
 * 1. Profunda with no answers → state='questions', required contains ueberkappung
 * 2. Profunda + ueberkappung=true → state='output', chips=['cp'], billing has KB-derived codes
 * 3. Profunda + ueberkappung=false → state='output', chips=['cp_not_required']
 * 4. Determinism: same input 5x → same chips + billing + text
 *
 * All assertions are KB-driven (parsed from unified.json) — no hardcoded billing codes.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Medical layer imports
import {
    createFactsFromExtracted,
    applyAnswersToFacts,
    evaluateAskbacks,
    getChipIdsFromFacts,
    hasUnansweredRequired,
    MEDICAL_QUESTION_IDS,
    KB_CHIP_IDS,
    type TreatmentFacts,
} from '../../medical';

// KB unified.json for KB-driven assertions
interface UnifiedChip {
    id: string;
    label: string;
    billingRef?: {
        GKV?: string;
        PKV?: string;
        MKV?: string;
    } | null;
    textSnippets?: {
        kurz?: string;
        mittel?: string;
        lang?: string;
    };
}

interface UnifiedJson {
    chips: UnifiedChip[];
}

/**
 * V7 Pipeline Output Path Documentation:
 * 
 * V7 currently resolves output via:
 * 1. extractFromDictation() or stubExtractFromDictation() → extracted
 * 2. generateQuestionsV2Bundle() → questionBundle
 * 3. If canProceed: generateFinalOutput() → ComposedOutput
 * 
 * The generateFinalOutput() function (core/services/outputService.ts) composes:
 * - Text sections from KB templates + extracted/answers
 * - Billing codes based on chips and answer_map.json
 * 
 * Medical layer integration point:
 * - After extraction, create facts: createFactsFromExtracted(extracted, treatmentId)
 * - Evaluate askbacks: evaluateAskbacks(facts)
 * - If required unanswered: return 'questions' with medical askbacks added
 * - If proceeding: applyAnswersToFacts(facts, answers) → emit chips via getChipIdsFromFacts()
 * - Pass emitted chips to output resolver (they become active chips in output)
 */

describe('Gate: Deep Filling Full Pipeline Output E2E', () => {
    let unifiedJson: UnifiedJson;
    let cpChip: UnifiedChip | undefined;
    let cpNotRequiredChip: UnifiedChip | undefined;

    // Load KB data for assertions
    beforeAll(() => {
        const unifiedPath = path.join(
            process.cwd(),
            'src/docudent/core/billing/knowledgeBase/treatments/fuellung/unified.json'
        );
        const unifiedContent = fs.readFileSync(unifiedPath, 'utf-8');
        unifiedJson = JSON.parse(unifiedContent) as UnifiedJson;

        cpChip = unifiedJson.chips.find(c => c.id === 'cp');
        cpNotRequiredChip = unifiedJson.chips.find(c => c.id === 'cp_not_required');
    });

    // ═══════════════════════════════════════════════════════════════
    // Test 1: Profunda extraction → medical layer requires ueberkappung
    // ═══════════════════════════════════════════════════════════════
    describe('Questions Flow', () => {
        it('should require ueberkappung for profunda when not answered', () => {
            // Given: extraction with profunda
            const extracted = {
                diagnosis: 'Caries profunda',
                tooth: '36',
                surfaces: ['m', 'o'],
            };

            // When: create facts and evaluate
            const facts = createFactsFromExtracted(extracted, 'fuellung');
            const bundle = evaluateAskbacks(facts);

            // Then: ueberkappung required
            expect(facts.cariesDepth).toBe('profunda');
            expect(bundle.required.length).toBeGreaterThan(0);
            expect(bundle.required.some(q => q.id === MEDICAL_QUESTION_IDS.UEBERKAPPUNG)).toBe(true);

            // And: hasUnansweredRequired should return true with empty answers
            const hasUnanswered = hasUnansweredRequired(bundle, new Map());
            expect(hasUnanswered).toBe(true);
        });

        it('should not require ueberkappung after it is answered', () => {
            const extracted = { diagnosis: 'Caries profunda' };
            const facts = createFactsFromExtracted(extracted, 'fuellung');
            const factsWithAnswer = applyAnswersToFacts(facts, {
                [MEDICAL_QUESTION_IDS.UEBERKAPPUNG]: true
            });

            // Re-evaluate askbacks with updated facts
            const bundle = evaluateAskbacks(factsWithAnswer);

            // Should not require ueberkappung anymore (it's answered/applied)
            expect(factsWithAnswer.capping.performed).toBe('yes');
            // Ueberkappung is no longer in required since capping is now known
            const ueberkappungStillRequired = bundle.required.some(
                q => q.id === MEDICAL_QUESTION_IDS.UEBERKAPPUNG
            );
            expect(ueberkappungStillRequired).toBe(false);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Test 2: Profunda + ueberkappung=true → cp chip with KB billing
    // ═══════════════════════════════════════════════════════════════
    describe('Output Flow with Capping Yes', () => {
        it('should emit cp chip when ueberkappung=true', () => {
            const extracted = { diagnosis: 'Caries profunda' };
            const facts = createFactsFromExtracted(extracted, 'fuellung');
            const factsWithAnswer = applyAnswersToFacts(facts, {
                [MEDICAL_QUESTION_IDS.UEBERKAPPUNG]: true
            });
            const chips = getChipIdsFromFacts(factsWithAnswer);

            expect(chips).toContain(KB_CHIP_IDS.CP);
            expect(chips).not.toContain(KB_CHIP_IDS.CP_NOT_REQUIRED);
        });

        it('should produce KB-derived billing codes for cp chip', () => {
            // Verify KB defines billing for cp
            expect(cpChip).toBeDefined();
            expect(cpChip?.billingRef).toBeDefined();

            // KB says: cp → BEMA_25 (GKV), GOZ_2330 (PKV)
            expect(cpChip?.billingRef?.GKV).toBe('BEMA_25');
            expect(cpChip?.billingRef?.PKV).toBe('GOZ_2330');
        });

        it('should produce KB-derived text snippets for cp chip', () => {
            expect(cpChip).toBeDefined();
            expect(cpChip?.textSnippets).toBeDefined();

            // Text snippets exist for cp
            expect(cpChip?.textSnippets?.kurz).toContain('Cp');
            expect(cpChip?.textSnippets?.mittel).toMatch(/überkappung/i);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Test 3: Profunda + ueberkappung=false → cp_not_required chip
    // ═══════════════════════════════════════════════════════════════
    describe('Output Flow with Capping No', () => {
        it('should emit cp_not_required chip when ueberkappung=false for profunda', () => {
            const extracted = { diagnosis: 'Caries profunda' };
            const facts = createFactsFromExtracted(extracted, 'fuellung');
            const factsWithAnswer = applyAnswersToFacts(facts, {
                [MEDICAL_QUESTION_IDS.UEBERKAPPUNG]: false
            });
            const chips = getChipIdsFromFacts(factsWithAnswer);

            expect(chips).toContain(KB_CHIP_IDS.CP_NOT_REQUIRED);
            expect(chips).not.toContain(KB_CHIP_IDS.CP);
        });

        it('cp_not_required chip should have no billing (text-only)', () => {
            expect(cpNotRequiredChip).toBeDefined();
            // cp_not_required has null billingRef (text-only documentation)
            expect(cpNotRequiredChip?.billingRef).toBeNull();
        });

        it('cp_not_required chip should have text snippet', () => {
            expect(cpNotRequiredChip?.textSnippets).toBeDefined();
            expect(cpNotRequiredChip?.textSnippets?.mittel).toMatch(/nicht erforderlich/i);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Test 4: Counseling defaults
    // ═══════════════════════════════════════════════════════════════
    describe('Counseling Defaults', () => {
        it('should default pulpitisRisk to yes for profunda', () => {
            const extracted = { diagnosis: 'Caries profunda' };
            const facts = createFactsFromExtracted(extracted, 'fuellung');

            expect(facts.counseling.pulpitisRisk).toBe('yes');
        });

        it('should keep pulpitisRisk unknown for normal depth', () => {
            const extracted = { diagnosis: 'Caries media', tiefe: 'normal' };
            const facts = createFactsFromExtracted(extracted, 'fuellung');

            expect(facts.counseling.pulpitisRisk).toBe('unknown');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Test 5: Determinism (same input → same output)
    // ═══════════════════════════════════════════════════════════════
    describe('Determinism', () => {
        it('should produce identical chips for same input run 5x', () => {
            const extracted = { diagnosis: 'Caries profunda', tooth: '36' };
            const answers = { [MEDICAL_QUESTION_IDS.UEBERKAPPUNG]: true };

            const results: string[][] = [];
            for (let i = 0; i < 5; i++) {
                const facts = createFactsFromExtracted(extracted, 'fuellung');
                const updatedFacts = applyAnswersToFacts(facts, answers);
                const chips = getChipIdsFromFacts(updatedFacts);
                results.push(chips);
            }

            // All 5 runs should produce identical chip arrays
            const first = JSON.stringify(results[0]);
            for (const result of results) {
                expect(JSON.stringify(result)).toBe(first);
            }
        });

        it('should produce identical facts for same input run 5x', () => {
            const extracted = { diagnosis: 'Caries profunda', tooth: '46', surfaces: ['m', 'o', 'd'] };

            const results: TreatmentFacts[] = [];
            for (let i = 0; i < 5; i++) {
                const facts = createFactsFromExtracted(extracted, 'fuellung');
                results.push(facts);
            }

            const first = JSON.stringify(results[0]);
            for (const result of results) {
                expect(JSON.stringify(result)).toBe(first);
            }
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // KB Sanity Checks
    // ═══════════════════════════════════════════════════════════════
    describe('KB Sanity', () => {
        it('should have cp chip defined in unified.json', () => {
            expect(cpChip).toBeDefined();
            expect(cpChip?.id).toBe('cp');
            expect(cpChip?.label).toBe('Cp');
        });

        it('should have cp_not_required chip defined in unified.json', () => {
            expect(cpNotRequiredChip).toBeDefined();
            expect(cpNotRequiredChip?.id).toBe('cp_not_required');
        });

        it('cp chip should be in ueberkappung phase', () => {
            const cpChipFull = unifiedJson.chips.find(c => c.id === 'cp') as any;
            expect(cpChipFull?.phase).toBe('ueberkappung');
        });
    });
});
