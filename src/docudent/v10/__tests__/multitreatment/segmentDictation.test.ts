import { describe, expect, it } from 'vitest';
import { splitDictationIntoSegments } from '../../multitreatment/segmentDictation';

describe('splitDictationIntoSegments', () => {
    it('splits on ascii marker variants like zusaetzlich/anschliessend', () => {
        const segments = splitDictationIntoSegments(
            'Zahn 16 fuer Krone beschliffen, danach am selben Zahn Aufbau mit Komposit, zusaetzlich Extraktion Zahn 28, anschliessend Nahtversorgung.'
        );
        expect(segments).toEqual([
            'Zahn 16 fuer Krone beschliffen,',
            'am selben Zahn Aufbau mit Komposit,',
            'Extraktion Zahn 28,',
            'Nahtversorgung',
        ]);
    });

    it('splits on sentence boundaries for marker-poor fluent dictation', () => {
        const segments = splitDictationIntoSegments(
            'Krone 16 praepariert. Aufbau mit Komposit am selben Zahn. Extraktion 28 mit Naht.'
        );
        expect(segments).toEqual([
            'Krone 16 praepariert',
            'Aufbau mit Komposit am selben Zahn',
            'Extraktion 28 mit Naht',
        ]);
    });

    it('does not split decimal amounts on dot', () => {
        const segments = splitDictationIntoSegments(
            'Mehrkosten 120.50 Euro vereinbart; Fuellung 16 okklusal mit Komposit.'
        );
        expect(segments).toEqual([
            'Mehrkosten 120.50 Euro vereinbart',
            'Fuellung 16 okklusal mit Komposit',
        ]);
    });
});
