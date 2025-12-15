/**
 * Comment Parser for HTML Knowledge Ingestion
 * 
 * Extracts structured CommentCard data from BEL/BEMA/GOZ HTML files.
 * Supports the Wissing Kommentar format (kommentar.bema-goz.de).
 */

import { createHash } from 'crypto';
import { JSDOM } from 'jsdom';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MAX_SNIPPET_LENGTH = 500;
const MAX_BULLET_LENGTH = 200;
const MAX_EVIDENCE_LENGTH = 200;
const MAX_BULLETS = 10;

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type CodeSystem = 'BEL' | 'BEMA' | 'GOZ' | 'UNKNOWN';

export type SectionKind =
    | 'definition'
    | 'billing'
    | 'limits'
    | 'plausibility'
    | 'materials'
    | 'notes'
    | 'unknown';

export type SoftRuleType =
    | 'requiresTogether'
    | 'maxCountHint'
    | 'compatHint'
    | 'contraHint';

export interface CommentSection {
    kind: SectionKind;
    heading?: string;
    snippet: string;
    bullets?: string[];
}

export interface SoftRule {
    type: SoftRuleType;
    severity: 'warn';
    payload: any;
    evidenceSnippet: string;
}

export interface CommentSource {
    provider: 'wissing-kommentar' | 'unknown';
    filePath: string;
    fileHash: string;
    importedAt: string;
}

export interface CommentCard {
    id: string;
    system: CodeSystem;
    code: string;
    title?: string;
    source: CommentSource;
    sections: CommentSection[];
    softRules?: SoftRule[];
    tags?: string[];
}

export interface ParseResult {
    success: boolean;
    card?: CommentCard;
    error?: string;
    warnings: string[];
}

// ═══════════════════════════════════════════════════════════════
// CODE DETECTION (Enhanced for BEMA HTML formats)
// ═══════════════════════════════════════════════════════════════

// BEL patterns
const BEL_PATTERN = /\b(?:BEL[-_\s]?)?(\d{3,4})(?:\s*0)?\b/i;
const BEL_EXPLICIT = /\bBEL[-_\s]?(\d{3,4})\b/i;
const BEL_LNR_PATTERN = /(\d{3})\s+0\b/; // "001 0" format

// GOZ patterns (require explicit GOZ marker for stricter matching)
const GOZ_PATTERN = /\bGOZ[-_\s]?(\d{4})\b/i;

// BEMA patterns - various formats from Wissing HTML
const BEMA_EXPLICIT = /\bBEMA[-_\s]?([\dÄ]{1,3}[a-d]?)\b/i;
const BEMA_NR_PATTERN = /\bBEMA-Nr\.?\s*([\dÄ]{1,3}[a-d]?)\b/i;
const BEMA_SPECIAL_CODES = /\b(Ä\s*\d+|IP\s*\d+|FU\s*\d+|FU\s*Pr|Ä\d+)\b/i;  // Ä 1, IP 1, FU1, FU Pr
const BEMA_TITLE_CODE = /^([\dÄ]{1,3}[a-d]?)\s+(?=[A-ZÄÖÜ])/m;  // "01 Eingehende", "13a Füllung"

interface CodeMatch {
    system: CodeSystem;
    code: string;
    raw: string;
}

export function normalizeCode(system: CodeSystem, rawCode: string): string {
    const cleaned = rawCode.replace(/\s+/g, '');
    switch (system) {
        case 'BEL':
            const belDigits = cleaned.replace(/\D/g, '');
            return `BEL_${belDigits.padStart(4, '0')}`;
        case 'GOZ':
            const gozDigits = cleaned.replace(/\D/g, '');
            return `GOZ_${gozDigits}`;
        case 'BEMA':
            // Handle special codes like Ä1, IP1, FU1
            if (/^Ä/i.test(cleaned)) {
                return `BEMA_Ä${cleaned.replace(/[^0-9]/g, '')}`;
            }
            if (/^IP/i.test(cleaned)) {
                return `BEMA_IP${cleaned.replace(/[^0-9]/g, '')}`;
            }
            if (/^FU/i.test(cleaned)) {
                const fuNum = cleaned.replace(/[^0-9Pp]/g, '');
                return `BEMA_FU${fuNum}`;
            }
            // Standard numeric codes
            return `BEMA_${cleaned}`;
        default:
            return cleaned;
    }
}

