import { describe, it, expect } from 'vitest';
import { buildGPTPrompts } from '../utils/buildGPTPrompts';
import { MASTER_TEMPLATE_V3 } from '../data/masterTemplate';
import { validateData } from '../engine/validate';

describe('Rigorous System Test: Sonia Workflow + Master Template V3', () => {

    // 1. STANDARD GKV (Happy Path)
    it('1. Standard GKV Filling (BEMA + Standards)', () => {
        const dictation = "Füllung 16 od mit Tetric. Leitungsanästhesie.";
        const activeStandards = ["Oberflächenanästhesie", "Trockenlegung (relativ)", "Politur"];

        const { systemPrompt, userPrompt } = buildGPTPrompts({
            template: MASTER_TEMPLATE_V3 as any,
            inputText: dictation,
            activeStandards: activeStandards as any,
            insuranceType: 'GKV',
            textLength: 'standard',
            forensicLevel: 'standard',
            bausteine: [],
            allBausteine: [],
            globalSystemPrompt: '',
            manualMaterial: ''
        });

        expect(systemPrompt).toContain("VERSICHERUNGS-STATUS: GKV");
        expect(systemPrompt).toContain("BEMA"); // Should mention BEMA context
        expect(systemPrompt).toContain("Oberflächenanästhesie"); // Chip
        expect(userPrompt).toContain("Tetric"); // From dictation (in user prompt)
    });

    // 2. PKV HIGH-END (GOZ Only)
    it('2. PKV High-End (GOZ Only, No BEMA)', () => {
        const dictation = "Füllung 16 od, Keramik, Kofferdam.";
        const activeStandards = ["Adhäsivtechnik", "Politur"];

        const { systemPrompt } = buildGPTPrompts({
            template: MASTER_TEMPLATE_V3 as any,
            inputText: dictation,
            activeStandards: activeStandards as any,
            insuranceType: 'PKV',
            textLength: 'standard',
            forensicLevel: 'max',
            bausteine: [],
            allBausteine: [],
            globalSystemPrompt: '',
            manualMaterial: ''
        });

        expect(systemPrompt).toContain("VERSICHERUNGS-STATUS: PKV");
        expect(systemPrompt).toContain("KEINE BEMA-Positionen");
        expect(systemPrompt).toContain("FORENSIK-LEVEL: MAXIMAL");
    });

    // 3. FORENSIC: DEEP CARIES (Warning Logic)
    it('3. Forensic: Deep Caries (Validation Rule Check)', () => {
        // This tests the ENGINE validation logic defined in the template
        const data = {
            tooth: "16",
            excavation: "Caries profunda",
            consent: false // Missing consent!
        };

        const validation = validateData(MASTER_TEMPLATE_V3 as any, data);

        // The template has a rule: check_cp_forensics
        const warning = validation.issues.find(i => i.message.includes("Aufklärung über Nervrisiko"));
        expect(warning).toBeDefined();
        expect(warning?.type).toBe("warning");
    });

    // 4. ANESTHESIA: NONE (Rule Check)
    it('4. Anesthesia: None (Validation Rule Check)', () => {
        const data = {
            tooth: "16",
            anesthesia: "Keine"
        };

        const validation = validateData(MASTER_TEMPLATE_V3 as any, data);

        // Rule: check_anesthesia_missing
        const warning = validation.issues.find(i => i.message.includes("ohne Anästhesie"));
        expect(warning).toBeDefined();
    });

    // 5. CHIP INTERACTION: REMOVE STANDARD
    it('5. Chip Interaction: Standard Removed', () => {
        const dictation = "Füllung 16.";
        // User explicitly REMOVED "Politur" from active standards
        const activeStandards = ["Oberflächenanästhesie"];
        const inactiveStandards = ["Politur"];

        const { systemPrompt } = buildGPTPrompts({
            template: MASTER_TEMPLATE_V3 as any,
            inputText: dictation,
            activeStandards: activeStandards as any,
            inactiveStandards: inactiveStandards as any,
            insuranceType: 'GKV',
            textLength: 'standard',
            forensicLevel: 'standard',
            bausteine: [],
            allBausteine: [],
            globalSystemPrompt: '',
            manualMaterial: ''
        });

        // If "Politur" is inactive, it should NOT appear in the implicit standards list.
        // The prompt builder removes inactive standards from the list.
        expect(systemPrompt).not.toContain(`- "Politur"`);
        expect(systemPrompt).not.toContain(`standardLeistungen: Politur`);
    });

    // 6. MATERIAL OVERRIDE
    it('6. Material Override (Manual Input)', () => {
        const dictation = "Füllung mit Tetric.";
        const manualMaterial = "Admira Fusion"; // User typed this in settings

        const { systemPrompt } = buildGPTPrompts({
            template: MASTER_TEMPLATE_V3 as any,
            inputText: dictation,
            activeStandards: [],
            manualMaterial,
            insuranceType: 'GKV',
            bausteine: [],
            allBausteine: [],
            globalSystemPrompt: '',
            textLength: 'standard',
            forensicLevel: 'standard'
        });

        expect(systemPrompt).toContain("Admira Fusion");
    });

    // 7. TEXT STYLE: DETAILED (Arztbrief)
    it('7. Text Style: Detailed', () => {
        const { systemPrompt } = buildGPTPrompts({
            template: MASTER_TEMPLATE_V3 as any,
            inputText: "Füllung 16.",
            textLength: 'detailed',
            activeStandards: [],
            insuranceType: 'GKV',
            bausteine: [],
            allBausteine: [],
            globalSystemPrompt: '',
            forensicLevel: 'standard',
            manualMaterial: ''
        });

        expect(systemPrompt).toContain("STIL-VORGABE: DETAILLIERT");
        expect(systemPrompt).toContain("vollen, grammatikalisch korrekten Sätzen");
    });

    // 8. TEXT STYLE: SHORT (Telegram)
    it('8. Text Style: Short', () => {
        const { systemPrompt } = buildGPTPrompts({
            template: MASTER_TEMPLATE_V3 as any,
            inputText: "Füllung 16.",
            textLength: 'short',
            activeStandards: [],
            insuranceType: 'GKV',
            bausteine: [],
            allBausteine: [],
            globalSystemPrompt: '',
            forensicLevel: 'standard',
            manualMaterial: ''
        });

        expect(systemPrompt).toContain("STIL-VORGABE: KURZ");
        expect(systemPrompt).toContain("Telegramm");
    });

    // 9. MULTI-SURFACE / MATRIX LOGIC
    it('9. Multi-Surface & Matrix (Validation)', () => {
        // MOD filling requires Matrix according to template rules
        const data = {
            tooth: "16",
            surfaces: ["m", "o", "d"],
            matrix: false // Missing!
        };

        const validation = validateData(MASTER_TEMPLATE_V3 as any, data);

        // Rule: check_matrix_proximal
        const warning = validation.issues.find(i => i.message.includes("ohne Matrize"));
        expect(warning).toBeDefined();
    });

    // 10. VAGUE INPUT (Hallucination Safeguard)
    it('10. Vague Input (Hallucination Safeguard)', () => {
        const dictation = "Zahn gemacht.";

        const { systemPrompt } = buildGPTPrompts({
            template: MASTER_TEMPLATE_V3 as any,
            inputText: dictation,
            forensicLevel: 'max',
            activeStandards: [],
            insuranceType: 'GKV',
            bausteine: [],
            allBausteine: [],
            globalSystemPrompt: '',
            textLength: 'standard',
            manualMaterial: ''
        });

        expect(systemPrompt).toContain("ABSOLUTE REGELN");
        expect(systemPrompt).toContain("Erfinde KEIN RÖNTGENBILD");
        expect(systemPrompt).toContain("Erfinde KEINE PREISE");
    });

});
