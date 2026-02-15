/**
 * Shared Helpers for Extraction→Facts Mapping
 *
 * Synonym tables and normalization utilities.
 * ALL raw extraction interpretation helpers live here.
 */

// ═══════════════════════════════════════════════════════════════
// TOKEN NORMALIZATION
// ═══════════════════════════════════════════════════════════════

/**
 * Normalize a token: lowercase, remove diacritics, trim
 */
export function normalizeToken(s: string): string {
    return s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/ä/g, 'a')
        .replace(/ö/g, 'o')
        .replace(/ü/g, 'u')
        .replace(/ß/g, 'ss')
        .trim();
}

/**
 * Check if haystack contains any of the needles
 */
export function hasAny(haystack: string, needles: string[]): boolean {
    const normalized = normalizeToken(haystack);
    return needles.some(needle => normalized.includes(normalizeToken(needle)));
}

/**
 * Check if haystack contains all of the needles
 */
export function hasAll(haystack: string, needles: string[]): boolean {
    const normalized = normalizeToken(haystack);
    return needles.every(needle => normalized.includes(normalizeToken(needle)));
}

// ═══════════════════════════════════════════════════════════════
// SYNONYM TABLES
// ═══════════════════════════════════════════════════════════════

/**
 * Deep caries / caries profunda synonyms
 * Maps to: 'profunda' | 'pulp_near'
 */
export const DEEP_CARIES_TOKENS = {
    profunda: [
        'profunda',
        'caries profunda',
        'karies profunda',
        'sehr tief',
        'sehr tiefe',
        'deep caries',
    ],
    pulp_near: [
        'pulpanah',
        'pulpannah',  // common typo
        'pulpa nah',
        'pulpa-nah',
        'nahe pulpa',
        'near pulp',
        'pulp near',
        'tief',
        'tiefe karies',
        'tiefe kavitat',
        'deep',
    ],
};

/**
 * Normal caries synonyms
 */
export const NORMAL_CARIES_TOKENS = [
    'media',
    'caries media',
    'karies media',
    'normal',
    'superficialis',
    'oberflachlich',
];

/**
 * Bleeding / hemostasis tokens
 */
export const BLEEDING_TOKENS = {
    detected: [
        'blutung',
        'blutet',
        'blutend',
        'bleeding',
        'blutig',
    ],
    heavy: [
        'starke blutung',
        'stark blutend',
        'heavy bleeding',
        'massive blutung',
        'deutliche blutung',
        'persistierende blutung',
    ],
    hemostasis: [
        'blutstillung',
        'hamostase',
        'haemostase',
        'hemostasis',
        'gestillt',
        'alcl3',
        'alaun',
        'gelatamp',
        'koagulation',
        'druck',  // pressure for hemostasis
        'tamponade',
    ],
};

/**
 * Sensitivity / hypersensitivity tokens
 */
export const SENSITIVITY_TOKENS = {
    detected: [
        'empfindlich',
        'sensibel',
        'sensitivity',
        'sensitive',
        'hypersensibel',
        'hypersensitiv',
        'hypersensitivity',
        'uberempfindlich',
        'uberempfindlichkeit',
    ],
    high: [
        'stark empfindlich',
        'sehr empfindlich',
        'ausgepragte empfindlichkeit',
        'high sensitivity',
        'deutlich empfindlich',
    ],
    cold: [
        'kalt empfindlich',
        'kalteempfindlich',
        'cold sensitive',
        'kaltereiz',
    ],
    postop: [
        'postop',
        'postoperativ',
        'nach behandlung',
        'nach fullung',
    ],
    desensitizer: [
        'duraphat',
        'fluorid',
        'desensibilisierung',
        'desensitizer',
        'elmex',
    ],
};

/**
 * Anesthesia tokens (M15)
 * Detects when anesthesia was given and type
 */
export const ANESTHESIA_TOKENS = {
    detected: [
        'anasthesie',
        'anästhesie',
        'betaubung',
        'betäubung',
        'spritze',
        'lokalanasthesie',
        'lokalanästhesie',
        'la',  // common abbreviation
        'anesthesia',
        'local anesthesia',
    ],
    infiltration: [
        'infiltration',
        'infiltrationsanasthesie',
        'infiltrationsanästhesie',
        'inf',
    ],
    leitungsanaesthesie: [
        'leitung',
        'leitungsanasthesie',
        'leitungsanästhesie',
        'leitungsanaesthesie',
        'leitungsbetaubung',
        'mandibular',
        'n. mandibularis',
        'nervblock',
    ],
};

/**
 * Isolation / dry field tokens (M15)
 * Detects kofferdam (absolute) vs relative isolation
 */
export const ISOLATION_TOKENS = {
    detected: [
        'isolation',
        'isolierung',
        'trockenlegung',
        'trockenes feld',
        'dry field',
    ],
    absolute: [
        'kofferdam',
        'cofferdam',
        'rubberdam',
        'rubber dam',
        'spanngummi',
        'absolute trockenlegung',
        'absolute isolation',
    ],
    relative: [
        'relative',
        'relative isolation',
        'relative trockenlegung',
        'watterollen',
        'wattetamponade',
        'speichelabsaugung',
        'sauger',
    ],
};

