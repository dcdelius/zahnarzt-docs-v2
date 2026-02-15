/**
 * Analog Parser V1
 * 
 * Parser for Analogleistungen HTML files.
 * Creates CommentCards with system = "ANALOG".
 * 
 * Features:
 * - Stable code extraction from attr_id (ID_Kons_Analog_04 → ANALOG_Kons_04)
 * - Breadcrumb extraction (analogChapter, title)
 * - §6 analog detection with analogHint
 * - Cross-reference extraction (GOZ, GOÄ, BEMA)
 * - Section classification
 * - Soft rule extraction
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { JSDOM } from 'jsdom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type AnalogSectionKind =
    | 'overview'
    | 'fee_determination'
    | 'commentary'
    | 'legal_reference'
    | 'example'
    | 'definition'
    | 'billing'
    | 'limits'
    | 'plausibility'
    | 'materials'
    | 'notes'
    | 'unknown';

export interface AnalogSection {
    kind: AnalogSectionKind;
    heading?: string;
    snippet: string;
}

export interface AnalogHint {
    allowed: boolean;
    paragraph: string;
    requiresComparison: boolean;
    referencedCodes: string[];
    evidenceSnippet: string;
}

export interface SoftRule {
    type: string;
    severity: 'warn' | 'error' | 'info';
    payload?: any;
    evidenceSnippet: string;
}

export interface CrossReference {
    system: string;
    code: string;
    context: string;
}

export interface AnalogCommentCard {
    id: string;
    system: 'ANALOG';
    code: string;
    title?: string;
    analogChapter?: string;
    source: {
        provider: 'wissing-kommentar';
        filePath: string;
        fileHash: string;
        importedAt: string;
    };
    sections: AnalogSection[];
    softRules?: SoftRule[];
    analogHint?: AnalogHint;
    crossReferences?: CrossReference[];
    tags?: string[];
}

export interface ParseResult {
    success: boolean;
    card?: AnalogCommentCard;
    error?: string;
    warnings: string[];
}

const MAX_SNIPPET_LENGTH = 500;

// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════

function sha1(text: string): string {
    return createHash('sha1').update(text).digest('hex');
}

function cleanText(text: string): string {
    return text.replace(/\s+/g, ' ').replace(/[\n\r\t]+/g, ' ').trim();
}

function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
}

// ═══════════════════════════════════════════════════════════════
// ANALOG CODE EXTRACTION
// ═══════════════════════════════════════════════════════════════

/**
 * Extract analog code from firstfragmentid or attr_id
 * Pattern: __lfg144__ID_Kons_Analog_04 → ANALOG_Kons_04
 *          __lfg144__ID_ZE_Analog_02 → ANALOG_ZE_02
 *          __lfg144__ID_FAL_Analog_09 → ANALOG_FAL_09
 */
