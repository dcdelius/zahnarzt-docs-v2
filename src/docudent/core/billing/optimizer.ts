/**
 * Billing Optimizer Service
 * Uses Knowledge Base + LLM for smart billing optimization
 */

import { buildBillingContext, formatContextForLLM, validateBilling } from './knowledgeBase';
import type { BillingTip, ValidationResult } from './knowledgeBase';

export interface OptimizationRequest {
    behandlungsart: string;
    versicherung: 'GKV' | 'PKV';
    dokumentation: string;
    aktuelleCodes: string[];
    zahnNummer?: string;
}

export interface OptimizationResult {
    validation: ValidationResult;
    optimierterOutput?: string;
    aenderungen: {
        typ: 'code_hinzugefuegt' | 'code_entfernt' | 'text_geaendert' | 'tipp';
        original?: string;
        neu?: string;
        grund: string;
        mehrerloes?: string;
    }[];
    gesamtPotential?: string;
    llmUsed: boolean;
}

/**
 * Run billing check without LLM (rule-based only)
 */
export function runRuleBasedCheck(request: OptimizationRequest): OptimizationResult {
    // Validate against rules
    const validation = validateBilling(
        request.aktuelleCodes,
        request.dokumentation,
        request.versicherung
    );

    const aenderungen: OptimizationResult['aenderungen'] = [];

    // Convert errors to changes
    validation.errors.forEach(err => {
        aenderungen.push({
            typ: 'code_entfernt',
            grund: err.message
        });
    });

    // Convert warnings to changes
    validation.warnings.forEach(warn => {
        aenderungen.push({
            typ: 'text_geaendert',
            grund: warn.message
        });
    });

    // Add tips as suggestions
    validation.tipps.forEach(tipp => {
        aenderungen.push({
            typ: 'tipp',
            neu: tipp.strategie,
            grund: tipp.titel,
            mehrerloes: tipp.beispiel?.differenz
        });
    });

    return {
        validation,
        aenderungen,
        llmUsed: false
    };
}

/**
 * Build LLM prompt for billing optimization
 */
export function buildOptimizerPrompt(request: OptimizationRequest): string {
    const context = buildBillingContext(
        request.behandlungsart,
        request.versicherung,
        request.aktuelleCodes
    );

    const contextText = formatContextForLLM(context);

    return `Du bist ein erfahrener Abrechnungsberater für Zahnarztpraxen.
Du arbeitest AUSSCHLIESSLICH auf Basis der folgenden Wissensdatenbank.
Du erfindest NICHTS und rätst NICHT. Wenn du dir unsicher bist, sagst du es.

${contextText}

═══════════════════════════════════════
ZU PRÜFENDER FALL
═══════════════════════════════════════
Behandlungsart: ${request.behandlungsart}
Patient: ${request.versicherung}
Zahn: ${request.zahnNummer || 'nicht angegeben'}
Aktuelle Codes: ${request.aktuelleCodes.join(', ')}

DOKUMENTATION:
${request.dokumentation}

═══════════════════════════════════════
AUFGABE
═══════════════════════════════════════
1. Prüfe ob alle Codes korrekt sind (Regeln beachten!)
2. Identifiziere fehlende Codes die berechnet werden könnten
3. Prüfe die Dokumentation auf Vollständigkeit
4. Gib konkrete Optimierungsvorschläge mit Eurobeträgen

Antworte im JSON-Format:
{
  "status": "ok" | "warnung" | "fehler",
  "probleme": [
    { "code": "...", "problem": "...", "loesung": "..." }
  ],
  "fehlendeCodes": [
    { "code": "...", "grund": "...", "betrag": "..." }
  ],
  "dokumentationHinweise": [
    "..."
  ],
  "optimierterText": "Falls Textverbesserungen nötig, hier der verbesserte Dokumentationstext",
  "gesamtMehrerloes": "Geschätzter Mehrerlös durch Optimierungen"
}`;
}

/**
 * Run full optimization with LLM (to be called with actual LLM)
 */
export async function runLLMOptimization(
    request: OptimizationRequest,
    llmCall: (prompt: string) => Promise<string>
): Promise<OptimizationResult> {
    // First run rule-based check
    const ruleResult = runRuleBasedCheck(request);

    // If there are errors, return without LLM (must fix first)
    if (!ruleResult.validation.valid) {
        return ruleResult;
    }

    try {
        // Build and send prompt
        const prompt = buildOptimizerPrompt(request);
        const llmResponse = await llmCall(prompt);

        // Parse LLM response
        const parsed = JSON.parse(llmResponse);

        const aenderungen: OptimizationResult['aenderungen'] = [...ruleResult.aenderungen];

        // Add missing codes
        if (parsed.fehlendeCodes) {
            parsed.fehlendeCodes.forEach((fc: { code: string; grund: string; betrag?: string }) => {
                aenderungen.push({
                    typ: 'code_hinzugefuegt',
                    neu: fc.code,
                    grund: fc.grund,
                    mehrerloes: fc.betrag
                });
            });
        }

        // Add documentation hints
        if (parsed.dokumentationHinweise) {
            parsed.dokumentationHinweise.forEach((hint: string) => {
                aenderungen.push({
                    typ: 'text_geaendert',
                    grund: hint
                });
            });
        }

        return {
            validation: ruleResult.validation,
            optimierterOutput: parsed.optimierterText,
            aenderungen,
            gesamtPotential: parsed.gesamtMehrerloes,
            llmUsed: true
        };
    } catch (error) {
        console.error('LLM optimization failed:', error);
        // Fall back to rule-based
        return ruleResult;
    }
}

/**
 * Quick tips based on current codes (no LLM)
 */
export function getQuickTips(
    codes: string[],
    versicherung: 'GKV' | 'PKV'
): BillingTip[] {
    const { tipps } = validateBilling(codes, '', versicherung);
    return tipps;
}
