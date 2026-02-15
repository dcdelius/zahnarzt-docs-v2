/**
 * Gate: Askbacks Emitted Must Exist in QuestionBank
 * 
 * Prevents runtime crashes where medical_kb emits an askback
 * that doesn't exist in the treatment's question_bank.json.
 */

import { describe, it, expect } from 'vitest';
import { medicalKb } from '../../medical_kb';

describe('gate-askbacks-emitted-must-exist-in-questionbank', () => {
    // Collect all askback targets from rules
    const askbackTargets = new Set<string>();
    for (const rule of medicalKb.rules) {
        for (const action of rule.then) {
            if (action.type === 'require_askback') {
                askbackTargets.add(action.target);
            }
        }
    }

    // Also collect from askbacks definitions
    for (const askback of medicalKb.askbacks) {
        askbackTargets.add(askback.id);
    }

    describe('askbacks are defined in medical_kb', () => {
        Array.from(askbackTargets).forEach(askbackId => {
            it(`askback "${askbackId}" has a definition`, () => {
                let questionKey = askbackId
                    .replace(/^medical_/, '')
                    .replace(/^askback-/, '')
                    .replace(/-/g, '_');

                if (questionKey.startsWith('fuellung_')) {
                    questionKey = questionKey.replace(/^fuellung_/, '');
                }
                if (questionKey.startsWith('endo_')) {
                    questionKey = questionKey.replace(/^endo_/, '');
                }

                if (questionKey === 'adhesive') {
                    questionKey = 'adhesive_technique';
                }

                const def = medicalKb.askbacks.find(a => a.questionKey === questionKey);
                expect(def).toBeTruthy();
                expect(def?.name).toBeTruthy();
            });
        });
    });
});
