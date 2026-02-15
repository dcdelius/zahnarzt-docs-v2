/**
 * Multi-Treatment Scoping
 * 
 * Scopes extraction results to instances without leaking facts between teeth.
 * 
 * Rules:
 * - Segment markers: "danach", "zusätzlich", "auch", "weiterer Zahn", "ebenfalls", "noch"
 * - Default: Multiple teeth without marker = same treatment type, multiple instances
 * - Negation: Only affects segment/instance, not global (unless "bei beiden"/"generell")
 * - Surface: Only applies to tooth referenced in segment
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface ExtractionResult {
    tooth?: string | null;
    teeth?: string[];
    surfaces?: string[];
    diagnosis?: string | null;
    material?: string | null;
    mentioned?: Record<string, unknown>;
    negations?: string[];
}

export interface InstanceFacts {
    instanceId: string;
    packId: string;
    teeth: string[];
    surfaces: string[];
    markers: string[];
    unknowns: string[];
    facts: Record<string, unknown>;
    negations: string[];
    sourceText?: string;
}

export interface ScopingResult {
    instances: InstanceFacts[];
    globalMarkers: string[];
    globalSegments: string[];
    segmentCount: number;
}

import { splitDictationIntoSegments } from './segmentDictation';
import { parseEndoSignals } from '@/docudent/core/playbooks/endo/endoSignalParser';

// ═══════════════════════════════════════════════════════════════
// SEGMENT MARKERS
// ═══════════════════════════════════════════════════════════════
const GLOBAL_SCOPE_MARKERS = [
    'bei beiden',
    'bei allen',
    'generell',
    'grundsätzlich',
    'insgesamt',
];

// ═══════════════════════════════════════════════════════════════
// TOOTH DETECTION
// ═══════════════════════════════════════════════════════════════

// Matches "Zahn 27" or standalone 2-digit FDI tooth numbers (11-48)
// Does NOT match: prices (120€, 150 Euro), dates (2024), 3+ digit numbers
const TOOTH_PATTERN = /(?:zahn\s+)?(\d{2})(?![0-9€])/gi;

// Patterns that indicate a number is NOT a tooth
const PRICE_PATTERN = /(\d+)\s*€|(\d+)\s*euro|(\d+)\s*eur\b/gi;
// ISO dates (2024-01-15), German dates (15.01.2024), and standalone years
const ISO_DATE_PATTERN = /\d{4}-\d{2}-\d{2}/g;
const GERMAN_DATE_PATTERN = /\d{1,2}\.\d{1,2}\.\d{2,4}/g;
const YEAR_PATTERN = /\b(20\d{2}|19\d{2})\b/g;
const TIME_PATTERN = /\d{1,2}:\d{2}/g;

/**
 * Extract valid FDI tooth numbers from text.
 * Rejects: prices (120€), dates (2024), times (12:30), multi-digit numbers.
 */
function extractTeeth(text: string, packId: string): string[] {
    // Endo dictations contain many 2-digit numbers (WL/ISO) that must NOT become teeth.
    // Use deterministic endo parser as the primary source of truth for endo tooth scoping.
    if (packId === 'endo') {
        const signals = parseEndoSignals(text);
        const tooth = signals.tooth;
        if (typeof tooth === 'string' && /^\d{2}$/.test(tooth)) {
            const num = parseInt(tooth, 10);
            const quadrant = Math.floor(num / 10);
            const position = num % 10;
            if (quadrant >= 1 && quadrant <= 4 && position >= 1 && position <= 8) {
                return [tooth];
            }
        }
    }

    // First, mask out prices/dates/times to prevent false matches
    let maskedText = text
        .replace(PRICE_PATTERN, ' PRICE ')
        .replace(ISO_DATE_PATTERN, ' DATE ')
        .replace(GERMAN_DATE_PATTERN, ' DATE ')
        .replace(YEAR_PATTERN, ' DATE ')
        .replace(TIME_PATTERN, ' TIME ');

    // Also mask 3+ digit numbers (not teeth)
    maskedText = maskedText.replace(/\d{3,}/g, ' NUM ');

    const matches = maskedText.matchAll(TOOTH_PATTERN);
    const teeth = new Set<string>();

    for (const match of matches) {
        const num = parseInt(match[1], 10);
        // Valid FDI: 11-18, 21-28, 31-38, 41-48
        const quadrant = Math.floor(num / 10);
        const position = num % 10;

        if (quadrant >= 1 && quadrant <= 4 && position >= 1 && position <= 8) {
            teeth.add(match[1]);
        }
    }

    // ═══ DEV PROBE A: Scoping tooth extraction ═══
    if (process.env.NODE_ENV !== 'production' && teeth.size > 0) {
        console.debug('[PROBE A] extractTeeth', {
            originalText: text.slice(0, 100) + (text.length > 100 ? '...' : ''),
            maskedText: maskedText.slice(0, 100) + (maskedText.length > 100 ? '...' : ''),
            teethFound: [...teeth],
        });
    }

    return Array.from(teeth);
}

// ═══════════════════════════════════════════════════════════════
// SURFACE DETECTION
// ═══════════════════════════════════════════════════════════════

const SURFACE_PATTERNS: Record<string, string> = {
    'okklusal': 'o',
    'mesial': 'm',
    'distal': 'd',
    'bukkal': 'b',
    'lingual': 'l',
    'vestibulär': 'v',
    'palatinal': 'p',
};

