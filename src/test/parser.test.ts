import { describe, it, expect } from 'vitest';
import { parseModelJson } from '../engine/extractStructuredData';

describe('parseModelJson', () => {
    it('should parse clean JSON', () => {
        const input = '{"foo": "bar"}';
        const result = parseModelJson(input);
        expect(result).toEqual({ foo: "bar" });
    });

    it('should parse JSON wrapped in markdown code blocks', () => {
        const input = '```json\n{"foo": "bar"}\n```';
        const result = parseModelJson(input);
        expect(result).toEqual({ foo: "bar" });
    });

    it('should parse JSON embedded in text', () => {
        const input = 'Here is the data: {"foo": "bar"} thanks.';
        const result = parseModelJson(input);
        expect(result).toEqual({ foo: "bar" });
    });

    it('should throw error for invalid JSON', () => {
        const input = 'This is not JSON';
        expect(() => parseModelJson(input)).toThrow("No JSON object found");
    });

    it('should throw error for malformed JSON candidate', () => {
        const input = 'Prefix { "foo": "bar" missing brace } Suffix';
        // It finds { ... } but fails to parse
        expect(() => parseModelJson(input)).toThrow("Failed to parse JSON");
    });
});