function extractAnalogCode(rawId: string): string | null {
    // Decode URL encoding
    const decoded = decodeURIComponent(rawId);

    // Pattern 1: ID_{Chapter}_Analog_{num}
    const match1 = decoded.match(/__lfg\d+__ID_([A-Za-z]+)_Analog_(\d+)/);
    if (match1) {
        return `ANALOG_${match1[1]}_${match1[2].padStart(2, '0')}`;
    }

    // Pattern 2: Just ID_{something}
    const match2 = decoded.match(/__lfg\d+__ID_([A-Za-z_]+\d*)/);
    if (match2) {
        const cleanId = match2[1].replace(/_+$/, '');
        return `ANALOG_${cleanId}`;
    }

    // Pattern 3: node_id from filename
    const nodeMatch = rawId.match(/node_id[='](\d+)/);
    if (nodeMatch) {
        return `ANALOG_NODE_${nodeMatch[1]}`;
    }

    return null;
}

/**
 * Extract breadcrumb from topub array
 */
function extractBreadcrumb(topubData: any[]): { chapter: string; title: string } | null {
    if (!topubData || topubData.length < 3) return null;

    // Skip version entry (first item usually "Stand Dezember 2025...")
    // Skip "Analogleistungen" (second item)
    // Chapter is third item (e.g., "C. Konservierende Leistungen")
    // Title is last item

    const decoded = topubData.map(item => {
        const txt = item.txt || '';
        return decodeURIComponent(txt);
    });

    // Find chapter (starts with letter + ".")
    let chapter = '';
    let title = '';

    for (let i = 0; i < decoded.length; i++) {
        const txt = decoded[i];
        if (/^[A-Z]\.\s/.test(txt)) {
            chapter = txt;
        }
        // Last non-empty item is the title
        if (txt && !txt.includes('Stand') && !txt.includes('EL)') && txt !== 'Analogleistungen') {
            title = txt;
        }
    }

    if (title) {
        return { chapter, title };
    }

    return null;
}

// ═══════════════════════════════════════════════════════════════
// SECTION CLASSIFICATION
// ═══════════════════════════════════════════════════════════════

const SECTION_PATTERNS: Array<{ kind: AnalogSectionKind; patterns: RegExp[] }> = [
    { kind: 'fee_determination', patterns: [/Gebührenhöhe/i, /Bestimmung der Gebühr/i, /Punktwert/i, /Berechnung/i, /Steigerungsfaktor/i] },
    { kind: 'legal_reference', patterns: [/§\s*[56]/i, /Paragraph/i, /Abs\.\s*\d/i, /GOZ.*analog/i] },
    { kind: 'example', patterns: [/\bBeispiel/i, /\bz\.?\s*B\./i, /Muster/i] },
    { kind: 'definition', patterns: [/Leistungsinhalt/i, /Leistungsbeschreibung/i, /Definition/i, /Indikation/i] },
    { kind: 'materials', patterns: [/Material/i, /Werkstoffe?/i, /separat berechenbar/i] },
    { kind: 'billing', patterns: [/Abrechnung/i, /abrechnungsfähig/i, /berechenbar/i, /Vergütung/i] },
    { kind: 'limits', patterns: [/je\s+(?:Zahn|Kiefer|Sitzung)/i, /höchstens/i, /maximal/i] },
    { kind: 'plausibility', patterns: [/zusammen mit/i, /in Kombination/i, /nicht neben/i] },
    { kind: 'commentary', patterns: [/\bKommentar\b/i, /Erläuterung/i, /Hinweis/i] },
    { kind: 'overview', patterns: [/Schnellübersicht/i, /Übersicht/i] },
    { kind: 'notes', patterns: [/Rundschreiben/i, /Anmerkung/i] },
];

function classifySection(heading: string, content: string): AnalogSectionKind {
    const combined = `${heading} ${content}`;
    for (const { kind, patterns } of SECTION_PATTERNS) {
        for (const pattern of patterns) {
            if (pattern.test(combined)) {
                return kind;
            }
        }
    }
    return 'unknown';
}

// ═══════════════════════════════════════════════════════════════
// §6 ANALOG DETECTION
// ═══════════════════════════════════════════════════════════════

const ANALOG_PATTERNS = [
    /§\s*6\s*(?:Abs\.?\s*1)?.*GOZ/i,
    /analog(?:e)?\s+(?:zu\s+)?(?:berechnen|Berechnung|Bewertung)/i,
    /selbstständige.*zahnärztliche\s+Leistung/i,
    /nach\s+Art.*Kosten.*Zeitaufwand.*gleichwertig/i,
    /Analogleistung/i,
];

function detectAnalogHint(text: string): AnalogHint | null {
    for (const pattern of ANALOG_PATTERNS) {
        const match = text.match(pattern);
        if (match) {
            const startIdx = Math.max(0, match.index! - 50);
            const endIdx = Math.min(text.length, match.index! + match[0].length + 150);
            const context = text.slice(startIdx, endIdx);

            const referencedCodes: string[] = [];

            // Look for GOZ references
            const gozRefs = context.match(/GOZ[-_\s]?(\d{4})/gi);
            if (gozRefs) {
                referencedCodes.push(...gozRefs.map(r => `GOZ_${r.match(/\d{4}/)![0]}`));
            }

            return {
                allowed: true,
                paragraph: 'GOZ §6 Abs.1',
                requiresComparison: /gleichwertig|entsprechend|vergleichbar/i.test(context),
                referencedCodes: [...new Set(referencedCodes)].slice(0, 5),
                evidenceSnippet: truncate(cleanText(context), 200),
            };
        }
    }
    return null;
}

// ═══════════════════════════════════════════════════════════════
// CROSS-REFERENCE EXTRACTION
// ═══════════════════════════════════════════════════════════════

function extractCrossReferences(text: string): CrossReference[] {
    const refs: CrossReference[] = [];
    const seenCodes = new Set<string>();

    // GOZ references
    const gozRegex = /GOZ[-_\s]?(?:Nr\.?\s*)?(\d{4})/gi;
    let match;
    while ((match = gozRegex.exec(text)) !== null) {
        const code = `GOZ_${match[1]}`;
        if (!seenCodes.has(code)) {
            seenCodes.add(code);
            refs.push({
                system: 'GOZ',
                code,
                context: text.slice(Math.max(0, match.index - 20), match.index + match[0].length + 20).trim()
            });
        }
    }

    // GOÄ references
    const goaRegex = /GOÄ[-_\s]?(?:Nr\.?\s*)?(\d{1,4})/gi;
    while ((match = goaRegex.exec(text)) !== null) {
        const code = `GOAE_${match[1]}`;
        if (!seenCodes.has(code)) {
            seenCodes.add(code);
            refs.push({
                system: 'GOAE',
                code,
                context: text.slice(Math.max(0, match.index - 20), match.index + match[0].length + 20).trim()
            });
        }
    }

    // BEMA references
    const bemaRegex = /BEMA[-_\s]?(?:Nr\.?\s*)?(\d{1,3}[a-d]?)/gi;
    while ((match = bemaRegex.exec(text)) !== null) {
        const code = `BEMA_${match[1]}`;
        if (!seenCodes.has(code)) {
            seenCodes.add(code);
            refs.push({
                system: 'BEMA',
                code,
                context: text.slice(Math.max(0, match.index - 20), match.index + match[0].length + 20).trim()
            });
        }
    }

    return refs.slice(0, 20);
}

// ═══════════════════════════════════════════════════════════════
// SOFT RULE EXTRACTION
// ═══════════════════════════════════════════════════════════════

const SOFT_RULE_PATTERNS: Array<{
    type: string;
    severity: 'warn' | 'error' | 'info';
    patterns: RegExp[];
}> = [
        {
            type: 'contraHint', severity: 'error', patterns: [
                /nicht\s+(?:abrechnungsfähig|berechnungsfähig|berechenbar)/i,
                /nicht\s+neben/i,
                /ausgeschlossen/i,
            ]
        },
        {
            type: 'compatHint', severity: 'info', patterns: [
                /zusätzlich\s+(?:abrechnungsfähig|berechnungsfähig|berechenbar)/i,
                /neben.*abrechenbar/i,
            ]
        },
        {
            type: 'maxCountHint', severity: 'warn', patterns: [
                /je\s+(?:Kiefer|Kieferhälfte|Sitzung|Zahn)/i,
                /höchstens\s+\d+/i,
                /maximal\s+\d+/i,
            ]
        },
        {
            type: 'requiresHint', severity: 'info', patterns: [
                /nur\s+(?:bei|wenn|unter)/i,
                /Voraussetzung/i,
                /setzt\s+voraus/i,
            ]
        },
        {
            type: 'analogHint', severity: 'info', patterns: [
                /analog\s+(?:zu\s+)?berechnen/i,
                /§\s*6\s+Abs/i,
            ]
        },
    ];

function extractSoftRules(text: string): SoftRule[] {
    const rules: SoftRule[] = [];
    const seenTypes = new Set<string>();

    for (const { type, severity, patterns } of SOFT_RULE_PATTERNS) {
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match && !seenTypes.has(type)) {
                seenTypes.add(type);
                const startIdx = Math.max(0, match.index! - 30);
                const endIdx = Math.min(text.length, match.index! + match[0].length + 80);
                const evidence = text.slice(startIdx, endIdx);

                rules.push({
                    type,
                    severity,
                    payload: { match: match[0] },
                    evidenceSnippet: truncate(cleanText(evidence), 150),
                });
            }
        }
    }

    return rules;
}