export function detectCode(text: string, systemHint?: CodeSystem): CodeMatch | null {
    // If in BEL context, try BEL patterns first
    if (systemHint === 'BEL' || /\bL-Nr\./i.test(text) || /\bBEL\b/i.test(text)) {
        // Try BEL "001 0" format first (L-Nr format)
        const belLnr = text.match(BEL_LNR_PATTERN);
        if (belLnr) {
            const code = belLnr[1] + '0';
            return { system: 'BEL', code: normalizeCode('BEL', code), raw: belLnr[0] };
        }

        const belExplicit = text.match(BEL_EXPLICIT);
        if (belExplicit) {
            return { system: 'BEL', code: normalizeCode('BEL', belExplicit[1]), raw: belExplicit[0] };
        }
    }

    // Try explicit GOZ pattern (requires "GOZ" marker)
    const gozMatch = text.match(GOZ_PATTERN);
    if (gozMatch) {
        return { system: 'GOZ', code: normalizeCode('GOZ', gozMatch[1]), raw: gozMatch[0] };
    }

    // Try BEMA patterns
    // 1. BEMA-Nr. explicit
    const bemaNr = text.match(BEMA_NR_PATTERN);
    if (bemaNr) {
        return { system: 'BEMA', code: normalizeCode('BEMA', bemaNr[1]), raw: bemaNr[0] };
    }

    // 2. BEMA explicit
    const bemaExplicit = text.match(BEMA_EXPLICIT);
    if (bemaExplicit) {
        return { system: 'BEMA', code: normalizeCode('BEMA', bemaExplicit[1]), raw: bemaExplicit[0] };
    }

    // 3. Special BEMA codes (Ä 1, IP 1, FU1)
    const bemaSpecial = text.match(BEMA_SPECIAL_CODES);
    if (bemaSpecial) {
        return { system: 'BEMA', code: normalizeCode('BEMA', bemaSpecial[1]), raw: bemaSpecial[0] };
    }

    // 4. If in BEMA context (systemHint), try title pattern
    if (systemHint === 'BEMA') {
        const bemaTitle = text.match(BEMA_TITLE_CODE);
        if (bemaTitle) {
            return { system: 'BEMA', code: normalizeCode('BEMA', bemaTitle[1]), raw: bemaTitle[0] };
        }
    }

    // For BEL context without L-Nr, try generic BEL pattern
    if (systemHint === 'BEL') {
        const belMatch = text.match(BEL_PATTERN);
        if (belMatch) {
            return { system: 'BEL', code: normalizeCode('BEL', belMatch[1]), raw: belMatch[0] };
        }
    }

    return null;
}

export function detectAllCodes(text: string): CodeMatch[] {
    const codes: CodeMatch[] = [];
    const seen = new Set<string>();

    const belMatches = text.matchAll(/(?:L-Nr\.?\s*)(\d{3,4})(?:\s*0)?/gi);
    for (const m of belMatches) {
        const code = normalizeCode('BEL', m[1]);
        if (!seen.has(code)) {
            seen.add(code);
            codes.push({ system: 'BEL', code, raw: m[0] });
        }
    }

    return codes;
}

// ═══════════════════════════════════════════════════════════════
// SECTION CLASSIFICATION
// ═══════════════════════════════════════════════════════════════

const SECTION_PATTERNS: Array<{ kind: SectionKind; patterns: RegExp[] }> = [
    { kind: 'definition', patterns: [/Leistungsinhalt/i, /Leistungsbeschreibung/i, /Definition/i] },
    { kind: 'materials', patterns: [/Material/i, /Sets?\b/i, /separat berechenbar/i, /Werkstoffe?/i, /Gips/i] },
    { kind: 'billing', patterns: [/Abrechnung/i, /abrechnungsfähig/i, /berechenbar/i, /Vergütung/i, /Honorar/i] },
    { kind: 'limits', patterns: [/je\s+(?:Zahn|Kiefer|Behandlung)/i, /\bmal\b.*\babrechenbar/i, /Mengenbegrenzung/i, /max(?:imal)?/i, /höchstens/i, /beschränkt/i] },
    { kind: 'plausibility', patterns: [/zusammen mit/i, /in Kombination/i, /nicht neben/i, /gemeinsam/i, /Kombination/i] },
    { kind: 'notes', patterns: [/Rundschreiben/i, /Kommentar/i, /Hinweis/i, /Anmerkung/i] },
];

