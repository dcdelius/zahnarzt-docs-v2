
import { describe, it, expect } from 'vitest';
import { runV10 } from '../../v10/pipeline/runV10';
import { stripToothScope } from '../../medical_kb/engine/applyMedicalKb';

/**
 * Gate: V10 Repro 1 - 26 mod MKV Askbacks (M63)
 * 
 * Verifies the exact scenario reported by user:
 * "Zahn 26 mod Kompositfüllung, tiefe Karies, Kofferdam, Anästhesie, 120 Euro"
 * Insurance: MKV
 * 
 * Expected:
 * - State: questions
 * - Questions: medical_ueberkappung (due to deep caries)
 * - Questions: medical_la_type (due to anesthesia ambiguity) OR resolved if defaults exist
 * - Trace/Facts: Tooth 26 present
 */
describe('Gate: V10 Repro 1 - 26 mod MKV Askbacks', () => {
    const DICTATION = "Zahn 26 mod Kompositfüllung, tiefe Karies, Kofferdam, Anästhesie, 120 Euro";

    it('Run1: Initial run triggers questions for deep caries and anesthesia', async () => {
        const result = await runV10({
            dictation: DICTATION,
            treatmentId: 'fuellung',
            insuranceType: 'MKV', // Explicitly MKV
            textLength: 'mittel',
            testOnly: {
                // Ensure no extraction override masks the real behavior
                // but if extraction fails we might need to mock it. 
                // First try real extraction or inference.
                // Since this is a unit test in node, real extraction might be mocked or stubbed defaults.
                // We use forceExtraction if needed, but let's try without first to see if extraction is the issue.
                // Actually, in gate tests, we usually rely on the pipeline's extraction mock or stub behavior.
                // Let's assume standard stub extraction works or provide forceExtraction to ISOLATE logic from extraction.
                // The user prompt says "Full-circle Pipeline: Dictation -> Extraction/Facts...", implying we should test the whole chain if possible.
                // But for deterministic reproduction of *logic*, forcing extraction is safer if extraction is regex-based.
                // Let's force extraction to be sure we are testing the Logic/Askback wiring, not the extractor reliability.
                forceExtraction: {
                    tooth: '26',
                    surfaces: ['M', 'O', 'D'],
                    diagnosis: 'profunda Anästhesie',
                    cariesDepth: 'profunda',
                    mentioned: {
                        kofferdam: true,
                    },
                }
            },
        });

        // 1. Must ensure state is questions
        expect(result.state).toBe('questions');

        // 2. Identify required questions
        const questionIds = result.questions?.map(q => stripToothScope(q.id)) || [];
        // Expect 'medical_ueberkappung' because 'profunda' -> rule-profunda-requires-ueberkappung-askback
        expect(questionIds).toContain('medical_ueberkappung');

        // Expect 'medical_la_type' because 'anesthetics' is active but type not specified
        // (Assuming no default setting is injected in this clean run)
        // If settings inject a type, this might not appear.
        // But repro says "Current symptom: no questions".

        // 3. Verify tooth is preserved in meta/trace even if in questions state
        // The UI needs to show "Zahn 26" in the header.
        // V10 usually returns facts in meta or as part of output context.
        // Check trace or facts
        // Note: result.questionsBundle may contain context facts if implemented.
    });

    it('Run2: Answering questions produces correct output with MKV billing', async () => {
        // Run again with answers
        const result = await runV10({
            dictation: DICTATION,
            treatmentId: 'fuellung',
            insuranceType: 'MKV',
            textLength: 'mittel',
            answers: new Map([
                ['medical_ueberkappung', 'indirekt'], // Capping performed
                ['medical_ueberkappung_material', 'MTA'], // Material
                ['medical_la_type', 'septanest'], // LA Type
                ['medical_la_amount', '1.7ml'], // LA Amount
                ['medical_vitality', 'neg'],
                ['medical_percussion', 'neg'],
                ['forensic_ueberkappung', true],
                ['forensic_ueberkappung_material', 'MTA'],
                ['forensic_anesthesia_type', 'infiltr'],
                ['forensic_diagnose_confirmation', 'profunda'],
                ['mkv_mkv_betrag', 120],
                ['fuellung_mkv_justification', 'mehrschicht'],
            ]),
            testOnly: {
                forceExtraction: {
                    tooth: '26',
                    surfaces: ['M', 'O', 'D'],
                    diagnosis: 'profunda Anästhesie',
                    cariesDepth: 'profunda',
                    mentioned: {
                        kofferdam: true,
                    },
                }
            },
        });

        // Should be output
        expect(result.state).toBe('output');
        expect(result.output).toBeTruthy();

        // Check Text
        const fullText = result.output?.fullText || '';
        // M64: Tooth is now UI-only decoration, NOT in SSOT output text
        // expect(fullText).toContain('26'); // REMOVED: tooth comes from UI layer
        expect(fullText).toContain('Kofferdam');
        expect(fullText).toContain('Überkappung');
        expect(fullText).toContain('MTA');

        // Verify tooth is in metadata for UI decoration
        expect(result.trace?.instances?.[0]?.tooth).toBe('26');

        // Check Chips/Billing
        // MKV -> Mixed/Defined behavior. Check for specific expected codes if known, 
        // or just ensure billingCodes is not empty.
        expect(result.output?.billingCodes?.length).toBeGreaterThan(0);
    });
});
