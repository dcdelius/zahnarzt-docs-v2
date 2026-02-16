import { describe, expect, it } from 'vitest';
import { clampCanalCountToTooth, getMaxCanalCountForTooth } from '../../facts/endoToothAnatomy';
import { applyAnswersToFacts } from '../../facts/applyAnswersToFacts';

describe('endoToothAnatomy', () => {
    it('limits upper incisors to 1 canal', () => {
        expect(getMaxCanalCountForTooth('11')).toBe(1);
        expect(clampCanalCountToTooth('11', 3)).toBe(1);
    });

    it('allows molars up to 4 canals', () => {
        expect(getMaxCanalCountForTooth('46')).toBe(4);
        expect(clampCanalCountToTooth('46', 3)).toBe(3);
    });

    it('clamps endo canal askback values to tooth anatomy', () => {
        const next = applyAnswersToFacts(
            {
                treatmentId: 'endo',
                tooth: '11',
                surfaces: [],
                cariesDepth: 'unknown',
                capping: { performed: 'unknown' },
                counseling: { pulpitisRisk: 'unknown' },
                endo: {},
            } as any,
            new Map<string, unknown>([['endo_canal_count', 3]])
        );

        expect(next.endo?.canalCount).toBe(1);
    });
});
