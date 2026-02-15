import { describe, it, expect } from 'vitest';
import { buildGPTPrompts } from '../utils/buildGPTPrompts';

// MOCK TEMPLATE
const MOCK_TEMPLATE = {
    id: "kons_fill_v3",
    title: "Füllungstherapie",
    category: "Konservierend",
    systemVersion: "v3",
    fields: [],
    practiceDefaults: { standardLeistungen: "Oberflächenanästhesie" },
    aiSettings: { textLength: "standard", forensicLevel: "standard", blueprint: "modern" }
};

describe('Sonia Workflow Edge Cases', () => {

    it('1. Material Conflict (Manual Override wins)', () => {
        // Dictation says Tetric, but User manually selected "Admira Fusion" in UI
        const dictation = "Füllung mit Tetric.";
        const manualMaterial = "Admira Fusion";

        const { systemPrompt } = buildGPTPrompts({
            template: MOCK_TEMPLATE,
            inputText: dictation,
            activeStandards: [],
            insuranceType: 'GKV',
            manualMaterial: manualMaterial,
            bausteine: [],
            allBausteine: [],
            globalSystemPrompt: '',
            textLength: 'standard',
            forensicLevel: 'standard'
        });

        // The prompt should prioritize the manual material list or instruction
        // We just check if the manual material is present in the prompt
        expect(systemPrompt).toContain("Admira Fusion");
        // It might still contain Tetric in the dictation part, but the system instruction should be clear.
    });

    it('2. Multi-Tooth Complex Input', () => {
        const dictation = "16 Füllung mod, 15 Füllung od. Anästhesie für beide.";

        const { systemPrompt, userPrompt } = buildGPTPrompts({
            template: MOCK_TEMPLATE,
            inputText: dictation,
            activeStandards: [],
            insuranceType: 'GKV',
            bausteine: [],
            allBausteine: [],
            globalSystemPrompt: '',
            textLength: 'standard',
            forensicLevel: 'standard',
            manualMaterial: ''
        });

        // Check if prompt allows for multiple teeth logic or doesn't break
        expect(userPrompt).toContain(dictation);
        // We expect the prompt NOT to force a single tooth structure if not strictly defined
        expect(systemPrompt).not.toContain("Nur ein Zahn erlaubt");
    });

    it('3. Insurance Force (User Toggle vs Default)', () => {
        // Template might be standard, but user forces PKV
        const dictation = "Normale Füllung.";

        const { systemPrompt } = buildGPTPrompts({
            template: MOCK_TEMPLATE,
            inputText: dictation,
            activeStandards: [],
            insuranceType: 'PKV',
            bausteine: [],
            allBausteine: [],
            globalSystemPrompt: '',
            textLength: 'standard',
            forensicLevel: 'standard',
            manualMaterial: '' // User forced PKV
        });

        expect(systemPrompt).toContain("VERSICHERUNGS-STATUS: PKV");
        expect(systemPrompt).toContain("GOZ/GOÄ");
        // The prompt might mention BEMA in the instructions (e.g. "Check BEMA"), 
        // but it MUST contain the rule to NOT use it.
        expect(systemPrompt).toContain("KEINE BEMA-Positionen nennen!");
    });

    it('4. Contradiction (Chip vs Dictation)', () => {
        // Dictation says "Keine Anästhesie", but Chip "Oberflächenanästhesie" is ACTIVE
        const dictation = "Patient wollte keine Spritze, keine Anästhesie.";
        const activeStandards = ["Oberflächenanästhesie"]; // User clicked this ON

        const { systemPrompt } = buildGPTPrompts({
            template: MOCK_TEMPLATE,
            inputText: dictation,
            activeStandards: activeStandards as any,
            insuranceType: 'GKV',
            bausteine: [],
            allBausteine: [],
            globalSystemPrompt: '',
            textLength: 'standard',
            forensicLevel: 'standard',
            manualMaterial: ''
        });

        // The prompt should include the standard. The LLM needs to resolve this.
        // Ideally, the prompt should say "Standards override" or "Explicitly included".
        expect(systemPrompt).toContain("PRAXIS-STANDARDS (IMPLIZIT):");
        expect(systemPrompt).toContain("Oberflächenanästhesie");
    });

    it('5. Empty Input Handling', () => {
        const dictation = "   "; // Empty/Whitespace

        // Should throw error or handle gracefully
        expect(() => {
            buildGPTPrompts({
                template: MOCK_TEMPLATE,
                inputText: dictation,
                activeStandards: [],
                insuranceType: 'GKV',
                bausteine: [],
                allBausteine: [],
                globalSystemPrompt: '',
                textLength: 'standard',
                forensicLevel: 'standard',
                manualMaterial: ''
            });
        }).toThrow(); // Expecting validation error
    });

});
