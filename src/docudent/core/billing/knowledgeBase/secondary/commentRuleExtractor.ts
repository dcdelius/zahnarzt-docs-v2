/**
 * Comment Rule Extractor
 * 
 * Extracts structured rules from CommentCards and generates comment_rules_v1.json.
 * Deterministic output with stable IDs and ordering.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import {
    loadAllCards,
    type CommentCard,
    type CodeSystem,
    type SoftRule,
} from './commentCardStore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type ConditionType =
    | 'compat'           // Can be used together
    | 'contra'           // Cannot be used together
    | 'maxCount'         // Maximum count limit
    | 'frequency'        // Time-based frequency limit
    | 'scope'            // Scope restriction (per jaw, per tooth, etc.)
    | 'requires'         // Requires another code
    | 'material'         // Material-related rule
    | 'analogJustification'  // Requires §6 analog justification
    | 'unknown';

export interface CommentRule {
    ruleId: string;
    system: CodeSystem;
    codePattern: string;
    severity: 'warn' | 'error' | 'info';
    conditionType: ConditionType;
    payload: {
        matchText?: string;
        relatedCodes?: string[];
        maxCount?: number;
        scope?: string;
        timeframe?: string;
    };
    evidenceSnippet: string;
    sourceCardId: string;
    tags: string[];
}

export interface CommentRulesFile {
    meta: {
        version: string;
        generatedAt: string;
        totalRules: number;
        bySystem: Record<string, number>;
        byConditionType: Record<ConditionType, number>;
    };
    rules: CommentRule[];
}

// ═══════════════════════════════════════════════════════════════
// CONDITION TYPE MAPPING
// ═══════════════════════════════════════════════════════════════

function mapSoftRuleType(type: string): ConditionType {
    switch (type) {
        case 'requiresTogether':
            return 'requires';
        case 'maxCountHint':
            return 'maxCount';
        case 'compatHint':
            return 'compat';
        case 'contraHint':
            return 'contra';
        case 'analogHint':
            return 'analogJustification';
        case 'requiresHint':
            return 'requires';
        case 'frequencyHint':
            return 'frequency';
        default:
            return 'unknown';
    }
}

// ═══════════════════════════════════════════════════════════════
// RULE ID GENERATION (Deterministic)
// ═══════════════════════════════════════════════════════════════

function generateRuleId(card: CommentCard, rule: SoftRule, index: number): string {
    const input = `${card.code}|${rule.type}|${index}|${rule.evidenceSnippet.slice(0, 50)}`;
    const hash = createHash('sha1').update(input).digest('hex').slice(0, 8);
    return `CR_${card.system}_${hash}`;
}

// ═══════════════════════════════════════════════════════════════
// PAYLOAD EXTRACTION
// ═══════════════════════════════════════════════════════════════

function extractPayload(rule: SoftRule, evidence: string): CommentRule['payload'] {
    const payload: CommentRule['payload'] = {};

    // Extract match text from payload
    if (rule.payload?.match) {
        payload.matchText = rule.payload.match;
    }

    // Try to extract numeric limits
    const countMatch = evidence.match(/(?:höchstens|maximal|max\.?)\s*(\d+)/i);
    if (countMatch) {
        payload.maxCount = parseInt(countMatch[1], 10);
    }

    // Extract scope hints
    const scopePatterns = [
        /je\s+(Kiefer|Zahn|Sitzung|Quartal|Behandlung|Tag)/i,
        /pro\s+(Kiefer|Zahn|Sitzung|Quartal|Behandlung|Tag)/i,
        /einmal\s+(je|pro)\s+(Kiefer|Zahn|Sitzung|Quartal)/i,
    ];
    for (const pattern of scopePatterns) {
        const scopeMatch = evidence.match(pattern);
        if (scopeMatch) {
            payload.scope = scopeMatch[1] || scopeMatch[2];
            break;
        }
    }

    // Extract timeframe
    const timeMatch = evidence.match(/innerhalb\s+von\s+(\d+)\s+(Tag|Woche|Monat|Jahr)/i);
    if (timeMatch) {
        payload.timeframe = `${timeMatch[1]} ${timeMatch[2]}(en/n)`;
    }

    // Extract related codes from evidence (BEMA-Nr. X, GOZ X, etc.)
    const codeRefs = evidence.match(/(?:BEMA-Nr\.?\s*|GOZ[-\s]?|BEL[-\s]?)(\d{1,4}[a-d]?)/gi);
    if (codeRefs && codeRefs.length > 0) {
        payload.relatedCodes = codeRefs.slice(0, 5);
    }

    return payload;
}

// ═══════════════════════════════════════════════════════════════
// SEVERITY MAPPING
// ═══════════════════════════════════════════════════════════════

function determineSeverity(conditionType: ConditionType): 'warn' | 'error' | 'info' {
    switch (conditionType) {
        case 'contra':
            return 'error';
        case 'maxCount':
        case 'frequency':
            return 'warn';
        case 'compat':
        case 'requires':
            return 'info';
        default:
            return 'warn';
    }
}

// ═══════════════════════════════════════════════════════════════
// MAIN EXTRACTION
// ═══════════════════════════════════════════════════════════════

export function extractRulesFromCards(cards: CommentCard[]): CommentRule[] {
    const rules: CommentRule[] = [];
    const seenIds = new Set<string>();

    // Sort cards for determinism
    const sortedCards = [...cards].sort((a, b) => a.id.localeCompare(b.id));

    for (const card of sortedCards) {
        if (!card.softRules || card.softRules.length === 0) continue;

        // Sort soft rules within card for determinism
        const sortedRules = [...card.softRules].sort((a, b) =>
            a.type.localeCompare(b.type) || a.evidenceSnippet.localeCompare(b.evidenceSnippet)
        );

        let ruleIndex = 0;
        for (const softRule of sortedRules) {
            const conditionType = mapSoftRuleType(softRule.type);
            const ruleId = generateRuleId(card, softRule, ruleIndex);

            // Skip duplicates
            if (seenIds.has(ruleId)) continue;
            seenIds.add(ruleId);

            const payload = extractPayload(softRule, softRule.evidenceSnippet);
            const severity = determineSeverity(conditionType);

            const rule: CommentRule = {
                ruleId,
                system: card.system,
                codePattern: card.code,
                severity,
                conditionType,
                payload,
                evidenceSnippet: softRule.evidenceSnippet,
                sourceCardId: card.id,
                tags: card.tags || [],
            };

            rules.push(rule);
            ruleIndex++;
        }
    }

    // Sort final output for determinism
    rules.sort((a, b) => a.ruleId.localeCompare(b.ruleId));

    return rules;
}

// ═══════════════════════════════════════════════════════════════
// FILE GENERATION
// ═══════════════════════════════════════════════════════════════

export function generateRulesFile(): CommentRulesFile {
    const cards = loadAllCards();
    const rules = extractRulesFromCards(cards);

    // Calculate stats
    const bySystem: Record<string, number> = { BEL: 0, BEMA: 0, GOZ: 0, ANALOG: 0, UNKNOWN: 0 };
    const byConditionType: Record<ConditionType, number> = {
        compat: 0, contra: 0, maxCount: 0, frequency: 0, scope: 0, requires: 0, material: 0, analogJustification: 0, unknown: 0
    };

    for (const rule of rules) {
        const sys = rule.system as string;
        bySystem[sys] = (bySystem[sys] || 0) + 1;
        byConditionType[rule.conditionType]++;
    }

    return {
        meta: {
            version: 'v1',
            generatedAt: new Date().toISOString(),
            totalRules: rules.length,
            bySystem,
            byConditionType,
        },
        rules,
    };
}

export function writeRulesFile(outputPath?: string): string {
    const rulesFile = generateRulesFile();
    const targetPath = outputPath || path.resolve(__dirname, '../rules/comment_rules_v1.json');

    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, JSON.stringify(rulesFile, null, 2) + '\n');

    return targetPath;
}

// ═══════════════════════════════════════════════════════════════
// QUERYING
// ═══════════════════════════════════════════════════════════════

let _cachedRules: CommentRule[] | null = null;

export function loadRules(): CommentRule[] {
    if (_cachedRules === null) {
        _cachedRules = generateRulesFile().rules;
    }
    return _cachedRules;
}

export function clearRulesCache(): void {
    _cachedRules = null;
}

export function getRulesForCode(code: string): CommentRule[] {
    return loadRules().filter(r => r.codePattern === code);
}

export function getRulesByConditionType(type: ConditionType): CommentRule[] {
    return loadRules().filter(r => r.conditionType === type);
}

export function getContraRules(): CommentRule[] {
    return getRulesByConditionType('contra');
}

export function getMaxCountRules(): CommentRule[] {
    return getRulesByConditionType('maxCount');
}