// ═══════════════════════════════════════════════════════════════
// DETECTION HELPERS
// ═══════════════════════════════════════════════════════════════

export type CariesDepthResult = 'profunda' | 'pulp_near' | 'normal' | 'unknown';

/**
 * Detect caries depth from text
 */
export function detectCariesDepth(text: string): CariesDepthResult {
    const normalized = normalizeToken(text);

    // Check profunda first (more specific)
    if (hasAny(normalized, DEEP_CARIES_TOKENS.profunda)) {
        return 'profunda';
    }

    // Check pulp_near
    if (hasAny(normalized, DEEP_CARIES_TOKENS.pulp_near)) {
        return 'pulp_near';
    }

    // Check normal
    if (hasAny(normalized, NORMAL_CARIES_TOKENS)) {
        return 'normal';
    }

    return 'unknown';
}

export interface BleedingDetection {
    detected: boolean;
    heavy: boolean;
    hemostasisMentioned: boolean;
}

/**
 * Detect bleeding signals from text
 */
export function detectBleeding(text: string): BleedingDetection {
    const normalized = normalizeToken(text);

    const detected = hasAny(normalized, BLEEDING_TOKENS.detected) ||
        hasAny(normalized, BLEEDING_TOKENS.heavy);

    const heavy = hasAny(normalized, BLEEDING_TOKENS.heavy);

    const hemostasisMentioned = hasAny(normalized, BLEEDING_TOKENS.hemostasis);

    return { detected, heavy, hemostasisMentioned };
}

export interface SensitivityDetection {
    detected: boolean;
    level: 'low' | 'medium' | 'high' | undefined;
    desensitizerMentioned: boolean;
}

/**
 * Detect sensitivity signals from text
 */
export function detectSensitivity(text: string): SensitivityDetection {
    const normalized = normalizeToken(text);

    const detected = hasAny(normalized, SENSITIVITY_TOKENS.detected) ||
        hasAny(normalized, SENSITIVITY_TOKENS.high) ||
        hasAny(normalized, SENSITIVITY_TOKENS.cold);

    let level: 'low' | 'medium' | 'high' | undefined;
    if (hasAny(normalized, SENSITIVITY_TOKENS.high)) {
        level = 'high';
    } else if (detected) {
        level = 'medium';
    }

    const desensitizerMentioned = hasAny(normalized, SENSITIVITY_TOKENS.desensitizer);

    return { detected, level, desensitizerMentioned };
}

// ═══════════════════════════════════════════════════════════════
// ANESTHESIA DETECTION (M15)
// ═══════════════════════════════════════════════════════════════

export interface AnesthesiaDetection {
    detected: boolean;
    type: 'infiltration' | 'leitungsanaesthesie' | 'unknown' | undefined;
}

/**
 * Detect anesthesia signals from text
 */
export function detectAnesthesia(text: string): AnesthesiaDetection {
    const normalized = normalizeToken(text);

    const detected = hasAny(normalized, ANESTHESIA_TOKENS.detected) ||
        hasAny(normalized, ANESTHESIA_TOKENS.infiltration) ||
        hasAny(normalized, ANESTHESIA_TOKENS.leitungsanaesthesie);

    let type: 'infiltration' | 'leitungsanaesthesie' | 'unknown' | undefined;
    if (detected) {
        if (hasAny(normalized, ANESTHESIA_TOKENS.infiltration)) {
            type = 'infiltration';
        } else if (hasAny(normalized, ANESTHESIA_TOKENS.leitungsanaesthesie)) {
            type = 'leitungsanaesthesie';
        } else {
            type = 'unknown'; // Anesthesia mentioned but type unclear
        }
    }

    return { detected, type };
}

// ═══════════════════════════════════════════════════════════════
// ISOLATION DETECTION (M15)
// ═══════════════════════════════════════════════════════════════

export interface IsolationDetection {
    detected: boolean;
    type: 'absolute' | 'relative' | 'unknown' | undefined;
}

/**
 * Detect isolation/dry field signals from text
 */
export function detectIsolation(text: string): IsolationDetection {
    const normalized = normalizeToken(text);

    // Check for specific types first
    const hasAbsolute = hasAny(normalized, ISOLATION_TOKENS.absolute);
    const hasRelative = hasAny(normalized, ISOLATION_TOKENS.relative);
    const hasGeneric = hasAny(normalized, ISOLATION_TOKENS.detected);

    const detected = hasAbsolute || hasRelative || hasGeneric;

    let type: 'absolute' | 'relative' | 'unknown' | undefined;
    if (detected) {
        if (hasAbsolute) {
            type = 'absolute';
        } else if (hasRelative) {
            type = 'relative';
        } else {
            type = 'unknown';
        }
    }

    return { detected, type };
}

