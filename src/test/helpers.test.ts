import { describe, expect, it } from 'vitest';
import { getToothClass, detectMultiTooth } from '../engine/toothHelpers';

describe('tooth helper utilities', () => {
    it('classifies anterior vs posterior teeth', () => {
        expect(getToothClass('11')).toBe('anterior');
        expect(getToothClass('23')).toBe('anterior');
        expect(getToothClass('33')).toBe('anterior');
        expect(getToothClass('43')).toBe('anterior');
        expect(getToothClass('14')).toBe('posterior');
        expect(getToothClass('48')).toBe('posterior');
        expect(getToothClass('51')).toBeNull();
        expect(getToothClass('abc')).toBeNull();
    });

    it('detects multiple teeth inside free text', () => {
        expect(detectMultiTooth('Füllung an 16 und 17.')).toEqual(['16', '17']);
        expect(detectMultiTooth('Nur Zahn 21.')).toEqual(['21']);
        expect(detectMultiTooth('Keine Zähne hier.')).toEqual([]);
        expect(detectMultiTooth('Jahr 2023 ist kein Zahn.')).toEqual([]);
    });
});
