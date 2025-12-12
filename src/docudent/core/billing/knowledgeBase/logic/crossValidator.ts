/**
 * Cross Validator
 * 
 * Layer 3: Validiert ALLE Codes einer Sitzung gegen kombinationen.json.
 * Erkennt Duplikate, Ausschlüsse, Häufigkeitslimits.
 */

import type { SessionBilling, ConflictWarning, CollectedCode } from './sessionCollector';
import { getQuadrantFromTooth } from './sessionCollector';

// Import Regeln aus kombinationen.json
import kombinationsRegeln from '../regeln/kombinationen.json';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface KombinationsRegel {
    id: string;
    typ: 'ausschluss' | 'bedingung' | 'haeufigkeit' | 'dokumentation';
    titel: string;
    beschreibung: string;
    betrifft: string[];
    regel: {
        operator: string;
        bedingung?: string;
        wert?: number;
        zeitraum?: string;
        bezug?: string;
    };
    schweregrad: 'regress' | 'warnung' | 'info';
    quelle?: {
        dokument?: string;
        url?: string;
    };
}

export interface ValidationResult {
    valid: boolean;
    conflicts: ConflictWarning[];
    suggestions: string[];
    optimizedCodes: CollectedCode[];
}

// ═══════════════════════════════════════════════════════════════
// CROSS VALIDATOR CLASS
// ═══════════════════════════════════════════════════════════════

export class CrossValidator {
    private rules: KombinationsRegel[];

    constructor() {
        this.rules = kombinationsRegeln as unknown as KombinationsRegel[];
        console.log(`[CrossValidator] Loaded ${this.rules.length} combination rules`);
    }

    /**
     * Validiert eine komplette Sitzung
     */
    validate(session: SessionBilling): ValidationResult {
        const conflicts: ConflictWarning[] = [];
        const suggestions: string[] = [];

        // 1. Duplikate prüfen
        const duplicateConflicts = this.checkDuplicates(session.allCodes);
        conflicts.push(...duplicateConflicts);

        // 2. Ausschluss-Regeln prüfen
        const exclusionConflicts = this.checkExclusions(session.allCodes);
        conflicts.push(...exclusionConflicts);

        // 3. Häufigkeits-Regeln prüfen
        const frequencyConflicts = this.checkFrequency(session);
        conflicts.push(...frequencyConflicts);

        // 4. Optimierungsvorschläge generieren
        if (duplicateConflicts.length > 0) {
            suggestions.push('Duplikate entfernt - Anästhesie nur 1x pro Sitzung');
        }

        // 5. Optimierte Codes erstellen
        const optimizedCodes = this.optimizeCodes(session.allCodes, conflicts);

        return {
            valid: conflicts.filter(c => c.severity === 'regress').length === 0,
            conflicts,
            suggestions,
            optimizedCodes
        };
    }

    /**
     * Prüft auf Duplikate
     */
    private checkDuplicates(codes: CollectedCode[]): ConflictWarning[] {
        const conflicts: ConflictWarning[] = [];
        const codeMap = new Map<string, CollectedCode[]>();

        for (const code of codes) {
            const existing = codeMap.get(code.code) || [];
            existing.push(code);
            codeMap.set(code.code, existing);
        }

        for (const [codeId, instances] of codeMap) {
            if (instances.length > 1) {
                // Prüfe ob es erlaubte Duplikate sind (z.B. GOZ 2200 pro Pfeiler)
                if (this.isAllowedMultiple(codeId)) {
                    continue;
                }

                // Anästhesie-Duplikate sind typisch
                if (codeId.includes('0090') || codeId.includes('0100') ||
                    codeId.includes('40') || codeId.includes('41')) {
                    conflicts.push({
                        id: `dup_${codeId}`,
                        type: 'duplikat',
                        severity: 'warnung',
                        title: `${codeId} mehrfach`,
                        description: `Anästhesie nur 1x pro Sitzung abrechenbar`,
                        affectedCodes: [codeId],
                        suggestion: 'Nur einmal abrechnen'
                    });
                } else if (codeId.includes('12') || codeId.includes('2040')) {
                    // Kofferdam: 1x pro Kieferhälfte
                    conflicts.push({
                        id: `dup_kofferdam_${codeId}`,
                        type: 'haeufigkeit',
                        severity: 'warnung',
                        title: `Kofferdam mehrfach`,
                        description: `BEMA 12/GOZ 2040: Max 1x pro Kieferhälfte`,
                        affectedCodes: [codeId],
                        suggestion: 'Prüfen ob verschiedene Kieferhälften'
                    });
                }
            }
        }

        return conflicts;
    }

    /**
     * Prüft Ausschluss-Regeln aus kombinationen.json
     */
    private checkExclusions(codes: CollectedCode[]): ConflictWarning[] {
        const conflicts: ConflictWarning[] = [];
        const codeIds = codes.map(c => c.code);

        for (const regel of this.rules) {
            if (regel.typ !== 'ausschluss') continue;
            if (regel.regel.operator !== 'darf_nicht') continue;

            // Prüfe ob mehrere betroffene Codes gleichzeitig vorhanden
            const found = regel.betrifft.filter(b => codeIds.includes(b));
            if (found.length > 1) {
                conflicts.push({
                    id: `excl_${regel.id}`,
                    type: 'ausschluss',
                    severity: regel.schweregrad,
                    title: regel.titel,
                    description: regel.beschreibung,
                    affectedCodes: found,
                    suggestion: `Nur einer der Codes verwenden`
                });
            }
        }

        return conflicts;
    }

