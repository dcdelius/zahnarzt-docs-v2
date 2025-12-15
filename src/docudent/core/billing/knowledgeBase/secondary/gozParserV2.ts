/**
 * GOZ Parser V2
 * 
 * Enhanced GOZ HTML parser with:
 * - GOZ-specific section classification (overview, fee_determination, delta_88, commentary, legal_reference, example)
 * - §6 Analog detection and analogHint extraction
 * - Enhanced soft rule extraction (frequencyHint, requiresHint)
 * - Cross-reference detection (BEMA, BEL, GOÄ)
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { JSDOM } from 'jsdom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ═══════════════════════════════════════════════════════════════
// TYPES (Extended for GOZ v2)
// ═══════════════════════════════════════════════════════════════

export type CodeSystem = 'BEL' | 'BEMA' | 'GOZ' | 'GOÄ' | 'UNKNOWN';

// Extended section kinds for GOZ
export type GozSectionKind =
    | 'overview'           // Schnellübersicht
    | 'fee_determination'  // Bestimmung der Gebührenhöhe
    | 'delta_88'           // Unterschiede zur GOZ '88
    | 'commentary'         // Kommentar
    | 'legal_reference'    // §5, §6 references
    | 'example'            // Beispiele
    | 'definition'         // Leistungsinhalt
    | 'billing'            // Abrechnung
    | 'limits'             // Mengenbegrenzung
    | 'plausibility'       // Kombination
    | 'materials'          // Material
    | 'notes'              // Hinweise
    | 'unknown';

export type SoftRuleType =
    | 'requiresTogether'
    | 'maxCountHint'
    | 'frequencyHint'
    | 'compatHint'
    | 'contraHint'
    | 'analogHint'
    | 'requiresHint';

export interface AnalogHint {
    allowed: boolean;
    paragraph: string;
    requiresComparison: boolean;
    referencedCodes: string[];
    evidenceSnippet: string;
}

export interface GozSection {
    kind: GozSectionKind;
    heading?: string;
    snippet: string;
    bullets?: string[];
    subSections?: {
        label: string;
        content: string;
    }[];
}

export interface SoftRule {
    type: SoftRuleType;
    severity: 'warn' | 'error' | 'info';
    payload?: any;
    evidenceSnippet: string;
}

export interface CrossReference {
    system: CodeSystem;
    code: string;
    context: string;
}

export interface GozCommentCard {
    id: string;
    system: 'GOZ';
    code: string;
    title?: string;
    source: {
        provider: 'wissing-kommentar';
        filePath: string;
        fileHash: string;
        importedAt: string;
    };
    sections: GozSection[];
    softRules?: SoftRule[];
    analogHint?: AnalogHint;
    crossReferences?: CrossReference[];
    tags?: string[];
}

export interface ParseResult {
    success: boolean;
    card?: GozCommentCard;
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
// GOZ CODE DETECTION
// ═══════════════════════════════════════════════════════════════

// GOZ codes: 0010, 0080, 2012, etc. (4 digits)
const GOZ_CODE_PATTERN = /\b(0[0-9]{3}|[1-9][0-9]{3})\b/;
const GOZ_EXPLICIT_PATTERN = /\bGOZ[-_\s]?(0[0-9]{3}|[1-9][0-9]{3})\b/i;
const GOZ_NR_PATTERN = /\bNr\.?\s*(0[0-9]{3}|[1-9][0-9]{3})\b/i;

// Cross-reference patterns
const BEMA_REF_PATTERN = /\bBEMA[-_\s]?(?:Nr\.?\s*)?(\d{1,3}[a-d]?)\b/gi;
const BEL_REF_PATTERN = /\bBEL[-_\s]?(\d{3,4})\b/gi;
const GOA_REF_PATTERN = /\bGOÄ[-_\s]?(?:Nr\.?\s*)?(\d{1,4})\b/gi;

interface CodeMatch {
    system: CodeSystem;
    code: string;
    raw: string;
}

// Exclude years and version numbers
const YEAR_PATTERN = /^20[0-2][0-9]$/;
const VERSION_EXCLUDE = /Stand|EL\)|Dezember|Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November/i;

function detectGozCode(text: string, skipYears: boolean = true): CodeMatch | null {
    // Try explicit GOZ pattern first
    const explicit = text.match(GOZ_EXPLICIT_PATTERN);
    if (explicit) {
        const code = explicit[1];
        if (!skipYears || !YEAR_PATTERN.test(code)) {
            return { system: 'GOZ', code: `GOZ_${code}`, raw: explicit[0] };
        }
    }

    // Try Nr. pattern
    const nrMatch = text.match(GOZ_NR_PATTERN);
    if (nrMatch) {
        const code = nrMatch[1];
        if (!skipYears || !YEAR_PATTERN.test(code)) {
            return { system: 'GOZ', code: `GOZ_${code}`, raw: nrMatch[0] };
        }
    }

    // Try bare code at start of string (for topub entries like "0010 Eingehende" or "2010 Präparieren")
    // Capture 4-digit codes, but exclude years (198x, 199x, 200x, 201x, 202x)
    const topubMatch = text.match(/^(\d{4})(?:\s|%20)/);
    if (topubMatch) {
        const code = topubMatch[1];
        // Exclude years and version numbers
        if (!YEAR_PATTERN.test(code) && !code.startsWith('198') && !code.startsWith('199') && !code.startsWith('200')) {
            return { system: 'GOZ', code: `GOZ_${code}`, raw: topubMatch[0] };
        }
    }

    return null;
}

function extractCrossReferences(text: string): CrossReference[] {
    const refs: CrossReference[] = [];
    const seenCodes = new Set<string>();

    // BEMA references
    let match;
    const bemaRegex = new RegExp(BEMA_REF_PATTERN.source, 'gi');
    while ((match = bemaRegex.exec(text)) !== null) {
        const code = `BEMA_${match[1]}`;
        if (!seenCodes.has(code)) {
            seenCodes.add(code);
            refs.push({
                system: 'BEMA',
                code,
                context: text.slice(Math.max(0, match.index - 30), match.index + match[0].length + 30).trim()
            });
        }
    }

    // BEL references
    const belRegex = new RegExp(BEL_REF_PATTERN.source, 'gi');
    while ((match = belRegex.exec(text)) !== null) {
        const code = `BEL_${match[1].padStart(4, '0')}`;
        if (!seenCodes.has(code)) {
            seenCodes.add(code);
            refs.push({
                system: 'BEL',
                code,
                context: text.slice(Math.max(0, match.index - 30), match.index + match[0].length + 30).trim()
            });
        }
    }

    // GOÄ references
    const goaRegex = new RegExp(GOA_REF_PATTERN.source, 'gi');
    while ((match = goaRegex.exec(text)) !== null) {
        const code = `GOÄ_${match[1]}`;
        if (!seenCodes.has(code)) {
            seenCodes.add(code);
            refs.push({
                system: 'GOÄ',
                code,
                context: text.slice(Math.max(0, match.index - 30), match.index + match[0].length + 30).trim()
            });
        }
    }

    return refs.slice(0, 20); // Limit to 20 cross-refs
}

// ═══════════════════════════════════════════════════════════════
// GOZ SECTION CLASSIFICATION
// ═══════════════════════════════════════════════════════════════

const GOZ_SECTION_PATTERNS: Array<{ kind: GozSectionKind; patterns: RegExp[] }> = [
    { kind: 'overview', patterns: [/Schnellübersicht/i, /schnell[üu]bersicht/i] },
    { kind: 'fee_determination', patterns: [/Gebührenhöhe/i, /Bestimmung der Gebühr/i, /Punktwert/i, /Steigerungsfaktor/i] },
    { kind: 'delta_88', patterns: [/GOZ\s*['']?\s*88/i, /Unterschied.*GOZ/i, /Änderung.*1988/i] },
    { kind: 'commentary', patterns: [/\bKommentar\b/i, /Erläuterung/i] },
    { kind: 'legal_reference', patterns: [/§\s*[56]/i, /Paragraph\s*[56]/i, /Abs\.\s*\d/i] },
    { kind: 'example', patterns: [/\bBeispiel/i, /\bz\.?\s*B\./i, /Muster/i] },
    { kind: 'definition', patterns: [/Leistungsinhalt/i, /Leistungsbeschreibung/i, /Definition/i] },
    { kind: 'materials', patterns: [/Material/i, /Werkstoffe?/i, /separat berechenbar/i] },
    { kind: 'billing', patterns: [/Abrechnung/i, /abrechnungsfähig/i, /berechenbar/i, /Vergütung/i] },
    { kind: 'limits', patterns: [/je\s+(?:Zahn|Kiefer|Sitzung)/i, /\bmal\b.*\babrechenbar/i, /höchstens/i, /maximal/i] },
    { kind: 'plausibility', patterns: [/zusammen mit/i, /in Kombination/i, /nicht neben/i, /gemeinsam/i] },
    { kind: 'notes', patterns: [/Rundschreiben/i, /Hinweis/i, /Anmerkung/i] },
];

function classifyGozSection(heading: string, content: string): GozSectionKind {
    const combined = `${heading} ${content}`;
    for (const { kind, patterns } of GOZ_SECTION_PATTERNS) {
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
    /§\s*6\s*(?:Abs\.?\s*1)?.*(?:GOZ|analog)/i,
    /analog(?:e)?\s+(?:Anwendung|Berechnung|Bewertung)/i,
    /entsprechend.*§\s*6/i,
    /nach\s+§\s*6\s+GOZ/i,
    /selbständige\s+(?:zahnärztliche\s+)?Leistung/i,
];

function detectAnalogHint(text: string): AnalogHint | null {
    for (const pattern of ANALOG_PATTERNS) {
        const match = text.match(pattern);
        if (match) {
            // Extract referenced codes from surrounding text
            const startIdx = Math.max(0, match.index! - 100);
            const endIdx = Math.min(text.length, match.index! + match[0].length + 200);
            const context = text.slice(startIdx, endIdx);

            const referencedCodes: string[] = [];

            // Look for GOZ references
            const gozRefs = context.match(/GOZ[-_\s]?(\d{4})/gi);
            if (gozRefs) {
                referencedCodes.push(...gozRefs.map(r => `GOZ_${r.match(/\d{4}/)![0]}`));
            }

            // Look for GOÄ references
            const goaRefs = context.match(/GOÄ[-_\s]?(\d{1,4})/gi);
            if (goaRefs) {
                referencedCodes.push(...goaRefs.map(r => `GOÄ_${r.match(/\d+/)![0]}`));
            }

            return {
                allowed: true,
                paragraph: 'GOZ §6 Abs.1',
                requiresComparison: /vergleichbar|entsprechend|ähnlich/i.test(context),
                referencedCodes: [...new Set(referencedCodes)].slice(0, 5),
                evidenceSnippet: truncate(cleanText(context), 200),
            };
        }
    }
    return null;
}

// ═══════════════════════════════════════════════════════════════
// SOFT RULE EXTRACTION (Enhanced for GOZ)
// ═══════════════════════════════════════════════════════════════

const SOFT_RULE_PATTERNS: Array<{
    type: SoftRuleType;
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
                /daneben.*berechnet/i,
            ]
        },
        {
            type: 'maxCountHint', severity: 'warn', patterns: [
                /je\s+(?:Kiefer|Kieferhälfte|Sitzung|Behandlung|Zahn)/i,
                /höchstens\s+\d+/i,
                /maximal\s+\d+/i,
                /pro\s+(?:Kiefer|Sitzung|Zahn)/i,
            ]
        },
        {
            type: 'frequencyHint', severity: 'warn', patterns: [
                /nur\s+einmal/i,
                /nicht\s+mehrfach/i,
                /einmalig/i,
                /innerhalb\s+von\s+\d+/i,
                /frühestens\s+nach/i,
            ]
        },
        {
            type: 'requiresHint', severity: 'info', patterns: [
                /nur\s+(?:bei|wenn|unter)/i,
                /Voraussetzung/i,
                /setzt\s+voraus/i,
                /bedarf.*(?:Begründung|Nachweis)/i,
            ]
        },
        {
            type: 'requiresTogether', severity: 'info', patterns: [
                /zusammen\s+mit/i,
                /in\s+Verbindung\s+mit/i,
                /erfordert.*zusätzlich/i,
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
                const startIdx = Math.max(0, match.index! - 50);
                const endIdx = Math.min(text.length, match.index! + match[0].length + 100);
                const evidence = text.slice(startIdx, endIdx);

                rules.push({
                    type,
                    severity,
                    payload: { match: match[0] },
                    evidenceSnippet: truncate(cleanText(evidence), 200),
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
    { tag: 'Mengenbegrenzung', pattern: /höchstens|maximal|je\s+(?:Kiefer|Sitzung|Zahn)/i },
    { tag: 'Kombination', pattern: /zusammen mit|nicht neben|in Kombination/i },
    { tag: 'Material', pattern: /Material|Werkstoff|Auslagen/i },
    { tag: 'Analog', pattern: /§\s*6|analog/i },
    { tag: 'Steigerung', pattern: /Steigerungsfaktor|Faktor\s*\d/i },
    { tag: 'Prophylaxe', pattern: /Prophylaxe|PZR|Zahnreinigung/i },
    { tag: 'KFO', pattern: /kieferorthopäd|KFO/i },
    { tag: 'Prothetik', pattern: /Prothese|Zahnersatz|Krone|Brücke/i },
    { tag: 'Chirurgie', pattern: /chirurg|Extraktion|Osteotomie/i },
    { tag: 'Parodontologie', pattern: /parodont|PAR|Tasche/i },
    { tag: 'Endodontie', pattern: /Wurzelkanal|Endo|Pulp/i },
    { tag: 'Implantologie', pattern: /Implantat/i },
];

function extractTags(text: string): string[] {
    const tags = new Set<string>();
    for (const { tag, pattern } of TAG_PATTERNS) {
        if (pattern.test(text)) {
            tags.add(tag);
        }
    }
    return Array.from(tags).sort();
}

// ═══════════════════════════════════════════════════════════════
// MAIN PARSER
// ═══════════════════════════════════════════════════════════════

export function parseGozHtmlV2(rawContent: string, filePath: string): ParseResult {
    const warnings: string[] = [];

    try {
        // Parse JSON wrapper if present
        let htmlContent = rawContent;
        let topubData: any[] = [];

        if (rawContent.trim().startsWith('{')) {
            try {
                const json = JSON.parse(rawContent);
                htmlContent = json.innerhtml || rawContent;
                topubData = json.topub || [];
            } catch { /* Not JSON, use raw */ }
        }

        // Extract code from topub (most reliable for GOZ)
        // Look for entries where decoded text starts with 4-digit code like "0010" or "2010"
        let codeMatch: CodeMatch | null = null;
        for (const item of topubData) {
            if (item.txt) {
                const decodedTxt = decodeURIComponent(item.txt);

                // Skip version/date entries
                if (VERSION_EXCLUDE.test(decodedTxt)) continue;
                if (/^Stand\s/i.test(decodedTxt)) continue;
                if (/^\d+\s*EL\)/i.test(decodedTxt)) continue;
                if (/^Gebührennummern$/i.test(decodedTxt)) continue;
                if (/^GOZ$/i.test(decodedTxt)) continue;
                if (/^[A-Z]\.\s/i.test(decodedTxt)) continue; // Section headers like "A. Allgemeine"

                const match = detectGozCode(decodedTxt);
                if (match) {
                    codeMatch = match;
                    break;
                }
            }
        }

        // Fall back to HTML content
        const dom = new JSDOM(htmlContent);
        const doc = dom.window.document;

        // Extract title
        let title = '';
        const titleEl = doc.querySelector('.xaver-titel');
        if (titleEl) {
            title = cleanText(titleEl.textContent || '');
        } else {
            const h1 = doc.querySelector('h1, h2');
            if (h1) title = cleanText(h1.textContent || '');
        }

        // Detect code from title if not found
        if (!codeMatch) {
            codeMatch = detectGozCode(title);
        }

        // Try full text as last resort
        if (!codeMatch) {
            const fullText = cleanText(doc.body?.textContent || '');
            codeMatch = detectGozCode(fullText.slice(0, 500)); // Only first 500 chars
        }

        if (!codeMatch) {
            return { success: false, error: 'Could not detect GOZ code from content', warnings };
        }

        // Get full text for analysis
        const fullText = doc.body?.textContent || '';

        // Extract sections
        const sections: GozSection[] = [];
        const processedTexts = new Set<string>();

        // Process structured sections
        const headingEls = doc.querySelectorAll('.xaver-absatz-leist, .xaver-bel-kommentar, .xaver-ueberschrift');
        headingEls.forEach((el) => {
            const heading = cleanText(el.textContent || '');
            const kind = classifyGozSection(heading, '');

            let snippetParts: string[] = [];
            let next = el.nextElementSibling;
            while (next && !next.classList.contains('xaver-absatz-leist') &&
                !next.classList.contains('xaver-bel-kommentar') &&
                !next.classList.contains('xaver-ueberschrift')) {
                if (next.classList.contains('xaver-absatz')) {
                    const text = cleanText(next.textContent || '');
                    if (text && !processedTexts.has(text)) {
                        processedTexts.add(text);
                        snippetParts.push(text);
                    }
                }
                next = next.nextElementSibling;
            }

            if (snippetParts.length > 0) {
                const fullSnippet = snippetParts.join(' ');
                sections.push({
                    kind,
                    heading: heading || undefined,
                    snippet: truncate(fullSnippet, MAX_SNIPPET_LENGTH),
                });
            }
        });

        // Extract remaining paragraphs
        const paragraphs = doc.querySelectorAll('.xaver-absatz');
        paragraphs.forEach((el) => {
            const text = cleanText(el.textContent || '');
            if (text && !processedTexts.has(text) && text.length > 30) {
                processedTexts.add(text);
                const kind = classifyGozSection('', text);
                sections.push({
                    kind,
                    snippet: truncate(text, MAX_SNIPPET_LENGTH),
                });
            }
        });

        // If no structured sections, create one from full text
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
        const tags = extractTags(fullText);

        // Generate file hash
        const fileHash = sha1(rawContent).slice(0, 12);

        // Generate variant hash for deduplication
        const contentHash = sha1(sections.map(s => s.snippet).join('||')).slice(0, 12);

        // Generate card ID
        const cardId = `GOZ:${codeMatch.code}:${contentHash}`;

        const card: GozCommentCard = {
            id: cardId,
            system: 'GOZ',
            code: codeMatch.code,
            title: title || undefined,
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
// SKIP INDEX DETECTION
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
    if (/EBM-IDaenderung/i.test(filePath)) {
        return { skip: true, reason: 'EBM change notice' };
    }

    // Check content (only if content is small)
    if (content.length < 1000) {
        if (/Inhaltsverzeichnis|Navigation|Übersicht aller/i.test(content)) {
            return { skip: true, reason: 'Index/navigation page' };
        }
    }

    return { skip: false, reason: '' };
}
