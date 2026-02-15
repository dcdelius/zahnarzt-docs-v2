/**
 * Session Collector
 * 
 * Sammelt alle Billing-Codes einer Sitzung aus mehreren Behandlungen.
 * Ermöglicht Cross-Validation über alle Codes hinweg.
 */

import type { BillingCodeEntry } from './billingDatabase';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface TreatmentResult {
    treatmentId: string;     // z.B. "fuellung", "krone"
    tooth?: string;          // z.B. "36"
    quadrant?: number;       // 1-4
    codes: CollectedCode[];
}

export interface CollectedCode {
    code: string;
    label: string;
    source: string;          // "fuellung_36", "krone_16"
    type: 'bema' | 'goz' | 'festzuschuss';
    betrag?: number;
    anzahl: number;
}

export interface SessionBilling {
    sessionId: string;
    date: Date;
    treatments: TreatmentResult[];
    allCodes: CollectedCode[];
    validated: boolean;
    conflicts: ConflictWarning[];
}

export interface ConflictWarning {
    id: string;
    type: 'duplikat' | 'ausschluss' | 'haeufigkeit' | 'dokumentation';
    severity: 'regress' | 'warnung' | 'info';
    title: string;
    description: string;
    affectedCodes: string[];
    suggestion?: string;
}

// ═══════════════════════════════════════════════════════════════
// SESSION COLLECTOR CLASS
// ═══════════════════════════════════════════════════════════════

export class SessionCollector {
    private sessionId: string;
    private treatments: TreatmentResult[] = [];

    constructor(sessionId?: string) {
        this.sessionId = sessionId || `session_${Date.now()}`;
    }

    /**
     * Fügt eine Behandlung zur Sitzung hinzu
     */
    addTreatment(result: TreatmentResult): void {
        this.treatments.push(result);
        console.log(`[SessionCollector] Added: ${result.treatmentId} (${result.codes.length} codes)`);
    }

    /**
     * Holt alle gesammelten Codes
     */
    getAllCodes(): CollectedCode[] {
        const allCodes: CollectedCode[] = [];
        for (const treatment of this.treatments) {
            allCodes.push(...treatment.codes);
        }
        return allCodes;
    }

    /**
     * Zählt Code-Vorkommen
     */
    getCodeCounts(): Map<string, number> {
        const counts = new Map<string, number>();
        for (const code of this.getAllCodes()) {
            const current = counts.get(code.code) || 0;
            counts.set(code.code, current + code.anzahl);
        }
        return counts;
    }

    /**
     * Findet Duplikate
     */
    findDuplicates(): CollectedCode[][] {
        const codeMap = new Map<string, CollectedCode[]>();

        for (const code of this.getAllCodes()) {
            const existing = codeMap.get(code.code) || [];
            existing.push(code);
            codeMap.set(code.code, existing);
        }

        // Nur Codes mit mehrfachem Vorkommen
        const duplicates: CollectedCode[][] = [];
        for (const [, codes] of codeMap) {
            if (codes.length > 1) {
                duplicates.push(codes);
            }
        }

        return duplicates;
    }

    /**
     * Gruppiert Codes nach Quadrant
     */
    getCodesByQuadrant(): Map<number, CollectedCode[]> {
        const byQuadrant = new Map<number, CollectedCode[]>();

        for (const treatment of this.treatments) {
            if (treatment.quadrant) {
                const existing = byQuadrant.get(treatment.quadrant) || [];
                existing.push(...treatment.codes);
                byQuadrant.set(treatment.quadrant, existing);
            }
        }

        return byQuadrant;
    }

    /**
     * Erstellt SessionBilling Objekt
     */
    buildSession(): SessionBilling {
        return {
            sessionId: this.sessionId,
            date: new Date(),
            treatments: this.treatments,
            allCodes: this.getAllCodes(),
            validated: false,
            conflicts: []
        };
    }

    /**
     * Reset für neue Sitzung
     */
    reset(): void {
        this.treatments = [];
        this.sessionId = `session_${Date.now()}`;
    }

    /**
     * Getter für Treatments
     */
    getTreatments(): TreatmentResult[] {
        return this.treatments;
    }
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Erstellt CollectedCode aus BillingCodeEntry
 */
export function toCollectedCode(
    entry: BillingCodeEntry,
    source: string,
    anzahl: number = 1
): CollectedCode {
    const type = entry.code.startsWith('BEMA') ? 'bema' :
        entry.code.startsWith('GOZ') ? 'goz' :
            entry.code.startsWith('FZ') ? 'festzuschuss' : 'bema';

    return {
        code: entry.code,
        label: entry.bezeichnung,
        source,
        type,
        betrag: entry.betrag_23 || (entry.punkte ? entry.punkte * 1.04 : undefined),
        anzahl
    };
}

/**
 * Extrahiert Quadrant aus Zahnnummer
 */
export function getQuadrantFromTooth(tooth: string): number {
    const num = parseInt(tooth, 10);
    if (num >= 11 && num <= 18) return 1;
    if (num >= 21 && num <= 28) return 2;
    if (num >= 31 && num <= 38) return 3;
    if (num >= 41 && num <= 48) return 4;
    return 0;
}

/**
 * Prüft ob zwei Zähne im selben Quadranten sind
 */
export function isSameQuadrant(tooth1: string, tooth2: string): boolean {
    return getQuadrantFromTooth(tooth1) === getQuadrantFromTooth(tooth2);
}

// ═══════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════

export default SessionCollector;
