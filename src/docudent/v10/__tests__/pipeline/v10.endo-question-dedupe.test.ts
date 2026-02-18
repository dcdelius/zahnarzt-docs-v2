import { describe, expect, it } from 'vitest';
import { runV10 } from '../../pipeline/runV10';
import { normalizeAskbackId } from '../../procedure/normalizeAskbackId';

describe('Pipeline: endo question dedupe', () => {
    it('does not emit duplicate irrigation askbacks in endo flow', async () => {
        const result = await runV10({
            dictation: 'An Zahn 21 endodontisch eröffnet, Kanäle instrumentiert, Arbeitslängen elektronisch und radiologisch gesichert, warm obturiert und Verlauf kontrolliert.',
            treatmentId: 'endo',
            insuranceType: 'PKV',
            textLength: 'mittel',
        });

        expect(result.state).toBe('questions');
        if (result.state !== 'questions') return;

        const normalized = result.questions.map(q => normalizeAskbackId(q.questionKey ?? q.id ?? ''));
        const irrigationLike = normalized.filter(key => key.includes('irrigation') || key.includes('endo_t1_irrigation') || key.includes('endo_t2_irrigation'));
        expect(irrigationLike.length).toBeLessThanOrEqual(1);

        const labels = result.questions.map(q => (q.question ?? '').toLowerCase());
        expect(labels.filter(label => label.includes('spül') || label.includes('spuell')).length).toBeLessThanOrEqual(1);
    });
});
