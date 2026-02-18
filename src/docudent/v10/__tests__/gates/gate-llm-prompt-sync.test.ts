import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildExtractionPromptV1, buildPreanalysisPrompt } from '@/docudent/contracts/llmPromptContracts';
import { PREANALYSIS_TREATMENT_IDS_V1 } from '@/docudent/contracts/treatments.manifest';
import {
    TREATMENT_INTENT_CONTRACT_VERSION,
    TREATMENT_INTENT_UNCERTAINTY_CODES,
} from '../../preanalysis/treatmentIntentContract';

describe('gate: llm prompt sync', () => {
    it('app preanalysis prompt includes manifest treatments + uncertainty contract', () => {
        const prompt = buildPreanalysisPrompt({
            version: TREATMENT_INTENT_CONTRACT_VERSION,
            treatmentIds: PREANALYSIS_TREATMENT_IDS_V1,
            uncertaintyCodes: TREATMENT_INTENT_UNCERTAINTY_CODES,
        });

        expect(prompt).toContain(`"version": "${TREATMENT_INTENT_CONTRACT_VERSION}"`);
        expect(prompt).toContain('"sharedFacts": { "key": "value optional" }');
        expect(prompt).toContain('Fuer sharedFacts bevorzugte Keys:');
        for (const treatmentId of PREANALYSIS_TREATMENT_IDS_V1) {
            expect(prompt).toContain(treatmentId);
        }
        for (const uncertaintyCode of TREATMENT_INTENT_UNCERTAINTY_CODES) {
            expect(prompt).toContain(uncertaintyCode);
        }
    });

    it('functions prompt contract contains the same treatment + uncertainty ids', () => {
        const functionsPromptContractPath = path.resolve(
            process.cwd(),
            'functions/src/llm/promptContracts.ts'
        );
        const source = fs.readFileSync(functionsPromptContractPath, 'utf8');

        for (const treatmentId of PREANALYSIS_TREATMENT_IDS_V1) {
            expect(source).toContain(`'${treatmentId}'`);
        }
        for (const uncertaintyCode of TREATMENT_INTENT_UNCERTAINTY_CODES) {
            expect(source).toContain(`'${uncertaintyCode}'`);
        }
        expect(source).toContain(
            `PREANALYSIS_PROMPT_CONTRACT_VERSION = '${TREATMENT_INTENT_CONTRACT_VERSION}'`
        );
    });

    it('keeps extraction prompt contract aligned between app and functions', () => {
        const appPrompt = buildExtractionPromptV1();
        const functionsPromptContractPath = path.resolve(
            process.cwd(),
            'functions/src/llm/promptContracts.ts'
        );
        const source = fs.readFileSync(functionsPromptContractPath, 'utf8');

        const criticalClauses = [
            'teeth: Array aller explizit genannten Zahnnummern',
            'Diagnose nur setzen, wenn sie im Diktat wirklich belegt ist',
            'Sekundaerkaries" alleine bedeutet NICHT automatisch "Caries profunda"',
            'Wenn mehrere Zaehne genannt sind und kein klarer Hauptzahn ableitbar ist',
            'reasoning.intentHints: Array optionaler Hinweise',
            'Inferenz ist erlaubt, aber NUR in reasoning.intentHints/factHints',
            'Kontext-Cues fuer reasoning.intentHints (behandlungsuebergreifend):',
            'roentgen: opg, zahnfilm, bissfluegel, 3d, indikation, befund',
            'basis="explicit" nur wenn direkt gesagt; sonst basis="inferred"',
            'inferred Hinweise nie als sichere Fakten ausgeben',
        ];

        for (const clause of criticalClauses) {
            expect(appPrompt).toContain(clause);
            expect(source).toContain(clause);
        }
    });
});