export function classifySection(heading: string, text: string): SectionKind {
    const combined = `${heading} ${text}`.toLowerCase();
    for (const { kind, patterns } of SECTION_PATTERNS) {
        for (const pattern of patterns) {
            if (pattern.test(combined)) return kind;
        }
    }
    return 'unknown';
}

// ═══════════════════════════════════════════════════════════════
// SOFT RULE EXTRACTION
// ═══════════════════════════════════════════════════════════════

const SOFT_RULE_PATTERNS: Array<{ type: SoftRuleType; pattern: RegExp }> = [
    { type: 'requiresTogether', pattern: /zusammen mit|in Kombination mit|gemeinsam mit/i },
    { type: 'maxCountHint', pattern: /höchstens|maximal|max\.\s*\d+|bis zu \d+\s*mal/i },
    { type: 'compatHint', pattern: /zusätzlich abrechenbar|neben.*abrechnungsfähig/i },
    { type: 'contraHint', pattern: /nicht neben|nicht abrechnungsfähig|ausgeschlossen/i },
];

export function extractSoftRules(text: string): SoftRule[] {
    const rules: SoftRule[] = [];
    for (const { type, pattern } of SOFT_RULE_PATTERNS) {
        const match = text.match(pattern);
        if (match) {
            const start = Math.max(0, match.index! - 50);
            const end = Math.min(text.length, match.index! + match[0].length + 100);
            const snippet = text.slice(start, end).trim();
            rules.push({ type, severity: 'warn', payload: { match: match[0] }, evidenceSnippet: truncate(snippet, MAX_EVIDENCE_LENGTH) });
        }
    }
    return rules;
}

// ═══════════════════════════════════════════════════════════════
// TAG EXTRACTION
// ═══════════════════════════════════════════════════════════════

const TAG_PATTERNS: Array<{ tag: string; pattern: RegExp }> = [
    { tag: 'Mengenbegrenzung', pattern: /Mengenbegrenzung|höchstens|maximal/i },
    { tag: 'Kombination', pattern: /Kombination|zusammen mit/i },
    { tag: 'Material', pattern: /Material|Werkstoffe/i },
    { tag: 'KFO', pattern: /kieferorthopädisch|KFO/i },
    { tag: 'Prothese', pattern: /Prothese|Zahnersatz/i },
    { tag: 'Krone', pattern: /Krone|Brücke/i },
    { tag: 'Reparatur', pattern: /Reparatur|Wiederherstellung/i },
    { tag: 'Modell', pattern: /Modell/i },
];

export function extractTags(text: string): string[] {
    const tags: string[] = [];
    for (const { tag, pattern } of TAG_PATTERNS) {
        if (pattern.test(text)) tags.push(tag);
    }
    return [...new Set(tags)];
}

// ═══════════════════════════════════════════════════════════════
// HASHING
// ═══════════════════════════════════════════════════════════════

export function sha256(content: string): string {
    return createHash('sha256').update(content).digest('hex');
}

export function sha1(content: string): string {
    return createHash('sha1').update(content).digest('hex');
}

export function generateVariantHash(sections: CommentSection[]): string {
    const content = sections.map(s => `${s.snippet}${(s.bullets ?? []).join('|')}`).join('||');
    return sha1(content).slice(0, 12);
}

export function generateCardId(system: CodeSystem, code: string, variantHash: string): string {
    return `${system}:${code}:${variantHash}`;
}

// ═══════════════════════════════════════════════════════════════
// TEXT UTILITIES
// ═══════════════════════════════════════════════════════════════

export function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
}

export function cleanText(text: string): string {
    return text.replace(/\s+/g, ' ').replace(/[\n\r\t]+/g, ' ').trim();
}

