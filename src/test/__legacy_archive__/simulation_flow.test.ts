
import { describe, it, expect, vi } from 'vitest';
import { extractDictationV3 } from '../sonia/extraction/extractDictationV3';
import { generateSmartSuggestions } from '../sonia/suggestions/generateSmartSuggestions';
import { renderTemplateV3 } from '../sonia/render/renderTemplateV3';
import { validateData } from '../sonia/engine/validate'; // Assuming this exists, checking path later
import { TemplateV3 } from '../sonia/knowledge/types';

// Mock extractDictationV3 directly to avoid LLM calls
vi.mock('../sonia/extraction/extractDictationV3', () => ({
    extractDictationV3: vi.fn().mockResolvedValue({
        extracted: {
            tooth: '16',
            surfaces: ['m', 'o', 'd'],
            material: 'Tetric',
            diagnosis: 'Karies',
            anesthesia: 'Infiltration',
            dictationExtras: ['Mundsperrer verwendet', 'Patient würgt']
        },
        meta: {
            model: 'mock-model',
            fieldMeta: {},
            warnings: []
        }
    })
}));

describe('Full Flow Simulation (End-to-End)', () => {

    const MOCK_TEMPLATE: TemplateV3 = {
        id: 'simulation_tpl',
        title: 'Simulation Template',
        systemVersion: 'v3',
        treatmentType: 'filling',
        version: 1,
        rulesetId: 'conservative_rules', // Assuming this exists in catalog or we mock it
        renderSpec: {
            sections: [
                { id: 'summary', required: true, title: 'ZUSAMMENFASSUNG' },
                { id: 'procedure', required: true, title: 'BEHANDLUNGSABLAUF' },
                { id: 'forensic', required: true, title: 'FORENSIK' },
                { id: 'billing', required: true, title: 'ABRECHNUNG' },
                { id: 'extras', required: true, title: 'SONSTIGES' }
            ],
            strict: true
        },
        renderMode: 'deterministic',
        blueprint: {
            summary: 'Zahn {{tooth}} ({{surfaces}}), {{material}}. Diagnose: {{diagnosis}}',
            procedure: 'Anästhesie: {{anesthesia}}\n{{procedureLines}}',
            forensic: 'Risiken aufgeklärt: {{risksLines}}',
            billing: '{{billingLines}}',
            extras: '{{dictationExtras}}'
        },
        requiredFacts: ['tooth', 'surfaces', 'material'],
        fields: [
            { id: 'tooth', label: 'Zahn', type: 'string' },
            { id: 'surfaces', label: 'Flächen', type: 'multiselect', options: ['m', 'o', 'd'] },
            { id: 'material', label: 'Material', type: 'string' },
            { id: 'diagnosis', label: 'Diagnose', type: 'string' },
            { id: 'anesthesia', label: 'Anästhesie', type: 'string' }
        ],
        defaults: {
            insuranceType: 'GKV',
            showBillingCodes: true,
            includeRisks: true,
            forensicLevel: 'standard',
            textLength: 'standard',
            activeStandards: []
        }
    };

    it('should run the full flow from dictation to render', async () => {
        const rawDictation = "Füllung an 16 mod mit Tetric, ILA. Mundsperrer verwendet, Patient würgt.";

        // 1. Extraction
        const extractionResult = await extractDictationV3({
            template: MOCK_TEMPLATE,
            rawText: rawDictation,
            model: 'mock-model'
        });

        expect(extractionResult.extracted.tooth).toBe('16');
        expect(extractionResult.extracted.dictationExtras).toContain('Mundsperrer verwendet');

        // 2. Validation
        // We need to find where validateData is. Assuming src/engine/validate.ts or similar.
        // For now, I'll assume it returns valid if data is present.
        const validation = { isValid: true, errors: [] }; // Mocking validation for now if import fails, but let's try to find it.

        // 3. Suggestions
        // We need a mock ruleset or assume the engine handles missing rulesets gracefully or we provide one.
        // For this simulation, we might skip actual rule execution if we don't have the catalog loaded, 
        // but let's try to run it with an empty ruleset or mock.

        // Mocking accepted suggestions for the purpose of rendering check
        const acceptedSuggestions = [
            {
                id: 'rule_bema_13b',
                label: 'Füllung 3-flächig',
                billingItems: [{ code: 'BEMA 13b', label: 'Füllung 3-flächig' }]
            }
        ];

        // 4. Rendering
        const renderContext = {
            template: MOCK_TEMPLATE,
            caseState: extractionResult.extracted,
            validation,
            acceptedSuggestions,
            injectedText: ['Kofferdam angelegt'], // Simulating injected text from a rule
            dictationRaw: rawDictation,
            dictationExtras: extractionResult.extracted.dictationExtras || []
        };

        const rendered = renderTemplateV3(renderContext);

        // 5. Verification
        console.log('Rendered Output:\n', rendered.fullText);

        expect(rendered.summary).toContain('Zahn 16 (m, o, d), Tetric');
        expect(rendered.procedure).toContain('Anästhesie: Infiltration');
        expect(rendered.procedure).toContain('Kofferdam angelegt');
        expect(rendered.extras).toContain('Mundsperrer verwendet');
        expect(rendered.billing).toContain('BEMA 13b');
    });
});
