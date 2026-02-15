/**
 * Gate M14: No Unresolved Template Variables
 *
 * GATE DEFINITION:
 * Rendered output must not contain:
 * - {varName} template placeholders
 * - "undefined" or "null" string artifacts
 * - [varName] missing variable indicators
 */

import { describe, it, expect } from 'vitest';
import { runV10 } from '../../../v10/public';
import type { V10PipelineInput } from '../../../v10/types';

describe('Gate M14: No Unresolved Template Variables', () => {
    const checkForPlaceholders = (text: string): string[] => {
        const issues: string[] = [];

        // Check for {varName} placeholders
        const templateVars = text.match(/\{[^}]+\}/g);
        if (templateVars) {
            issues.push(...templateVars.map(v => `template_placeholder:${v}`));
        }

        // Check for [varName] missing indicators
        const missingVars = text.match(/\[[^\]]+\]/g);
        if (missingVars) {
            // Filter out legitimate bracket uses (like dental surfaces)
            const realMissing = missingVars.filter(v =>
                !v.match(/^\[(?:MOD|MO|OD|DO|M|O|D|B|L|V|P)\]$/i)
            );
            if (realMissing.length > 0) {
                issues.push(...realMissing.map(v => `missing_var:${v}`));
            }
        }

        // Check for "undefined" or "null" string artifacts
        if (text.includes('undefined')) {
            issues.push('string_artifact:undefined');
        }
        if (text.includes('null')) {
            // Filter out legitimate uses like "Palpation positiv/null"
            const nullMatches = text.match(/null(?!\s*positiv|\s*negativ)/gi);
            if (nullMatches) {
                issues.push('string_artifact:null');
            }
        }

        return issues;
    };

    it('simple filling output has no placeholders', async () => {
        const input: V10PipelineInput = {
            dictation: 'Zahn 16 MOD Karies Kompositfüllung',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_vipr', 'positiv'],
            ]),
        };

        const result = await runV10(input);

        if (result.state === 'output' && result.output?.fullText) {
            const issues = checkForPlaceholders(result.output.fullText);
            expect(issues).toEqual([]);
        }
    });

    it('profunda with capping output has no placeholders', async () => {
        const input: V10PipelineInput = {
            dictation: 'Zahn 16 MOD Karies profunda',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_vipr', 'positiv'],
                ['medical_ueberkappung', 'ja'],
            ]),
        };

        const result = await runV10(input);

        if (result.state === 'output' && result.output?.fullText) {
            const issues = checkForPlaceholders(result.output.fullText);
            expect(issues).toEqual([]);
        }
    });

    it('profunda with material context substitutes variable', async () => {
        const input: V10PipelineInput = {
            dictation: 'Zahn 16 MOD Karies profunda direkte Überkappung',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_vipr', 'positiv'],
                ['medical_ueberkappung', 'ja'],
                ['medical_ueberkappung_material', 'MTA'],
            ]),
        };

        const result = await runV10(input);

        if (result.state === 'output' && result.output?.fullText) {
            const issues = checkForPlaceholders(result.output.fullText);
            expect(issues).toEqual([]);
            // Should NOT contain {material} placeholder
            expect(result.output.fullText).not.toContain('{material}');
        }
    });

    it('endo output has no placeholders', async () => {
        const input: V10PipelineInput = {
            dictation: 'Zahn 36 Wurzelbehandlung',
            treatmentId: 'endo',
            insuranceType: 'GKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_vipr', 'positiv'],
            ]),
        };

        const result = await runV10(input);

        if (result.state === 'output' && result.output?.fullText) {
            const issues = checkForPlaceholders(result.output.fullText);
            expect(issues).toEqual([]);
        }
    });

    it('multi-tooth output has no placeholders in any segment', async () => {
        const input: V10PipelineInput = {
            dictation: 'Zahn 16 und 26 Karies Kompositfüllung',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            teeth: ['16', '26'],
            answers: new Map([
                ['medical_vipr', 'positiv'],
            ]),
        };

        const result = await runV10(input);

        if (result.state === 'output') {
            // Check main text
            if (result.output?.fullText) {
                const issues = checkForPlaceholders(result.output.fullText);
                expect(issues).toEqual([]);
            }

            // Check per-tooth texts
            if (result.output?.perTooth) {
                for (const tooth of result.output.perTooth) {
                    const issues = checkForPlaceholders(tooth.text);
                    expect(issues).toEqual([]);
                }
            }
        }
    });

    it('PKV output has no placeholders', async () => {
        const input: V10PipelineInput = {
            dictation: 'Zahn 16 MOD Karies dreiflächige Füllung',
            treatmentId: 'fuellung',
            insuranceType: 'PKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_vipr', 'positiv'],
            ]),
        };

        const result = await runV10(input);

        if (result.state === 'output' && result.output?.fullText) {
            const issues = checkForPlaceholders(result.output.fullText);
            expect(issues).toEqual([]);
        }
    });
});
