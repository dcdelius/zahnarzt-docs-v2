/**
 * ANESTHESIA INFERENCE ENGINE
 * 
 * Generelle Logik für automatische Anästhesie-Auswahl basierend auf Zahnposition.
 * Kann von allen Behandlungen verwendet werden.
 * 
 * Regeln:
 * - Oberkiefer (1x, 2x): Immer Infiltration
 * - Unterkiefer Front (3x, 4x, Position 1-4): Meist Infiltration
 * - Unterkiefer Seitenzähne (35-38, 45-48): Leitungsanästhesie
 */

export type AnesthesiaType = 'infiltration' | 'leitung' | 'keine';

export interface AnesthesiaInference {
    recommended: AnesthesiaType;
    confidence: number;
    reason: string;
}

/**
 * Parst Zahnposition und gibt Quadrant + Zahnzahl zurück
 */
export function parseToothPosition(tooth: string): { quadrant: number; position: number } | null {
    const cleaned = tooth.replace(/[.\s]/g, '');
    const num = parseInt(cleaned, 10);

    if (isNaN(num) || num < 11 || num > 85) return null;

    const quadrant = Math.floor(num / 10);
    const position = num % 10;

    return { quadrant, position };
}

/**
 * Prüft ob Zahn im Oberkiefer liegt
 */
export function isUpperJaw(tooth: string): boolean {
    const parsed = parseToothPosition(tooth);
    if (!parsed) return false;

    // Quadrant 1, 2 (Erwachsene) oder 5, 6 (Milchzähne) = Oberkiefer
    return [1, 2, 5, 6].includes(parsed.quadrant);
}

/**
 * Prüft ob Zahn im Unterkiefer-Seitenzahnbereich liegt (Position 5-8)
 */
export function isLowerMolar(tooth: string): boolean {
    const parsed = parseToothPosition(tooth);
    if (!parsed) return false;

    // Quadrant 3, 4 (UK) UND Position >= 5
    const isLowerJaw = [3, 4, 7, 8].includes(parsed.quadrant);
    const isMolar = parsed.position >= 5;

    return isLowerJaw && isMolar;
}

/**
 * Inferiert die empfohlene Anästhesiemethode basierend auf Zahnposition
 */
export function inferAnesthesia(tooth: string | undefined): AnesthesiaInference {
    if (!tooth) {
        return {
            recommended: 'infiltration',
            confidence: 0.5,
            reason: 'Kein Zahn angegeben - Standard: Infiltration'
        };
    }

    // Oberkiefer → Immer Infiltration
    if (isUpperJaw(tooth)) {
        return {
            recommended: 'infiltration',
            confidence: 0.95,
            reason: `Zahn ${tooth} (Oberkiefer) → Infiltrationsanästhesie`
        };
    }

    // Unterkiefer Seitenzähne → Leitung
    if (isLowerMolar(tooth)) {
        return {
            recommended: 'leitung',
            confidence: 0.9,
            reason: `Zahn ${tooth} (UK Seitenzahn) → Leitungsanästhesie N. alv. inf.`
        };
    }

    // Unterkiefer Front (31-34, 41-44) → Infiltration
    return {
        recommended: 'infiltration',
        confidence: 0.8,
        reason: `Zahn ${tooth} (UK Frontzahn) → Infiltrationsanästhesie möglich`
    };
}

/**
 * Gibt den passenden Chip-ID für die Anästhesie zurück
 */
export function getAnesthesiaChipId(tooth: string | undefined): string {
    const inference = inferAnesthesia(tooth);

    switch (inference.recommended) {
        case 'leitung':
            return 'la_leitung';
        case 'keine':
            return 'ohne_la';
        default:
            return 'la_infiltr';
    }
}

/**
 * Wählt automatisch die richtige Anästhesie wenn nur "Anästhesie" diktiert wurde
 */
export function resolveAnesthesiaFromDictation(
    dictation: string,
    tooth: string | undefined
): { chipId: string; explicit: boolean } {
    const lower = dictation.toLowerCase();

    // Explizit Leitungsanästhesie erwähnt
    if (lower.includes('leitung') || lower.includes('n. alv') || lower.includes('mandibul')) {
        return { chipId: 'la_leitung', explicit: true };
    }

    // Explizit Infiltration erwähnt
    if (lower.includes('infiltr') || lower.includes('terminal')) {
        return { chipId: 'la_infiltr', explicit: true };
    }

    // Explizit keine Anästhesie
    if (lower.includes('ohne anästh') || lower.includes('keine spritze') || lower.includes('ohne la')) {
        return { chipId: 'ohne_la', explicit: true };
    }

    // Nur "Anästhesie" oder "mit Spritze" erwähnt → Automatisch wählen
    if (lower.includes('anästh') || lower.includes('spritze') || lower.includes(' la ') || lower.includes('betäub')) {
        return { chipId: getAnesthesiaChipId(tooth), explicit: false };
    }

    // Gar keine Anästhesie erwähnt → Default basierend auf Zahn
    return { chipId: getAnesthesiaChipId(tooth), explicit: false };
}