// ═══════════════════════════════════════════════════════════════
// TAG EXTRACTION
// ═══════════════════════════════════════════════════════════════

const TAG_PATTERNS: Array<{ tag: string; pattern: RegExp }> = [
    { tag: 'Analog', pattern: /§\s*6|analog/i },
    { tag: 'Konservierend', pattern: /konservierend|Füllung|Karies/i },
    { tag: 'Prothetik', pattern: /Prothese|Zahnersatz|Krone|Brücke|Implantat/i },
    { tag: 'Chirurgie', pattern: /chirurg|Extraktion|Osteotomie/i },
    { tag: 'Parodontologie', pattern: /parodont|PAR|Tasche/i },
    { tag: 'Endodontie', pattern: /Wurzelkanal|Endo|Pulp/i },
    { tag: 'Funktionsanalyse', pattern: /Funktionsanalyse|FAL|Kiefergelenk|Okklusion/i },
    { tag: 'Prophylaxe', pattern: /Prophylaxe|PZR|Zahnreinigung/i },
    { tag: 'Material', pattern: /Material|Werkstoff/i },
];

function extractTags(text: string, chapter: string): string[] {
    const tags = new Set<string>();

    // Always add Analog tag for analog services
    tags.add('Analog');

    for (const { tag, pattern } of TAG_PATTERNS) {
        if (pattern.test(text) || pattern.test(chapter)) {
            tags.add(tag);
        }
    }
    return Array.from(tags).sort();
}

