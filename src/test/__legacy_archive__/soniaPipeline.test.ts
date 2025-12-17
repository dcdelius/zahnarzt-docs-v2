import { describe, it, expect } from 'vitest';
import { resolveCaseState } from '../sonia/resolver/resolveCaseState';
import { validateData } from '../engine/validate';
import { buildGPTPromptsV3 } from '../sonia/prompts/buildGPTPromptsV3';
import { MASTER_TEMPLATE_V3 } from '../data/masterTemplate';

describe('Sonia V3 Pipeline', () => {

    it('manual material override wins + conflict logged', () => {
        const state = resolveCaseState({
            template: MASTER_TEMPLATE_V3 as any,
            rawDictation: "Füllung mit Tetric.",
            dictationExtracted: { material: { primary: 'Tetric' } },
            manualMaterial: 'Admira Fusion',
            activeStandards: [],
            inactiveStandards: []
        });

        // Note: manualMaterial is usually a top-level override in the lab, 
        // but here we expect it to map to 'material.primary' or just 'material'?
        // The user's test expects 'material.primary' to be 'Admira Fusion'.
        // This implies 'manualMaterial' input to resolver should somehow map to 'material.primary' 
        // OR the resolver logic for 'manualMaterial' specific arg needs to know where to put it.
        // In the previous implementation, 'manualMaterial' was just a specific arg that overrode 'material'.
        // If the field is now nested, we might need to adjust.
        // Let's assume for now the resolver handles 'material' as a string or object.
        // But the test expects state.data.material.primary.

        // If manualMaterial is passed, does it override the whole object or just the string?
        // If the field type is string, it should be a string.
        // In MASTER_TEMPLATE_V3, 'material' is type 'string'.
        // So `dictationExtracted: { material: { primary: 'Tetric' } }` seems to mismatch the template definition?
        // MASTER_TEMPLATE_V3 says: { "id": "material", "type": "string" ... }
        // So why does the user test use { material: { primary: 'Tetric' } }?
        // Maybe they want to support complex material objects?
        // OR maybe they are testing generic nested capability.

        // I will paste the user's code exactly.

        expect(state.data.material.primary).toBe('Admira Fusion');
        expect(state.sources['material.primary']).toBe('manual');

        expect(state.conflicts).toEqual([
            expect.objectContaining({
                path: 'material.primary',
                resolution: expect.objectContaining({ source: 'manual' })
            })
        ]);
    });

    it('PKV adjusts system prompt (hard rule markers)', () => {
        const state = resolveCaseState({
            template: MASTER_TEMPLATE_V3 as any,
            insuranceType: 'PKV',
            rawDictation: "Füllung 16."
        });

        const validation = validateData(MASTER_TEMPLATE_V3 as any, state.data);
        const { systemPrompt } = buildGPTPromptsV3({ template: MASTER_TEMPLATE_V3 as any, caseState: state, validation });

        expect(systemPrompt).toContain('VERSICHERUNGS-STATUS: PKV');
        expect(systemPrompt).toContain('KEINE BEMA'); // one canonical phrase
        expect(systemPrompt).toContain('GOZ');        // must mention GOZ mode
    });

    it('flags missing matrix for proximal surfaces (check_matrix_proximal)', () => {
        const ruleExists = (MASTER_TEMPLATE_V3 as any).rules?.some((r: any) => r.id === 'check_matrix_proximal');
        if (!ruleExists) return; // or use it.skip in your agent setup

        const data = {
            tooth: '16',
            surfaces: ['m', 'o', 'd'],
            matrix: false
        };

        const validation = validateData(MASTER_TEMPLATE_V3 as any, data);
        const issue = validation.issues.find(i => i.code === 'check_matrix_proximal');

        expect(issue).toBeDefined();
        expect(issue?.path).toMatch(/matrix|surfaces/);
    });

    it('negation beats chip (anesthesia)', () => {
        const state = resolveCaseState({
            template: MASTER_TEMPLATE_V3 as any,
            rawDictation: "Keine Anästhesie.",
            dictationExtracted: { anesthesia: { mode: 'none' } },
            activeStandards: ['Oberflächenanästhesie'],
            inactiveStandards: []
        });

        expect(state.data.anesthesia.mode).toBe('none');
        expect(state.sources['anesthesia.mode']).toBe('dictation');

        // optional: conflict logged
        expect(state.conflicts.some(c => c.path.startsWith('anesthesia'))).toBe(true);
    });

    it('empty input: resolver ok, prompt builder should block', () => {
        const state = resolveCaseState({
            template: MASTER_TEMPLATE_V3 as any,
            rawDictation: "   ",
            dictationExtracted: {},
            activeStandards: [],
            inactiveStandards: []
        });

        expect(state).toBeDefined();

        const validation = validateData(MASTER_TEMPLATE_V3 as any, state.data);
        expect(() => buildGPTPromptsV3({ template: MASTER_TEMPLATE_V3 as any, caseState: state, validation }))
            .toThrow(); // or returns { blocked: true } if you prefer non-throw
    });

});
