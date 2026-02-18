import { describe, expect, it } from 'vitest';

import { runV10 } from '../../pipeline/runV10';

describe('runV10 requireLlmExtraction', () => {
    it('returns error when extraction runtime is not llm', async () => {
        const result = await runV10({
            dictation: 'Zahn 36 okklusal Kompositfüllung durchgeführt.',
            treatmentId: 'fuellung',
            insuranceType: 'GKV',
            textLength: 'mittel',
            requireLlmExtraction: true,
        });

        expect(result.state).toBe('error');
        expect(result.error).toContain('LLM extraction required');
        expect(result.meta?.traceLines?.some(line => line.includes('extraction_method_required=llm'))).toBe(true);
    });

    it('keeps normal behavior when llm requirement is not enabled', async () => {
        const prevRequire = process.env.DOCUDENT_REQUIRE_LLM_PATH;
        const prevViteRequire = process.env.VITE_V10_REQUIRE_LLM_EXTRACTION;
        const prevOpenAi = process.env.OPENAI_API_KEY;
        const prevViteOpenAi = process.env.VITE_OPENAI_API_KEY;
        const prevReactOpenAi = process.env.REACT_APP_OPENAI_API_KEY;
        delete process.env.DOCUDENT_REQUIRE_LLM_PATH;
        delete process.env.VITE_V10_REQUIRE_LLM_EXTRACTION;
        delete process.env.OPENAI_API_KEY;
        delete process.env.VITE_OPENAI_API_KEY;
        delete process.env.REACT_APP_OPENAI_API_KEY;
        try {
            const result = await runV10({
                dictation: 'Zahn 36 okklusal Kompositfüllung durchgeführt.',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
            });

            expect(result.state === 'questions' || result.state === 'output').toBe(true);
        } finally {
            if (prevRequire === undefined) delete process.env.DOCUDENT_REQUIRE_LLM_PATH;
            else process.env.DOCUDENT_REQUIRE_LLM_PATH = prevRequire;
            if (prevViteRequire === undefined) delete process.env.VITE_V10_REQUIRE_LLM_EXTRACTION;
            else process.env.VITE_V10_REQUIRE_LLM_EXTRACTION = prevViteRequire;
            if (prevOpenAi === undefined) delete process.env.OPENAI_API_KEY;
            else process.env.OPENAI_API_KEY = prevOpenAi;
            if (prevViteOpenAi === undefined) delete process.env.VITE_OPENAI_API_KEY;
            else process.env.VITE_OPENAI_API_KEY = prevViteOpenAi;
            if (prevReactOpenAi === undefined) delete process.env.REACT_APP_OPENAI_API_KEY;
            else process.env.REACT_APP_OPENAI_API_KEY = prevReactOpenAi;
        }
    });

    it('can be forced globally via DOCUDENT_REQUIRE_LLM_PATH env', async () => {
        const prev = process.env.DOCUDENT_REQUIRE_LLM_PATH;
        process.env.DOCUDENT_REQUIRE_LLM_PATH = '1';
        try {
            const result = await runV10({
                dictation: 'Zahn 36 okklusal Kompositfüllung durchgeführt.',
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                textLength: 'mittel',
                preExtracted: {
                    tooth: '36',
                    teeth: ['36'],
                    surfaces: ['o'],
                    _extractionMethod: 'regex',
                    _llmError: 'forced_test',
                },
            });
            expect(result.state).toBe('error');
            expect(result.error).toContain('LLM extraction required');
        } finally {
            if (prev === undefined) {
                delete process.env.DOCUDENT_REQUIRE_LLM_PATH;
            } else {
                process.env.DOCUDENT_REQUIRE_LLM_PATH = prev;
            }
        }
    });
});