// ═══════════════════════════════════════════════════════════════
// MAIN PARSER
// ═══════════════════════════════════════════════════════════════

export function parseAnalogHtmlV1(rawContent: string, filePath: string): ParseResult {
    const warnings: string[] = [];

    try {
        // Parse JSON wrapper
        let htmlContent = rawContent;
        let topubData: any[] = [];
        let firstFragmentId = '';

        if (rawContent.trim().startsWith('{')) {
            try {
                const json = JSON.parse(rawContent);
                htmlContent = json.innerhtml || rawContent;
                topubData = json.topub || [];
                firstFragmentId = json.firstfragmentid || '';
            } catch { /* Not JSON */ }
        }

        // Extract code from firstfragmentid
        let code = extractAnalogCode(firstFragmentId);

        // Fallback: try to extract from filename
        if (!code) {
            const nodeMatch = filePath.match(/node_id[=']?(\d+)/);
            if (nodeMatch) {
                code = `ANALOG_NODE_${nodeMatch[1]}`;
            }
        }

        if (!code) {
            return { success: false, error: 'Could not extract analog code', warnings };
        }

        // Extract breadcrumb
        const breadcrumb = extractBreadcrumb(topubData);
        const title = breadcrumb?.title || '';
        const analogChapter = breadcrumb?.chapter || '';

        // Parse HTML
        const dom = new JSDOM(htmlContent);
        const doc = dom.window.document;
        const fullText = doc.body?.textContent || '';

        // Extract sections
        const sections: AnalogSection[] = [];
        const processedTexts = new Set<string>();

        // Find titled sections
        const titleEls = doc.querySelectorAll('.xaver-titel');
        titleEls.forEach((el) => {
            const heading = cleanText(el.textContent || '');

            let snippetParts: string[] = [];
            let next = el.nextElementSibling;
            while (next && !next.classList.contains('xaver-titel')) {
                if (next.classList.contains('xaver-absatz') || next.classList.contains('N101AD')) {
                    const text = cleanText(next.textContent || '');
                    if (text && !processedTexts.has(text) && text.length > 20) {
                        processedTexts.add(text);
                        snippetParts.push(text);
                    }
                }
                next = next.nextElementSibling;
            }

            if (snippetParts.length > 0) {
                const fullSnippet = snippetParts.join(' ');
                sections.push({
                    kind: classifySection(heading, fullSnippet),
                    heading: heading || undefined,
                    snippet: truncate(fullSnippet, MAX_SNIPPET_LENGTH),
                });
            }
        });

        // Extract remaining paragraphs
        const paragraphs = doc.querySelectorAll('.xaver-absatz, .N101AD');
        paragraphs.forEach((el) => {
            const text = cleanText(el.textContent || '');
            if (text && !processedTexts.has(text) && text.length > 30) {
                processedTexts.add(text);
                sections.push({
                    kind: classifySection('', text),
                    snippet: truncate(text, MAX_SNIPPET_LENGTH),
                });
            }
        });

        // Fallback: create section from full text
        if (sections.length === 0 && fullText.length > 50) {
            sections.push({
                kind: 'commentary',
                snippet: truncate(cleanText(fullText), MAX_SNIPPET_LENGTH),
            });
        }

        // Extract soft rules
        const softRules = extractSoftRules(fullText);

        // Detect analog hint
        const analogHint = detectAnalogHint(fullText);

        // Extract cross-references
        const crossReferences = extractCrossReferences(fullText);

        // Extract tags
        const tags = extractTags(fullText, analogChapter);

        // Generate file hash
        const fileHash = sha1(rawContent).slice(0, 12);

        // Generate content hash for deduplication (exclude timestamps)
        const contentHash = sha1(code + sections.map(s => s.snippet).join('||')).slice(0, 12);

        // Generate card ID
        const cardId = `ANALOG:${code}:${contentHash}`;

        const card: AnalogCommentCard = {
            id: cardId,
            system: 'ANALOG',
            code,
            title: title || undefined,
            analogChapter: analogChapter || undefined,
            source: {
                provider: 'wissing-kommentar',
                filePath,
                fileHash,
                importedAt: new Date().toISOString(),
            },
            sections,
            softRules: softRules.length > 0 ? softRules : undefined,
            analogHint: analogHint || undefined,
            crossReferences: crossReferences.length > 0 ? crossReferences : undefined,
            tags: tags.length > 0 ? tags : undefined,
        };

        return { success: true, card, warnings };

    } catch (err) {
        return { success: false, error: `Parse error: ${err}`, warnings };
    }
}

// ═══════════════════════════════════════════════════════════════
// SKIP DETECTION
// ═══════════════════════════════════════════════════════════════

export function isIndexOrLoginPage(filePath: string, content: string): { skip: boolean; reason: string } {
    // Check filename patterns
    if (/start\.xav.*fromLogin/i.test(filePath)) {
        return { skip: true, reason: 'Login/start page' };
    }
    if (/hlf=xaver\.component\.Hitlist/i.test(filePath)) {
        return { skip: true, reason: 'Search/hitlist page' };
    }
    if (/mode=multi/i.test(filePath)) {
        return { skip: true, reason: 'Multi-choice page' };
    }
    if (/#uebersicht/i.test(filePath)) {
        return { skip: true, reason: 'Overview page' };
    }
    if (/#ltext/i.test(filePath)) {
        return { skip: true, reason: 'List text page' };
    }
    if (/target=.*bema_\d+/i.test(filePath)) {
        return { skip: true, reason: 'BEMA link page' };
    }

    // Check for duplicate copies
    if (/\(\d+\)\.html$/i.test(filePath)) {
        return { skip: true, reason: 'Duplicate copy' };
    }

    return { skip: false, reason: '' };
}
