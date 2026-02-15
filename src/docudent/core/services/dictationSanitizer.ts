/**
 * Dictation Sanitizer — DROP sentences with identity/contact markers
 * 
 * Philosophy: We do NOT process patient data. We do NOT redact.
 * If a sentence contains identity markers, we DROP the entire sentence
 * so it never enters extraction, questions, or output.
 * 
 * This is a deterministic prefilter at the start of the pipeline.
 */

// ═══════════════════════════════════════════════════════════════
// IDENTITY MARKERS — Any sentence with these is DROPPED
// ═══════════════════════════════════════════════════════════════

const IDENTITY_MARKERS = {
    // Email pattern (contains @)
    email: /@/,

    // Phone-like (7+ digits total, or +49/0049)
    phone: /(?:\+49|0049|\d{7,})/,

    // Birthdate markers
    birthdate: /\b(?:geb\.?|geboren)\b|\b\d{1,2}\.\d{1,2}\.\d{4}\b/i,

    // Explicit identity labels
    identityLabels: /\b(?:Patient:|Patientnr\.?|Name:|Herr\s|Frau\s|Dr\.\s|Prof\.\s|Hr\.\s|Fr\.\s)\b/i,

    // Titled name patterns (Herr Müller, Frau Schmidt)
    titledNames: /(?:herrn?|frau|fr\.|hr\.)\s+[A-ZÄÖÜ][a-zäöüß]+/i,
};

// ═══════════════════════════════════════════════════════════════
// SANITIZE FUNCTION
// ═══════════════════════════════════════════════════════════════

export interface SanitizeResult {
    /** Cleaned dictation with identity sentences removed */
    cleaned: string;

    /** Number of sentences dropped */
    droppedCount: number;
}

/**
 * Sanitize dictation by DROPPING sentences with identity/contact markers.
 * 
 * This is NOT redaction. We do not modify text.
 * We DROP entire sentences that contain identity markers.
 * 
 * @param dictation - Raw dictation text
 * @returns Cleaned dictation and count of dropped sentences
 */
export function sanitizeDictation(dictation: string): SanitizeResult {
    if (!dictation || dictation.trim().length === 0) {
        return { cleaned: '', droppedCount: 0 };
    }

    // Split into sentences (period, semicolon, newline)
    const sentences = dictation
        .split(/(?<=[.;])\s+|\n+/)
        .map(s => s.trim())
        .filter(s => s.length > 0);

    const keptSentences: string[] = [];
    let droppedCount = 0;

    for (const sentence of sentences) {
        if (containsIdentityMarker(sentence)) {
            droppedCount++;
            // Sentence is dropped — never stored or processed
        } else {
            keptSentences.push(sentence);
        }
    }

    return {
        cleaned: keptSentences.join(' '),
        droppedCount,
    };
}

/**
 * Check if a sentence contains any identity marker
 */
function containsIdentityMarker(sentence: string): boolean {
    for (const pattern of Object.values(IDENTITY_MARKERS)) {
        if (pattern.test(sentence)) {
            return true;
        }
    }
    return false;
}

/**
 * Check if text contains identity markers (for gate tests)
 */
export function hasIdentityMarkers(text: string): boolean {
    for (const pattern of Object.values(IDENTITY_MARKERS)) {
        if (pattern.test(text)) {
            return true;
        }
    }
    return false;
}