// ═══════════════════════════════════════════════════════════════
// HTML PARSING (using jsdom)
// ═══════════════════════════════════════════════════════════════

export interface RawHtmlFile {
    filePath: string;
    content: string;
}

export function parseHtmlContent(
    rawContent: string,
    filePath: string,
    provider: 'wissing-kommentar' | 'unknown' = 'wissing-kommentar',
    systemHint?: CodeSystem
): ParseResult {
    const warnings: string[] = [];

    try {
        let htmlContent = rawContent;
        if (rawContent.trim().startsWith('{')) {
            try {
                const json = JSON.parse(rawContent);
                htmlContent = json.innerhtml || rawContent;
            } catch { /* Not JSON, use raw */ }
        }

        const dom = new JSDOM(htmlContent);
        const doc = dom.window.document;

        // Extract title
        let title = '';
        const titleEl = doc.querySelector('.xaver-titel');
        if (titleEl) title = cleanText(titleEl.textContent || '');
        else {
            const h1 = doc.querySelector('h1, h2');
            if (h1) title = cleanText(h1.textContent || '');
        }

        // Detect primary code (with systemHint for folder-aware detection)
        let codeMatch = detectCode(title, systemHint);
        if (!codeMatch) {
            const fullText = cleanText(doc.body?.textContent || '');
            codeMatch = detectCode(fullText, systemHint);
        }

        if (!codeMatch) {
            return { success: false, error: 'Could not detect code from content', warnings };
        }

        // Extract sections
        const sections: CommentSection[] = [];
        const processedTexts = new Set<string>();

        const headingEls = doc.querySelectorAll('.xaver-absatz-leist, .xaver-bel-kommentar');
        headingEls.forEach((el) => {
            const heading = cleanText(el.textContent || '');
            const kind = classifySection(heading, '');

            let snippetParts: string[] = [];
            let next = el.nextElementSibling;
            while (next && !next.classList.contains('xaver-absatz-leist') && !next.classList.contains('xaver-bel-kommentar')) {
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
                const fullText = snippetParts.join(' ');
                sections.push({ kind, heading: heading || undefined, snippet: truncate(fullText, MAX_SNIPPET_LENGTH) });
            }
        });

        const paragraphs = doc.querySelectorAll('.xaver-absatz');
        paragraphs.forEach((el) => {
            const text = cleanText(el.textContent || '');
            if (text && !processedTexts.has(text) && text.length > 20) {
                processedTexts.add(text);
                sections.push({ kind: classifySection('', text), snippet: truncate(text, MAX_SNIPPET_LENGTH) });
            }
        });

        const listItems = doc.querySelectorAll('ul li');
        listItems.forEach((el) => {
            const text = cleanText(el.textContent || '');
            if (text && text.length > 10 && sections.length > 0) {
                const lastSection = sections[sections.length - 1];
                if (!lastSection.bullets) lastSection.bullets = [];
                if (lastSection.bullets.length < MAX_BULLETS) {
                    lastSection.bullets.push(truncate(text, MAX_BULLET_LENGTH));
                }
            }
        });

        if (sections.length === 0) {
            const fullText = cleanText(doc.body?.textContent || '');
            if (fullText.length > 20) {
                sections.push({ kind: 'unknown', snippet: truncate(fullText, MAX_SNIPPET_LENGTH) });
            }
        }

        const fullText = cleanText(doc.body?.textContent || '');
        const softRules = extractSoftRules(fullText);
        const tags = extractTags(fullText);

        const fileHash = sha256(rawContent);
        const variantHash = generateVariantHash(sections);
        const cardId = generateCardId(codeMatch.system, codeMatch.code, variantHash);

        const card: CommentCard = {
            id: cardId,
            system: codeMatch.system,
            code: codeMatch.code,
            title: title || undefined,
            source: { provider, filePath, fileHash, importedAt: new Date().toISOString() },
            sections,
            softRules: softRules.length > 0 ? softRules : undefined,
            tags: tags.length > 0 ? tags : undefined,
        };

        return { success: true, card, warnings };
    } catch (err) {
        return { success: false, error: `Parse error: ${err instanceof Error ? err.message : String(err)}`, warnings };
    }
}
