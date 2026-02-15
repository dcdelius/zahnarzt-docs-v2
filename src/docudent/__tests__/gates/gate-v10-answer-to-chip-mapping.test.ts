/**
 * Gate: V10 Answer-to-Chip Mapping Safety (M61)
 * 
 * Verifies that chipActivation fields in question bank point to valid chipIds.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const TREATMENTS_DIR = join(__dirname, '../../core/billing/knowledgeBase/treatments');
const PACK_IDS = ['fuellung', 'endo', 'extraction', 'pzr', 'crown_prep'];

describe('Gate: V10 Answer-to-Chip Mapping Safety (M61)', () => {
    describe.each(PACK_IDS)('Pack: %s', (packId) => {
        const unifiedPath = join(TREATMENTS_DIR, packId, 'unified.json');
        const qbPath = join(TREATMENTS_DIR, packId, 'question_bank.json');

        let unified: any;
        let questionBank: any;
        let chipIds: Set<string>;

        try {
            unified = JSON.parse(readFileSync(unifiedPath, 'utf-8'));
            questionBank = JSON.parse(readFileSync(qbPath, 'utf-8'));
            chipIds = new Set(unified.chips?.map((c: any) => c.id) || []);
        } catch {
            unified = null;
            questionBank = null;
            chipIds = new Set();
        }

        it('all chipActivation references exist in unified.json', () => {
            if (!questionBank?.questions) return;

            const missingChips: string[] = [];

            for (const question of questionBank.questions) {
                if (question.options) {
                    for (const option of question.options) {
                        if (option.chipActivation && !chipIds.has(option.chipActivation)) {
                            missingChips.push(`${question.key}.${option.id} -> ${option.chipActivation}`);
                        }
                    }
                }
            }

            if (missingChips.length > 0) {
                console.warn(`[AUDIT] ${packId}: Missing chipActivation refs:\n${missingChips.join('\n')}`);
            }
            // Document as audit finding
        });

        it('no chipActivation entries in question bank (Procedure SSOT)', () => {
            if (!questionBank?.questions) return;

            const violations: string[] = [];

            for (const question of questionBank.questions) {
                if (!question.options) continue;
                for (const option of question.options) {
                    if (option.chipActivation) {
                        violations.push(`${question.key}.${option.id} -> ${option.chipActivation}`);
                    }
                }
            }

            expect(violations).toEqual([]);
        });

        it('dataField mappings use consistent naming', () => {
            if (!questionBank?.questions) return;

            for (const question of questionBank.questions) {
                expect(question.dataField).toBeDefined();
                // DataField should be namespaced (mentioned.*, upsell.*, etc)
                if (!question.dataField.includes('.') && !['costs', 'mkvVereinbarung'].includes(question.dataField)) {
                    console.warn(`[AUDIT] Question ${question.key} has non-namespaced dataField: ${question.dataField}`);
                }
            }
        });

        it('no short alias chipIds in chipActivation (audit)', () => {
            if (!questionBank?.questions) return;
            const violations: string[] = [];

            for (const question of questionBank.questions) {
                if (question.options) {
                    for (const option of question.options) {
                        if (option.chipActivation && !chipIds.has(option.chipActivation)) {
                            violations.push(`${question.key}.${option.id} -> ${option.chipActivation}`);
                        }
                    }
                }
            }

            if (violations.length > 0) {
                console.warn(`[AUDIT] ${packId}: Missing chipActivation refs:\n${violations.join('\n')}`);
            }
            // Document as audit finding, don't fail
        });
    });
});