    /**
     * Prüft Häufigkeits-Regeln
     */
    private checkFrequency(session: SessionBilling): ConflictWarning[] {
        const conflicts: ConflictWarning[] = [];
        const codeIds = session.allCodes.map(c => c.code);

        for (const regel of this.rules) {
            if (regel.typ !== 'haeufigkeit') continue;

            for (const betrifft of regel.betrifft) {
                const occurrences = codeIds.filter(c => c === betrifft).length;
                const maxAllowed = regel.regel.wert || 1;

                if (occurrences > maxAllowed) {
                    // Check if it's per quadrant
                    if (regel.regel.bezug === 'pro_kieferhaelfte') {
                        // Need to validate per quadrant
                        const byQuadrant = this.countByQuadrant(session, betrifft);
                        for (const [quadrant, count] of byQuadrant) {
                            if (count > maxAllowed) {
                                conflicts.push({
                                    id: `freq_${regel.id}_q${quadrant}`,
                                    type: 'haeufigkeit',
                                    severity: regel.schweregrad,
                                    title: `${regel.titel} (Quadrant ${quadrant})`,
                                    description: regel.beschreibung,
                                    affectedCodes: [betrifft],
                                    suggestion: `Max ${maxAllowed}x pro Kieferhälfte`
                                });
                            }
                        }
                    } else if (regel.regel.bezug === 'pro_kanal') {
                        // Endo codes - allow per canal
                        continue;
                    } else {
                        conflicts.push({
                            id: `freq_${regel.id}`,
                            type: 'haeufigkeit',
                            severity: regel.schweregrad,
                            title: regel.titel,
                            description: regel.beschreibung,
                            affectedCodes: [betrifft],
                            suggestion: `Max ${maxAllowed}x pro Sitzung`
                        });
                    }
                }
            }
        }

        return conflicts;
    }

    /**
     * Zählt Code-Vorkommen pro Quadrant
     */
    private countByQuadrant(session: SessionBilling, code: string): Map<number, number> {
        const byQuadrant = new Map<number, number>();

        for (const treatment of session.treatments) {
            if (treatment.tooth) {
                const quadrant = getQuadrantFromTooth(treatment.tooth);
                for (const c of treatment.codes) {
                    if (c.code === code) {
                        const current = byQuadrant.get(quadrant) || 0;
                        byQuadrant.set(quadrant, current + 1);
                    }
                }
            }
        }

        return byQuadrant;
    }

    /**
     * Prüft ob Code mehrfach erlaubt ist
     */
    private isAllowedMultiple(code: string): boolean {
        // GOZ 2200 pro Pfeiler
        if (code === 'GOZ_2200') return true;
        // GOZ 2230 pro Brückenglied
        if (code === 'GOZ_2230') return true;
        // Endo-Codes pro Kanal
        if (code.match(/GOZ_23[9-]|GOZ_24[0-4]/)) return true;
        // FZ Codes
        if (code.startsWith('FZ_')) return true;

        return false;
    }

    /**
     * Optimiert Codes (entfernt Duplikate)
     */
    private optimizeCodes(codes: CollectedCode[], conflicts: ConflictWarning[]): CollectedCode[] {
        const duplicateCodes = new Set<string>();
        for (const conflict of conflicts) {
            if (conflict.type === 'duplikat') {
                conflict.affectedCodes.forEach(c => duplicateCodes.add(c));
            }
        }

        // Behalte nur erste Instanz von Duplikaten
        const seen = new Set<string>();
        const optimized: CollectedCode[] = [];

        for (const code of codes) {
            if (duplicateCodes.has(code.code)) {
                if (!seen.has(code.code)) {
                    seen.add(code.code);
                    optimized.push(code);
                }
            } else {
                optimized.push(code);
            }
        }

        return optimized;
    }

    /**
     * Schnelle Validierung nur für Ausschlüsse
     */
    quickCheckExclusions(codes: string[]): ConflictWarning[] {
        const mockCodes = codes.map(c => ({ code: c } as CollectedCode));
        return this.checkExclusions(mockCodes);
    }
}

// ═══════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════

let _validator: CrossValidator | null = null;

export function getCrossValidator(): CrossValidator {
    if (!_validator) {
        _validator = new CrossValidator();
    }
    return _validator;
}

// ═══════════════════════════════════════════════════════════════
// CONVENIENCE FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Schnelle Validierung einer Code-Liste
 */
export function validateCodes(codes: string[]): ConflictWarning[] {
    return getCrossValidator().quickCheckExclusions(codes);
}

/**
 * Validiert komplette Sitzung
 */
export function validateSession(session: SessionBilling): ValidationResult {
    return getCrossValidator().validate(session);
}

// ═══════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════

export default CrossValidator;
