
import { describe, it, expect } from 'vitest';
import { renderTemplateV3 } from '../sonia/render/renderTemplateV3';
import { TemplateV3 } from '../sonia/knowledge/types';

const normalizeWhitespace = (str: string) => str.replace(/\s+/g, ' ').trim();

describe('Deterministic Blueprint Rendering (Golden Test)', () => {

    const MOCK_TEMPLATE: TemplateV3 = {
        id: 'golden_test_tpl',
        title: 'Golden Test Template',
        systemVersion: 'v3',
        treatmentType: 'filling',
        version: 1,
        rulesetId: 'conservative',
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
        fields: [],
        defaults: {
            insuranceType: 'GKV',
            showBillingCodes: true,
            includeRisks: true,
            forensicLevel: 'standard',
            textLength: 'standard',
            activeStandards: []
        }
    };

    const MOCK_CASE_STATE = {
        tooth: '16',
        surfaces: ['m', 'o', 'd'],
        material: 'Tetric',
        diagnosis: 'Karies',
        anesthesia: 'Infiltration',
        risks: ['Schmerzen', 'Nachblutung'],
        dictationExtras: ['Mundsperrer verwendet', 'Patient würgt'],
        meta: { insuranceType: 'GKV' }
    };

    const MOCK_ACCEPTED_SUGGESTIONS = [
        {
            id: 'rule_bema_13b',
            label: 'Füllung 3-flächig',
            billingItems: [{ code: 'BEMA 13b', label: 'Füllung 3-flächig' }]
        },
        {
            id: 'rule_bema_40',
            label: 'Infiltration',
            billingItems: [{ code: 'BEMA 40', label: 'Infiltration' }]
        }
    ];

    const MOCK_INJECTED_TEXT = [
        'Kofferdam angelegt.',
        'Matrize gesetzt.',
        'Kofferdam angelegt.' // Duplicate to test dedupe
    ];

    it('should render deterministically and match snapshot', () => {
        const renderContext = {
            template: MOCK_TEMPLATE,
            caseState: MOCK_CASE_STATE,
            validation: { isValid: true, errors: [] },
            acceptedSuggestions: MOCK_ACCEPTED_SUGGESTIONS,
            injectedText: MOCK_INJECTED_TEXT,
            dictationRaw: 'Test dictation',
            dictationExtras: MOCK_CASE_STATE.dictationExtras
        };

        const result = renderTemplateV3(renderContext);

        expect(normalizeWhitespace(result.fullText)).toMatchSnapshot();

        // Specific checks
        expect(result.summary).toContain('Zahn 16 (m, o, d), Tetric');
        expect(result.procedure).toContain('Anästhesie: Infiltration');

        // Deduplication check
        const kofferdamCount = (result.procedure.match(/Kofferdam angelegt\./g) || []).length;
        expect(kofferdamCount).toBe(1);

        expect(result.procedure).toContain('Matrize gesetzt.');

        // Extras check
        expect(result.extras).toContain('Mundsperrer verwendet');
        expect(result.extras).toContain('Patient würgt');

        // Billing check
        expect(result.billing).toContain('BEMA 13b Füllung 3-flächig');
        expect(result.forensic).toContain('Schmerzen');
    });

    it('should handle missing tokens by removing lines (Smart Line Removal)', () => {
        const incompleteState = {
            ...MOCK_CASE_STATE,
            diagnosis: null, // Should remove "Diagnose: ..." line
            anesthesia: null // Should remove "Anästhesie: ..." line
        };
        const renderContext = {
            template: MOCK_TEMPLATE,
            caseState: incompleteState,
            validation: { isValid: true, errors: [] },
            acceptedSuggestions: [],
            injectedText: [],
            dictationRaw: '',
            dictationExtras: []
        };

        const result = renderTemplateV3(renderContext);

        // Check that lines are removed
        expect(result.summary).not.toContain('Diagnose:');
        expect(result.procedure).not.toContain('Anästhesie:');
        expect(result.procedure).not.toContain('[[MISSING:');
    });

    it('should render new tokens correctly', () => {
        const stateWithShade = {
            ...MOCK_CASE_STATE,
            shade: 'A3',
            surfaces: ['m', 'o', 'd']
        };

        const renderContext = {
            template: {
                ...MOCK_TEMPLATE,
                blueprint: {
                    ...MOCK_TEMPLATE.blueprint,
                    summary: '{{surfacesShort}} | {{surfacesPretty}} | {{material}}'
                }
            },
            caseState: stateWithShade,
            validation: { isValid: true, errors: [] },
            acceptedSuggestions: [],
            injectedText: [],
            dictationRaw: '',
            dictationExtras: []
        };

        const result = renderTemplateV3(renderContext);

        expect(result.summary).toContain('MOD'); // surfacesShort
        expect(result.summary).toContain('m, o, d'); // surfacesPretty
        expect(result.summary).toContain('Tetric (A3)'); // material + shade
    });
});