function extractSurfaces(text: string): string[] {
    const surfaces: string[] = [];
    const lowerText = text.toLowerCase();

    for (const [pattern, code] of Object.entries(SURFACE_PATTERNS)) {
        if (lowerText.includes(pattern)) {
            surfaces.push(code);
        }
    }

    // Also detect short codes like "mod" or "do"
    const shortPattern = /\b(mod|mo|do|od|md|dm|o|m|d|b|l|v|p)\b/gi;
    const shortMatches = lowerText.matchAll(shortPattern);
    for (const match of shortMatches) {
        const codes = match[1].toLowerCase().split('');
        for (const c of codes) {
            if (!surfaces.includes(c)) {
                surfaces.push(c);
            }
        }
    }

    return surfaces;
}

// ═══════════════════════════════════════════════════════════════
// NEGATION DETECTION
// ═══════════════════════════════════════════════════════════════

const NEGATION_PATTERNS = [
    /ohne (kofferdam|adhäsiv|schicht|überkappung)/gi,
    /kein(e)? (kofferdam|adhäsiv|überkappung)/gi,
    /nicht (durchgeführt|verwendet)/gi,
];

function extractNegations(text: string): string[] {
    const negations: string[] = [];

    for (const pattern of NEGATION_PATTERNS) {
        const matches = text.matchAll(pattern);
        for (const match of matches) {
            negations.push(match[0].toLowerCase());
        }
    }

    return negations;
}

function hasGlobalScope(text: string): boolean {
    const lowerText = text.toLowerCase();
    return GLOBAL_SCOPE_MARKERS.some(marker => lowerText.includes(marker));
}

// ═══════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Scope extraction to instances without leaking facts between teeth.
 * 
 * @param extraction - Raw extraction result or dictation text
 * @param packId - Treatment pack ID
 * @returns Scoping result with instances
 */
export function scopeExtractionToInstances(
    extraction: ExtractionResult | string,
    packId: string = 'fuellung'
): ScopingResult {
    const text = typeof extraction === 'string'
        ? extraction
        : JSON.stringify(extraction.mentioned || {});

    const dictation = typeof extraction === 'string' ? extraction : '';
    const segments = splitDictationIntoSegments(dictation || text);

    const instances: InstanceFacts[] = [];
    const globalMarkers: string[] = [];
    const globalSegments: string[] = [];
    let instanceCounter = 0;

    // Check for global scope
    const isGlobalScope = hasGlobalScope(dictation || text);
    if (isGlobalScope) {
        globalMarkers.push('global');
    }

    // Process each segment
    for (const segment of segments) {
        const teeth = extractTeeth(segment, packId);
        const surfaces = extractSurfaces(segment);
        const negations = extractNegations(segment);

        // If no teeth found in segment, try extraction object
        if (teeth.length === 0 && typeof extraction === 'object') {
            if (extraction.tooth) teeth.push(extraction.tooth);
            if (extraction.teeth) teeth.push(...extraction.teeth);
        }

        // If no teeth detected for this segment, skip instance creation.
        // A single unknown instance will be created only if no teeth are found at all.
        if (teeth.length === 0) {
            globalSegments.push(segment);
            continue;
        }

        // Create instance for each tooth in segment
        for (const tooth of teeth) {
            instanceCounter++;
            const instanceId = `${packId}-${tooth}-${instanceCounter}`;

            instances.push({
                instanceId,
                packId,
                teeth: [tooth],
                surfaces: isGlobalScope ? surfaces : [...surfaces], // Copy for isolation
                markers: [],
                unknowns: [],
                facts: {
                    tooth,
                    surfaces: isGlobalScope ? surfaces : [...surfaces],
                },
                negations: isGlobalScope ? negations : [...negations], // Scoped negations
                sourceText: segment,
            });
        }
    }

    // If no instances created, create default
    if (instances.length === 0) {
        instances.push({
            instanceId: `${packId}-unknown-1`,
            packId,
            teeth: ['unknown'],
            surfaces: [],
            markers: [],
            unknowns: ['tooth'],
            facts: {},
            negations: [],
        });
    }

    return {
        instances,
        globalMarkers,
        globalSegments,
        segmentCount: segments.length,
    };
}

/**
 * Verify that negations don't leak between instances.
 */
export function verifyNegationIsolation(result: ScopingResult): boolean {
    const negationsByInstance = result.instances.map(i => i.negations);

    // Each instance should have its own negation array (not shared reference)
    for (let i = 0; i < negationsByInstance.length; i++) {
        for (let j = i + 1; j < negationsByInstance.length; j++) {
            if (negationsByInstance[i] === negationsByInstance[j]) {
                return false; // Same reference = leak
            }
        }
    }

    return true;
}

/**
 * Verify that surfaces don't leak between instances.
 */
export function verifySurfaceIsolation(result: ScopingResult): boolean {
    const surfacesByInstance = result.instances.map(i => i.surfaces);

    for (let i = 0; i < surfacesByInstance.length; i++) {
        for (let j = i + 1; j < surfacesByInstance.length; j++) {
            if (surfacesByInstance[i] === surfacesByInstance[j]) {
                return false; // Same reference = leak
            }
        }
    }

    return true;
}
