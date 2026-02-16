import { describe, expect, it } from 'vitest';
import { runV10Bundle } from '../../pipeline/runV10Bundle';

describe('runV10Bundle provenance meta', () => {
    it('always emits provenance envelope on non-error bundle results', async () => {
        const result = await runV10Bundle({
            dictation: 'Fuellung Zahn 36 okklusal mit Komposit unter Kofferdam.',
            segments: [
                {
                    segmentId: 'seg-1',
                    treatmentId: 'fuellung',
                    insuranceType: 'GKV',
                    textLength: 'mittel',
                    dictation: 'Fuellung Zahn 36 okklusal mit Komposit unter Kofferdam.',
                    instances: [{ instanceId: 'inst-36', tooth: '36' }],
                },
            ],
        });

        expect(result.state).not.toBe('error');
        expect(result.meta.provenance).toBeDefined();
        expect(Array.isArray(result.meta.provenance?.factSources)).toBe(true);
        if (result.state === 'output') {
            for (const code of result.output.billingCodes) {
                expect(code.instanceId).toBeTruthy();
            }
        }
    });

    it('keeps provenance deterministic and exposes chip lineage on output bundles', async () => {
        const input = {
            dictation: 'Fuellung Zahn 36 okklusal mit Komposit unter Kofferdam.',
            segments: [
                {
                    segmentId: 'seg-1',
                    treatmentId: 'fuellung' as const,
                    insuranceType: 'GKV' as const,
                    textLength: 'mittel' as const,
                    dictation: 'Fuellung Zahn 36 okklusal mit Komposit unter Kofferdam.',
                    instances: [{ instanceId: 'inst-36', tooth: '36' }],
                },
            ],
        };

        const first = await runV10Bundle(input, { autoAnswerAllQuestions: true });
        const second = await runV10Bundle(input, { autoAnswerAllQuestions: true });

        expect(first.state).toBe('output');
        expect(second.state).toBe('output');

        const firstProvenance = JSON.stringify(first.meta.provenance ?? {});
        const secondProvenance = JSON.stringify(second.meta.provenance ?? {});
        expect(firstProvenance).toBe(secondProvenance);

        expect((first.meta.provenance?.chips ?? []).length).toBeGreaterThan(0);
    });

    it('propagates extraction diagnostics into bundle meta', async () => {
        const result = await runV10Bundle({
            dictation: 'Fuellung Zahn 36 okklusal mit Komposit unter Kofferdam.',
            segments: [
                {
                    segmentId: 'seg-1',
                    treatmentId: 'fuellung',
                    insuranceType: 'GKV',
                    textLength: 'mittel',
                    dictation: 'Fuellung Zahn 36 okklusal mit Komposit unter Kofferdam.',
                    instances: [{ instanceId: 'inst-36', tooth: '36' }],
                },
            ],
        }, { autoAnswerAllQuestions: true });

        expect(result.state).toBe('output');
        expect(result.meta.extractorEngine).toBeDefined();
        expect(result.meta.traceLines?.some(line => line.startsWith('extract_detail:'))).toBe(true);
    });
});
