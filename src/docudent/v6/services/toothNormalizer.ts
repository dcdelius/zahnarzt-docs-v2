/**
 * Tooth Number Normalizer
 * 
 * Normalizes tooth numbers from various input formats to FDI notation.
 * This runs BEFORE extraction to ensure all downstream components receive clean data.
 * 
 * Handles:
 * - German word numbers (elf → 11, sechsunddreißig → 36)
 * - Spoken pairs (eins eins → 11, drei sechs → 36)
 * - Whisper transcription errors (110 → 11, 3-6 → 36)
 * - FDI validation (only 11-18, 21-28, 31-38, 41-48)
 */

// ═══════════════════════════════════════════════════════════════
// GERMAN NUMBER WORDS
// ═══════════════════════════════════════════════════════════════

const GERMAN_ONES: Record<string, number> = {
    'null': 0,
    'eins': 1, 'ein': 1, 'eine': 1,
    'zwei': 2, 'zwo': 2,
    'drei': 3,
    'vier': 4,
    'fünf': 5, 'fuenf': 5,
    'sechs': 6,
    'sieben': 7,
    'acht': 8,
    'neun': 9,
    'zehn': 10,
    'elf': 11,
    'zwölf': 12, 'zwoelf': 12
};

const GERMAN_TENS: Record<string, number> = {
    'zwanzig': 20,
    'dreißig': 30, 'dreissig': 30,
    'vierzig': 40,
    'fünfzig': 50, 'fuenfzig': 50
};

// Direct tooth number words (common in dental practice)
const GERMAN_TOOTH_NUMBERS: Record<string, string> = {
    // 10er Bereich
    'elf': '11',
    'zwölf': '12', 'zwoelf': '12',
    'dreizehn': '13',
    'vierzehn': '14',
    'fünfzehn': '15', 'fuenfzehn': '15',
    'sechzehn': '16',
    'siebzehn': '17',
    'achtzehn': '18',
    // 20er Bereich
    'einundzwanzig': '21',
    'zweiundzwanzig': '22',
    'dreiundzwanzig': '23',
    'vierundzwanzig': '24',
    'fünfundzwanzig': '25', 'fuenfundzwanzig': '25',
    'sechsundzwanzig': '26',
    'siebenundzwanzig': '27',
    'achtundzwanzig': '28',
    // 30er Bereich
    'einunddreißig': '31', 'einunddreissig': '31',
    'zweiunddreißig': '32', 'zweiunddreissig': '32',
    'dreiunddreißig': '33', 'dreiunddreissig': '33',
    'vierunddreißig': '34', 'vierunddreissig': '34',
    'fünfunddreißig': '35', 'fuenfunddreissig': '35',
    'sechsunddreißig': '36', 'sechsunddreissig': '36',
    'siebenunddreißig': '37', 'siebenunddreissig': '37',
    'achtunddreißig': '38', 'achtunddreissig': '38',
    // 40er Bereich  
    'einundvierzig': '41',
    'zweiundvierzig': '42',
    'dreiundvierzig': '43',
    'vierundvierzig': '44',
    'fünfundvierzig': '45', 'fuenfundvierzig': '45',
    'sechsundvierzig': '46',
    'siebenundvierzig': '47',
    'achtundvierzig': '48'
};

// ═══════════════════════════════════════════════════════════════
// FDI VALIDATION
// ═══════════════════════════════════════════════════════════════

const VALID_FDI_TEETH = new Set([
    // Quadrant 1 (OK rechts)
    11, 12, 13, 14, 15, 16, 17, 18,
    // Quadrant 2 (OK links)
    21, 22, 23, 24, 25, 26, 27, 28,
    // Quadrant 3 (UK links)
    31, 32, 33, 34, 35, 36, 37, 38,
    // Quadrant 4 (UK rechts)
    41, 42, 43, 44, 45, 46, 47, 48
]);

export function isValidFDI(tooth: number): boolean {
    return VALID_FDI_TEETH.has(tooth);
}

// ═══════════════════════════════════════════════════════════════
// NORMALIZATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Extract and normalize a single tooth number from text
 * Returns null if no valid tooth found
 */
