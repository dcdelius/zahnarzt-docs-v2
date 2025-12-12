/**
 * Chip Resolver — SSOT-driven chip resolution
 * 
 * This module is the SINGLE SOURCE OF TRUTH for:
 * - Inferring chips from extracted dictation data
 * - Applying answer selections to chip sets
 * - Resolving final active chips with proper deduplication
 * 
 * NO LOGIC IN V6 — all chip decisions happen here via JSON mappings.
 */

// Local types (to avoid circular dependency with V6)
export type InsuranceType = 'GKV' | 'PKV';

export interface ExtractedData {
    tooth?: string;
    surfaces?: string[];
    diagnosis?: string;
    costs?: number;
    mentioned?: {
        anesthesia?: { type?: 'infiltr' | 'leitung' | 'keine' };
        kofferdam?: boolean;
        capping?: { type?: 'cp' | 'p' | 'none' };
        vitality?: '+' | '-';
        percussion?: '+' | '-';
        material?: string;
    };
}

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface AnswerMapping {
    questionKey: string;
    questionIdPatterns: string[];
    answers: { [key: string]: string | null };
    exclusiveGroup: string;
    mutuallyExclusive: string[];
    requiresMKV?: boolean;
}

interface ExtractionMapping {
    [path: string]: { [value: string]: string };
}

interface AnswerMapFile {
    _meta: { treatmentId: string; version: string };
    map: AnswerMapping[];
    extractionMapping: ExtractionMapping;
    defaults: {
        alwaysOnChipIds: string[];
        mkvChipId: string;
    };
    exclusiveGroups: { [group: string]: string[] };
}

interface ResolveOptions {
    hasMKV: boolean;
    insuranceType: InsuranceType;
}

// ═══════════════════════════════════════════════════════════════
// LOADER
// ═══════════════════════════════════════════════════════════════

const answerMapCache = new Map<string, AnswerMapFile>();

function loadAnswerMap(treatmentId: string): AnswerMapFile | null {
    if (answerMapCache.has(treatmentId)) {
        return answerMapCache.get(treatmentId)!;
    }

    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const data = require(`../mappings/${treatmentId}_answer_map.json`) as AnswerMapFile;
        answerMapCache.set(treatmentId, data);
        return data;
    } catch {
        console.warn(`[ChipResolver] No answer map for treatment: ${treatmentId}`);
        return null;
    }
}

// ═══════════════════════════════════════════════════════════════
// EXTRACTION → CHIPS
// ═══════════════════════════════════════════════════════════════

/**
 * Infer chips from ExtractedData using SSOT extraction mapping.
 * NO HARDCODED LOGIC — all mappings from JSON.
 */
export function inferChipsFromExtractedData(
    treatmentId: string,
    extracted: ExtractedData,
    options: ResolveOptions
): string[] {
    const answerMap = loadAnswerMap(treatmentId);
    if (!answerMap) {
        console.warn(`[ChipResolver] No answer map, returning defaults only`);
        return [];
    }

    const chips: string[] = [];
    const mentioned = extracted.mentioned || {};

    // Apply extraction mapping from JSON
    for (const [path, valueMap] of Object.entries(answerMap.extractionMapping)) {
        const value = getNestedValue(mentioned, path.replace('mentioned.', ''));
        if (value !== undefined && value !== null) {
            const stringValue = String(value);
            const chipId = valueMap[stringValue];
            if (chipId) {
                chips.push(chipId);
            }
        }
    }

    return chips;
}

/**
 * Get nested value from object using dot notation.
 */
function getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
}

// ═══════════════════════════════════════════════════════════════
// ANSWERS → CHIPS
// ═══════════════════════════════════════════════════════════════

/**
 * Apply answer selections to chip set using SSOT answer mapping.
 * Handles exclusive groups (removes mutually exclusive chips).
 */
export function applyAnswersToChipSelection(
    treatmentId: string,
    inferredChipIds: string[],
    answers: Map<string, string>,
    options: ResolveOptions
): string[] {
    const answerMap = loadAnswerMap(treatmentId);
    if (!answerMap) {
        return inferredChipIds;
    }

    const chipSet = new Set<string>(inferredChipIds);

    // Process each answer
    for (const [questionId, answerId] of answers) {
        // Find matching mapping
        const mapping = answerMap.map.find(m =>
            m.questionIdPatterns.some(pattern =>
                questionId.includes(pattern) || questionId === pattern
            )
        );

        if (mapping) {
            // Check MKV requirement
            if (mapping.requiresMKV && !options.hasMKV) {
                continue;
            }

            // Remove mutually exclusive chips
            for (const exclusiveChip of mapping.mutuallyExclusive) {
                chipSet.delete(exclusiveChip);
            }

            // Add new chip from answer
            const newChipId = mapping.answers[answerId];
            if (newChipId) {
                chipSet.add(newChipId);
            }
        }
    }

    return [...chipSet];
}

// ═══════════════════════════════════════════════════════════════
// RESOLVE (COMBINED)
// ═══════════════════════════════════════════════════════════════

/**
 * Resolve active chip IDs: inference + answers + defaults.
 * This is the main entry point for V6 outputService.
 */
export function resolveActiveChipIds(
    treatmentId: string,
    extracted: ExtractedData,
    answers: Map<string, string>,
    options: ResolveOptions
): string[] {
    const answerMap = loadAnswerMap(treatmentId);
    if (!answerMap) {
        console.warn(`[ChipResolver] No answer map for ${treatmentId}, using empty set`);
        return [];
    }

    // 1. Start with always-on defaults from JSON
    const chips = new Set<string>(answerMap.defaults.alwaysOnChipIds);

    // 2. Add MKV chip if applicable
    if (options.hasMKV && answerMap.defaults.mkvChipId) {
        chips.add(answerMap.defaults.mkvChipId);
    }

    // 3. Infer chips from extraction
    const inferred = inferChipsFromExtractedData(treatmentId, extracted, options);
    for (const chip of inferred) {
        chips.add(chip);
    }

    // 4. Apply answers (overrides inference, handles exclusivity)
    const withAnswers = applyAnswersToChipSelection(
        treatmentId,
        [...chips],
        answers,
        options
    );

    // 5. Final deduplication via exclusive groups
    return dedupeByExclusiveGroups([...new Set(withAnswers)], answerMap.exclusiveGroups);
}

/**
 * Dedupe chips using exclusive groups.
 * If multiple chips from same group exist, keep the last one (newest).
 */
function dedupeByExclusiveGroups(
    chips: string[],
    exclusiveGroups: { [group: string]: string[] }
): string[] {
    const result = new Set<string>(chips);

    for (const [_group, members] of Object.entries(exclusiveGroups)) {
        const presentMembers = members.filter(m => result.has(m));
        if (presentMembers.length > 1) {
            // Keep only the last one (most recent/override)
            const toRemove = presentMembers.slice(0, -1);
            for (const chip of toRemove) {
                result.delete(chip);
            }
        }
    }

    return [...result];
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export type { ResolveOptions, AnswerMapFile };
