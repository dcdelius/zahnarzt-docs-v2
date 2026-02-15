/**
 * M33: Segment Scoping for Multi-Treatment Dictations
 * 
 * Provides lightweight clause segmentation to attribute statements
 * like "ohne Anästhesie" to the correct treatment instance.
 * 
 * Strategy:
 * 1. Split dictation by clause markers ("danach", "anschließend", "im Anschluss", ".")
 * 2. Detect treatment keywords in each clause
 * 3. Attribute statements to most recent treatment context
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type TreatmentType = 'endo' | 'fuellung' | 'unknown';

export interface DictationClause {
    /** Original text of this clause */
    text: string;
    /** Index in original dictation */
    startIndex: number;
    /** Detected treatment context */
    treatmentContext: TreatmentType;
    /** Statements extracted from this clause */
    statements: string[];
}

export interface ScopedDictation {
    /** Original full dictation */
    original: string;
    /** Parsed clauses */
    clauses: DictationClause[];
    /** Is this a multi-treatment dictation? */
    isMultiTreatment: boolean;
    /** Detected treatments */
    detectedTreatments: TreatmentType[];
}

export interface ScopedStatement {
    /** The statement text */
    statement: string;
    /** Which treatment it belongs to */
    scope: TreatmentType | 'ambiguous';
    /** Confidence (0-1) */
    confidence: number;
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

/** Markers that indicate clause boundaries */
const CLAUSE_MARKERS = [
    'danach',
    'anschließend',
    'im anschluss',
    'dann',
    'nachfolgend',
    'abschließend',
    'zusätzlich',
];

/** Keywords indicating Endo treatment */
const ENDO_KEYWORDS = [
    'endo',
    'wkb',
    'wurzelkanal',
    'wurzelfüllung',
    'trepanation',
    'kanal',
    'kanäle',
    'apexlocator',
    'naocl',
    'edta',
];

/** Keywords indicating Füllung treatment */
const FUELLUNG_KEYWORDS = [
    'füllung',
    'fuellung',
    'komposit',
    'amalgam',
    'mehrschicht',
    'kofferdam',
    'überkappung',
];

/** Negation patterns that need scope attribution */
const NEGATION_PATTERNS = [
    'ohne anästhesie',
    'ohne betäubung',
    'ohne betaeubung',
    'kein kofferdam',
    'keine anästhesie',
    'keine betäubung',
    'ohne röntgen',
    'kein röntgen',
];

// ═══════════════════════════════════════════════════════════════
// SEGMENTATION
// ═══════════════════════════════════════════════════════════════

/**
 * Split dictation into clauses based on markers.
 */
export function splitIntoClauses(dictation: string): string[] {
    const lower = dictation.toLowerCase();
    const clauses: string[] = [];
    let current = dictation;
    let searchStart = 0;

    // Find all marker positions
    const markerPositions: Array<{ marker: string; index: number }> = [];

    for (const marker of CLAUSE_MARKERS) {
        let idx = lower.indexOf(marker, 0);
        while (idx !== -1) {
            markerPositions.push({ marker, index: idx });
            idx = lower.indexOf(marker, idx + 1);
        }
    }

    // Also split on periods (if followed by space and capital)
    const periodRegex = /\.\s+[A-ZÄÖÜ]/g;
    let match;
    while ((match = periodRegex.exec(dictation)) !== null) {
        markerPositions.push({ marker: '.', index: match.index });
    }

    // Sort by position
    markerPositions.sort((a, b) => a.index - b.index);

    if (markerPositions.length === 0) {
        return [dictation.trim()];
    }

    // Split at markers
    let lastEnd = 0;
    for (const { marker, index } of markerPositions) {
        if (index > lastEnd) {
            const clauseText = dictation.slice(lastEnd, index).trim();
            if (clauseText) clauses.push(clauseText);
        }
        lastEnd = index + (marker === '.' ? 1 : marker.length);
    }

    // Add remaining text
    if (lastEnd < dictation.length) {
        const remaining = dictation.slice(lastEnd).trim();
        if (remaining) clauses.push(remaining);
    }

    return clauses.length > 0 ? clauses : [dictation.trim()];
}

/**
 * Detect treatment type from text.
 */
export function detectTreatmentType(text: string): TreatmentType {
    const lower = text.toLowerCase();

    let endoScore = 0;
    let fuellungScore = 0;

    for (const kw of ENDO_KEYWORDS) {
        if (lower.includes(kw)) endoScore++;
    }

    for (const kw of FUELLUNG_KEYWORDS) {
        if (lower.includes(kw)) fuellungScore++;
    }

    if (endoScore > fuellungScore) return 'endo';
    if (fuellungScore > endoScore) return 'fuellung';
    return 'unknown';
}

/**
 * Parse dictation into scoped clauses.
 */
export function parseScopedDictation(dictation: string): ScopedDictation {
    const clauses = splitIntoClauses(dictation);
    const detectedTreatments: Set<TreatmentType> = new Set();
    let currentContext: TreatmentType = 'unknown';

    const parsedClauses: DictationClause[] = clauses.map((text, idx) => {
        const detected = detectTreatmentType(text);

        if (detected !== 'unknown') {
            currentContext = detected;
            detectedTreatments.add(detected);
        }

        return {
            text,
            startIndex: dictation.indexOf(text),
            treatmentContext: currentContext,
            statements: extractStatements(text),
        };
    });

    const treatmentArray = Array.from(detectedTreatments).filter(t => t !== 'unknown');

    return {
        original: dictation,
        clauses: parsedClauses,
        isMultiTreatment: treatmentArray.length > 1,
        detectedTreatments: treatmentArray,
    };
}

/**
 * Extract key statements from clause.
 */
function extractStatements(clause: string): string[] {
    const statements: string[] = [];
    const lower = clause.toLowerCase();

    for (const pattern of NEGATION_PATTERNS) {
        if (lower.includes(pattern)) {
            statements.push(pattern);
        }
    }

    return statements;
}

// ═══════════════════════════════════════════════════════════════
// SCOPE ATTRIBUTION
// ═══════════════════════════════════════════════════════════════

/**
 * Attribute a statement to a treatment scope.
 */
export function attributeStatement(
    statement: string,
    scoped: ScopedDictation
): ScopedStatement {
    const lower = statement.toLowerCase();

    // Find which clause contains this statement
    for (const clause of scoped.clauses) {
        if (clause.text.toLowerCase().includes(lower)) {
            if (clause.treatmentContext !== 'unknown') {
                return {
                    statement,
                    scope: clause.treatmentContext,
                    confidence: 0.9,
                };
            }
        }
    }

    // If in multi-treatment and no clear context, it's ambiguous
    if (scoped.isMultiTreatment) {
        return {
            statement,
            scope: 'ambiguous',
            confidence: 0.3,
        };
    }

    // Single treatment - attribute to that
    if (scoped.detectedTreatments.length === 1) {
        return {
            statement,
            scope: scoped.detectedTreatments[0],
            confidence: 0.8,
        };
    }

    return {
        statement,
        scope: 'ambiguous',
        confidence: 0.2,
    };
}

/**
 * Check if a negation statement applies to a specific treatment.
 */
export function negationAppliesToTreatment(
    negation: string,
    treatment: TreatmentType,
    scoped: ScopedDictation
): boolean {
    const attributed = attributeStatement(negation, scoped);

    if (attributed.scope === 'ambiguous') {
        // Ambiguous - requires askback
        return false;
    }

    return attributed.scope === treatment;
}

/**
 * Check if scoped dictation needs disambiguation askback.
 */
export function needsScopeDisambiguation(scoped: ScopedDictation): boolean {
    if (!scoped.isMultiTreatment) return false;

    // Check for ambiguous statements
    for (const clause of scoped.clauses) {
        for (const statement of clause.statements) {
            const attributed = attributeStatement(statement, scoped);
            if (attributed.scope === 'ambiguous') {
                return true;
            }
        }
    }

    return false;
}
