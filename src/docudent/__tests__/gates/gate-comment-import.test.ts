/**
 * Gate: Comment Import
 * 
 * Tests the HTML comment import parser for deterministic IDs,
 * snippet length caps, code detection, and deduplication.
 */

import { describe, it, expect } from 'vitest';
import {
    parseHtmlContent,
    detectCode,
    normalizeCode,
    classifySection,
    extractSoftRules,
    extractTags,
    generateVariantHash,
    generateCardId,
    truncate,
    type CommentCard,
    type CommentSection,
} from '../../core/billing/knowledgeBase/secondary/commentParser';

describe('GATE: Comment Import', () => {
    describe('Code Detection', () => {
        it('detects BEL codes with L-Nr format', () => {
            const result = detectCode('L-Nr. 001 0 Modell');
            expect(result).not.toBeNull();
            expect(result!.system).toBe('BEL');
            expect(result!.code).toBe('BEL_0010');
        });

        it('detects explicit BEL codes', () => {
            const result = detectCode('BEL 5100 Artikulator');
            expect(result).not.toBeNull();
            expect(result!.system).toBe('BEL');
            expect(result!.code).toBe('BEL_5100');
        });

        it('detects GOZ codes', () => {
            const result = detectCode('GOZ 2197 - Füllungstherapie');
            expect(result).not.toBeNull();
            expect(result!.system).toBe('GOZ');
            expect(result!.code).toBe('GOZ_2197');
        });

        it('detects BEMA codes', () => {
            const result = detectCode('BEMA 13a - konservierend');
            expect(result).not.toBeNull();
            expect(result!.system).toBe('BEMA');
            expect(result!.code).toBe('BEMA_13a');
        });

        it('returns null for unrecognized text', () => {
            const result = detectCode('Some random text without codes');
            expect(result).toBeNull();
        });
    });

    describe('Code Normalization', () => {
        it('normalizes BEL codes to 4 digits', () => {
            expect(normalizeCode('BEL', '10')).toBe('BEL_0010');
            expect(normalizeCode('BEL', '5100')).toBe('BEL_5100');
            expect(normalizeCode('BEL', '001 0')).toBe('BEL_0010');
        });

        it('normalizes GOZ codes', () => {
            expect(normalizeCode('GOZ', '2197')).toBe('GOZ_2197');
        });
    });

    describe('Section Classification', () => {
        it('classifies definition sections', () => {
            expect(classifySection('Leistungsinhalt', '')).toBe('definition');
            expect(classifySection('Leistungsbeschreibung', '')).toBe('definition');
        });

        it('classifies billing sections', () => {
            expect(classifySection('Erläuterungen zur Abrechnung', '')).toBe('billing');
            expect(classifySection('', 'ist abrechnungsfähig')).toBe('billing');
        });

        it('classifies limits sections', () => {
            expect(classifySection('', 'höchstens 2 mal abrechenbar')).toBe('limits');
            expect(classifySection('', 'je Zahn und Sitzung')).toBe('limits');
        });

        it('classifies plausibility sections', () => {
            expect(classifySection('', 'zusammen mit L-Nr. 002')).toBe('plausibility');
            expect(classifySection('', 'in Kombination abrechenbar')).toBe('plausibility');
        });

        it('classifies materials sections', () => {
            expect(classifySection('', 'Material separat berechenbar')).toBe('materials');
        });

        it('defaults to unknown', () => {
            expect(classifySection('', 'random text')).toBe('unknown');
        });
    });

    describe('Soft Rule Extraction', () => {
        it('extracts requiresTogether rules', () => {
            const rules = extractSoftRules('Diese Leistung ist zusammen mit 5100 abrechenbar');
            expect(rules.some(r => r.type === 'requiresTogether')).toBe(true);
        });

        it('extracts maxCountHint rules', () => {
            const rules = extractSoftRules('Höchstens 2 mal pro Kiefer abrechenbar');
            expect(rules.some(r => r.type === 'maxCountHint')).toBe(true);
        });

        it('extracts contraHint rules', () => {
            const rules = extractSoftRules('Nicht neben Leistung 5000 abrechenbar');
            expect(rules.some(r => r.type === 'contraHint')).toBe(true);
        });

        it('limits evidence snippet length', () => {
            const longText = 'x'.repeat(1000) + ' zusammen mit ' + 'y'.repeat(1000);
            const rules = extractSoftRules(longText);
            if (rules.length > 0) {
                expect(rules[0].evidenceSnippet.length).toBeLessThanOrEqual(200);
            }
        });
    });

    describe('Tag Extraction', () => {
        it('extracts relevant tags', () => {
            const tags = extractTags('Mengenbegrenzung: höchstens 2 mal bei Prothese');
            expect(tags).toContain('Mengenbegrenzung');
            expect(tags).toContain('Prothese');
        });

        it('deduplicates tags', () => {
            const tags = extractTags('Material Material Material');
            expect(tags.filter(t => t === 'Material').length).toBe(1);
        });
    });

    describe('Hashing & IDs', () => {
        it('generates deterministic variant hash', () => {
            const sections: CommentSection[] = [
                { kind: 'definition', snippet: 'Test snippet' },
            ];
            const hash1 = generateVariantHash(sections);
            const hash2 = generateVariantHash(sections);
            expect(hash1).toBe(hash2);
        });

        it('generates different hashes for different content', () => {
            const sections1: CommentSection[] = [{ kind: 'definition', snippet: 'AAA' }];
            const sections2: CommentSection[] = [{ kind: 'definition', snippet: 'BBB' }];
            expect(generateVariantHash(sections1)).not.toBe(generateVariantHash(sections2));
        });

        it('generates proper card ID format', () => {
            const id = generateCardId('BEL', 'BEL_0010', 'abc123');
            expect(id).toBe('BEL:BEL_0010:abc123');
        });
    });

    describe('Snippet Truncation', () => {
        it('truncates long text with ellipsis', () => {
            const long = 'x'.repeat(600);
            const result = truncate(long, 500);
            expect(result.length).toBe(500);
            expect(result.endsWith('...')).toBe(true);
        });

        it('does not truncate short text', () => {
            const short = 'Hello world';
            expect(truncate(short, 500)).toBe(short);
        });
    });

    describe('HTML Parsing', () => {
        const sampleJson = JSON.stringify({
            innerhtml: `
                <div class="xaver-titel">001 0 Modell</div>
                <div class="xaver-absatz-leist">Erläuterungen zum Leistungsinhalt</div>
                <div class="xaver-absatz">Modell aus Hartgips oder Superhartgips für verschiedene Anwendungen.</div>
                <div class="xaver-absatz-leist">Erläuterungen zur Abrechnung</div>
                <div class="xaver-absatz">Zusammen mit L-Nr. 002 1 abrechenbar. Maximal 4 mal pro Behandlung.</div>
            `,
        });

        it('extracts code from title', () => {
            const result = parseHtmlContent(sampleJson, 'test.html');
            expect(result.success).toBe(true);
            expect(result.card?.code).toBe('BEL_0010');
        });

        it('extracts sections with correct classification', () => {
            const result = parseHtmlContent(sampleJson, 'test.html');
            expect(result.success).toBe(true);
            expect(result.card?.sections.length).toBeGreaterThan(0);

            const billingSection = result.card?.sections.find(s => s.kind === 'billing');
            expect(billingSection).toBeDefined();
        });

        it('extracts soft rules', () => {
            const result = parseHtmlContent(sampleJson, 'test.html');
            expect(result.success).toBe(true);
            expect(result.card?.softRules).toBeDefined();
            expect(result.card!.softRules!.length).toBeGreaterThan(0);
        });

        it('generates deterministic ID for same content', () => {
            const result1 = parseHtmlContent(sampleJson, 'test.html');
            const result2 = parseHtmlContent(sampleJson, 'test.html');
            expect(result1.card?.id).toBe(result2.card?.id);
        });

        it('includes source metadata', () => {
            const result = parseHtmlContent(sampleJson, 'path/to/test.html', 'wissing-kommentar');
            expect(result.card?.source.filePath).toBe('path/to/test.html');
            expect(result.card?.source.provider).toBe('wissing-kommentar');
            expect(result.card?.source.fileHash).toBeDefined();
        });
    });

    describe('Deduplication', () => {
        it('identical content produces identical IDs', () => {
            const html1 = JSON.stringify({ innerhtml: '<div class="xaver-titel">BEL 5100</div><div class="xaver-absatz">Test content same</div>' });
            const html2 = JSON.stringify({ innerhtml: '<div class="xaver-titel">BEL 5100</div><div class="xaver-absatz">Test content same</div>' });

            const result1 = parseHtmlContent(html1, 'file1.html');
            const result2 = parseHtmlContent(html2, 'file2.html');

            expect(result1.card?.id).toBe(result2.card?.id);
        });

        it('different content produces different IDs', () => {
            const html1 = JSON.stringify({ innerhtml: '<div class="xaver-titel">BEL 5100</div><div class="xaver-absatz">Content version one with text</div>' });
            const html2 = JSON.stringify({ innerhtml: '<div class="xaver-titel">BEL 5100</div><div class="xaver-absatz">Content version two different</div>' });

            const result1 = parseHtmlContent(html1, 'file1.html');
            const result2 = parseHtmlContent(html2, 'file2.html');

            expect(result1.card?.id).not.toBe(result2.card?.id);
        });
    });
});
