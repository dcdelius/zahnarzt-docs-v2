
import { describe, it, expect, vi } from 'vitest';
import { extractDictationV3 } from '../sonia/extraction/extractDictationV3';
import { renderTemplateV3 } from '../sonia/render/renderTemplateV3';
import { validateData } from '../engine/validate'; // Correct path
import { TemplateV3 } from '../sonia/knowledge/types';

// Mock LLM Service ONLY
vi.mock('../sonia/utils/llmService', () => ({
    runLLMProcessing: vi.fn().mockResolvedValue(JSON.stringify({
        data: {
            tooth: '16',
            surfaces: ['m', 'o', 'd'],
            material: 'Tetric',
            diagnosis: 'Karies',
            anesthesia: 'Infiltration',
            dictationExtras: ['Mundsperrer verwendet']
        },
        meta: {
            fieldMeta: {},
            ambiguous: []
        }
    }))
}));

describe('TemplateStudio Integration Flow', () => {

    const MOCK_TEMPLATE: TemplateV3 = {
        id: 'studio_test_tpl',
        title: 'Studio Test Template',
        systemVersion: 'v3',
        treatmentType: 'filling',
        version: 1,
        rulesetId: 'conservative_rules',
        renderSpec: {
            sections: [
                { id: 'summary', required: true, title: 'ZUSAMMENFASSUNG' },
                { id: 'procedure', required: true, title: 'BEHANDLUNGSABLAUF' },
                { id: 'extras', required: true, title: 'SONSTIGES' }
            ],
            strict: true
        },
        renderMode: 'deterministic',
        blueprint: {
            summary: 'Zahn {{tooth}}',
            procedure: '{{procedureLines}}',
            extras: '{{dictationExtras}}'
        },
        requiredFacts: ['tooth'],
        fields: [
            { id: 'tooth', label: 'Zahn', type: 'string' }
        ],
        defaults: {}
    };

    it('should run the full flow used in TemplateStudio', async () => {
        const rawDictation = "Füllung an 16, Mundsperrer verwendet";

        // 1. Extract
        const { extracted, meta } = await extractDictationV3({
            template: MOCK_TEMPLATE,
            rawText: rawDictation,
            model: 'gpt-4o-mini'
        });

        expect(extracted.tooth).toBe('16');

        // 2. Validate
        const validation = validateData(MOCK_TEMPLATE, extracted);
        expect(validation.isValid).toBe(true);

        // 3. Render
        const rendered = renderTemplateV3({
            template: MOCK_TEMPLATE,
            caseState: extracted,
            validation,
            acceptedSuggestions: [],
            injectedText: [],
            dictationRaw: rawDictation,
            dictationExtras: extracted.dictationExtras || []
        });

        console.log('Rendered:', rendered.fullText);
        expect(rendered.fullText).toContain('Zahn 16');
        expect(rendered.fullText).toContain('Mundsperrer verwendet');
    });
});
