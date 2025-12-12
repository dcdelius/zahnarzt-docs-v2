import { describe, it, expect } from 'vitest';
import { buildGPTPrompts } from '../utils/buildGPTPrompts';

// MOCK TEMPLATE (Füllung V3)
const MOCK_TEMPLATE = {
    id: "kons_fill_v3",
    title: "Füllungstherapie",
    category: "Konservierend",
    systemVersion: "v3",
    fields: [
        { id: "tooth", label: "Zahn", type: "string" },
        { id: "surfaces", label: "Flächen", type: "multiselect" },
        { id: "anesthesia", label: "Anästhesie", type: "string" },
        { id: "prep", label: "Präparation", type: "string" },
        { id: "material", label: "Material", type: "string" },
        { id: "dryField", label: "Trockenlegung", type: "string" },
        { id: "occlusion", label: "Okklusion", type: "boolean" },
        { id: "consent", label: "Aufklärung", type: "boolean" }
    ],
    practiceDefaults: {
        standardLeistungen: "Oberflächenanästhesie, Trockenlegung (relativ), Okklusionsprüfung, Politur"
    },
    aiSettings: {
        textLength: "standard",
        forensicLevel: "standard",
        blueprint: "modern"
    }
};

describe('Sonia Workflow Tests', () => {

    it('1. Standard GKV Füllung', () => {
        const dictation = "Füllung 16 mod. Leitungsanästhesie. Tetric A3.";
        const activeStandards = ["Oberflächenanästhesie", "Trockenlegung (relativ)", "Okklusionsprüfung", "Politur"];

        const { systemPrompt } = buildGPTPrompts({
            template: MOCK_TEMPLATE,
            inputText: dictation,
            activeStandards,
            inactiveStandards: [],
            insuranceType: 'GKV',
            forensicLevel: 'standard',
            textLength: 'standard'
        });

        // Assertions
        expect(systemPrompt).toContain("VERSICHERUNGS-STATUS: GKV");
        expect(systemPrompt).toContain("BEMA-Positionen");
        expect(systemPrompt).toContain("PRAXIS-STANDARDS (IMPLIZIT)");
        expect(systemPrompt).toContain("Oberflächenanästhesie");
    });

    it('2. PKV High-End', () => {
        const dictation = "Füllung 16 mod. Kofferdam. Tetric EvoCeram. Mikroskop.";
        const activeStandards = ["Oberflächenanästhesie", "Trockenlegung (relativ)", "Okklusionsprüfung", "Politur"];

        const { systemPrompt } = buildGPTPrompts({
            template: MOCK_TEMPLATE,
            inputText: dictation,
            activeStandards,
            inactiveStandards: [],
            insuranceType: 'PKV',
            forensicLevel: 'max',
            textLength: 'standard'
        });

        expect(systemPrompt).toContain("VERSICHERUNGS-STATUS: PKV");
        expect(systemPrompt).toContain("GOZ/GOÄ");
        expect(systemPrompt).toContain("FORENSIK-LEVEL: MAXIMAL");
        expect(systemPrompt).toContain("JEDES denkbare Risiko");
    });

    it('3. Chip Interaction (Exclusion)', () => {
        const dictation = "Füllung 16 occlusal.";
        // User toggled OFF 'Oberflächenanästhesie'
        const activeStandards = ["Trockenlegung (relativ)", "Okklusionsprüfung", "Politur"];
        const inactiveStandards = ["Oberflächenanästhesie"];

        const { systemPrompt } = buildGPTPrompts({
            template: MOCK_TEMPLATE,
            inputText: dictation,
            activeStandards,
            inactiveStandards,
            insuranceType: 'GKV',
            forensicLevel: 'standard',
            textLength: 'standard'
        });

        expect(systemPrompt).toContain("AUSGESCHLOSSENE STANDARDS");
        expect(systemPrompt).toContain("Oberflächenanästhesie");
        expect(systemPrompt).not.toContain("PRAXIS-STANDARDS (IMPLIZIT): \"Oberflächenanästhesie\"");
    });

    it('4. Forensik Critical', () => {
        const dictation = "Tiefe Karies 46. Cp. Vit+. Aufklärung schwierig.";

        const { systemPrompt } = buildGPTPrompts({
            template: MOCK_TEMPLATE,
            inputText: dictation,
            activeStandards: [],
            inactiveStandards: [],
            insuranceType: 'GKV',
            forensicLevel: 'max',
            textLength: 'standard'
        });

        expect(systemPrompt).toContain("FORENSIK-LEVEL: MAXIMAL");
    });

    it('5. Vague Input (Hallucination Protection)', () => {
        const dictation = "Füllung gemacht.";

        const { systemPrompt } = buildGPTPrompts({
            template: MOCK_TEMPLATE,
            inputText: dictation,
            activeStandards: [],
            inactiveStandards: [],
            insuranceType: 'GKV',
            forensicLevel: 'standard',
            textLength: 'standard'
        });

        expect(systemPrompt).toContain("ABSOLUTE REGELN");
        expect(systemPrompt).toContain("Erfinde KEIN RÖNTGENBILD");
        expect(systemPrompt).toContain("Erfinde KEINE PREISE");
    });

});