export function extractToothNumber(text: string): string | null {
    const lower = text.toLowerCase().trim();

    // 1. Direct German word match (highest priority)
    for (const [word, fdi] of Object.entries(GERMAN_TOOTH_NUMBERS)) {
        if (lower.includes(word)) {
            return fdi;
        }
    }

    // 2. Spoken pair pattern: "eins eins" → 11, "drei sechs" → 36
    const pairMatch = lower.match(/\b(eins?|zwei|zwo|drei|vier)\s+(eins?|zwei|zwo|drei|vier|fünf|fuenf|sechs|sieben|acht)\b/);
    if (pairMatch) {
        const quadrant = GERMAN_ONES[pairMatch[1]] || 0;
        const position = GERMAN_ONES[pairMatch[2]] || 0;
        if (quadrant >= 1 && quadrant <= 4 && position >= 1 && position <= 8) {
            const fdi = quadrant * 10 + position;
            if (isValidFDI(fdi)) {
                return String(fdi);
            }
        }
    }


    // 3. Whisper error patterns

    // "110" → "11" (Whisper sometimes adds trailing zero)
    // But NOT "120€" which is a currency amount
    const trailingZeroMatch = text.match(/\b([1-4][1-8])0(?!\s*[€$]|\s*euro|\s*eur\b)/i);
    if (trailingZeroMatch) {
        const fdi = parseInt(trailingZeroMatch[1], 10);
        if (isValidFDI(fdi)) {
            return String(fdi);
        }
    }


    // "3-6" or "3 6" → "36" (hyphenated or spaced)
    const separatedMatch = text.match(/\b([1-4])[-\s]([1-8])\b/);
    if (separatedMatch) {
        const fdi = parseInt(separatedMatch[1] + separatedMatch[2], 10);
        if (isValidFDI(fdi)) {
            return String(fdi);
        }
    }

    // "36a" → "36" (trailing letter)
    const trailingLetterMatch = text.match(/\b([1-4][1-8])[a-z]\b/i);
    if (trailingLetterMatch) {
        const fdi = parseInt(trailingLetterMatch[1], 10);
        if (isValidFDI(fdi)) {
            return String(fdi);
        }
    }

    // 4. Direct numeric match (standard case)
    const numericMatch = text.match(/\b([1-4][1-8])\b/);
    if (numericMatch) {
        const fdi = parseInt(numericMatch[1], 10);
        if (isValidFDI(fdi)) {
            return String(fdi);
        }
    }

    // 5. "Zahn X" pattern with loose matching
    const zahnMatch = text.match(/zahn\s*(?:nummer\s*)?(\d+)/i);
    if (zahnMatch) {
        const num = parseInt(zahnMatch[1], 10);
        if (isValidFDI(num)) {
            return String(num);
        }
        // Try fixing common errors
        if (num >= 110 && num <= 480) {
            // "Zahn 360" → "36"
            const fixed = Math.floor(num / 10);
            if (isValidFDI(fixed)) {
                return String(fixed);
            }
        }
    }

    return null;
}

/**
 * Normalize tooth numbers in a full dictation text
 * Returns the text with all tooth references normalized to FDI
 */
export function normalizeToothInText(text: string): string {
    let result = text;

    // Replace German word numbers with FDI
    for (const [word, fdi] of Object.entries(GERMAN_TOOTH_NUMBERS)) {
        // Case-insensitive replacement, preserve spacing
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        result = result.replace(regex, fdi);
    }

    // Replace spoken pairs
    const pairRegex = /\b(eins?|zwei|zwo|drei|vier)\s+(eins?|zwei|zwo|drei|vier|fünf|fuenf|sechs|sieben|acht)\b/gi;
    result = result.replace(pairRegex, (match, q, p) => {
        const quadrant = GERMAN_ONES[q.toLowerCase()] || 0;
        const position = GERMAN_ONES[p.toLowerCase()] || 0;
        if (quadrant >= 1 && quadrant <= 4 && position >= 1 && position <= 8) {
            const fdi = quadrant * 10 + position;
            if (isValidFDI(fdi)) {
                return String(fdi);
            }
        }
        return match; // Keep original if invalid
    });

    // Fix Whisper errors: "110" → "11" (but NOT currency like "120€")
    // Use negative lookahead to avoid matching amounts followed by currency symbols
    result = result.replace(/\b([1-4][1-8])0(?!\s*[€$]|\s*euro|\s*eur\b)(?=\s|$|\b)/gi, '$1');

    // Fix "3-6" → "36"
    result = result.replace(/\b([1-4])[-]([1-8])(?![0-9€$])(?=\s|$|\b)/g, '$1$2');

    // Fix "36a" → "36"
    result = result.replace(/\b([1-4][1-8])[a-z](?![a-z])(?=\s|$|\b)/gi, '$1');

    return result;
}

/**
 * Get tooth quadrant info (useful for anesthesia logic)
 */
export function getToothQuadrant(tooth: string): {
    quadrant: 1 | 2 | 3 | 4;
    position: number;
    isUK: boolean;
    isMolar: boolean;
    isAnterior: boolean;
} | null {
    const num = parseInt(tooth, 10);
    if (!isValidFDI(num)) return null;

    const quadrant = Math.floor(num / 10) as 1 | 2 | 3 | 4;
    const position = num % 10;

    return {
        quadrant,
        position,
        isUK: quadrant >= 3,  // Quadrant 3 or 4 = Unterkiefer
        isMolar: position >= 6,  // 6, 7, 8 = Molaren
        isAnterior: position <= 3  // 1, 2, 3 = Frontzähne
    };
}

/**
 * Check if tooth requires Leitungsanästhesie (UK Molaren)
 */
export function requiresLeitungsanaesthesie(tooth: string): boolean {
    const info = getToothQuadrant(tooth);
    if (!info) return false;

    // UK Molaren (36-38, 46-48) typically require Leitung
    return info.isUK && info.isMolar;
}
