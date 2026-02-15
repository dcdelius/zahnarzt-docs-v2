/**
 * Billing Knowledge Base - Main Export
 * Supersmart Abrechnungs-Wissensdatenbank
 */

import type {
    BillingCode,
    BillingRule,
    BillingTip,
    BillingCase,
    BillingContext,
    KnowledgeBase,
    BillingCategory
} from './schema';

// Import JSON data
import bemaKatalog from './kataloge/bema.json';
import gozKatalog from './kataloge/goz.json';
import kombinationsRegeln from './regeln/kombinationen.json';
import optimierungsTipps from './optimierung/tipps.json';

// ═══════════════════════════════════════════════════════════════
// KNOWLEDGE BASE SINGLETON
// ═══════════════════════════════════════════════════════════════

export const knowledgeBase: KnowledgeBase = {
    kataloge: {
        bema: bemaKatalog as unknown as Record<string, BillingCode>,
        goz: gozKatalog as unknown as Record<string, BillingCode>,
        punktwert: {
            bema: 1.0375,  // Stand 01.01.2025
            stand: '2025-01-01'
        }
    },
    regeln: kombinationsRegeln as unknown as BillingRule[],
    tipps: optimierungsTipps as unknown as BillingTip[],
    faelle: []  // TODO: Add case examples
};

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get billing code by ID
 */
export function getCode(id: string): BillingCode | undefined {
    if (id.startsWith('BEMA')) {
        return knowledgeBase.kataloge.bema[id];
    } else if (id.startsWith('GOZ')) {
        return knowledgeBase.kataloge.goz[id];
    }
    return undefined;
}

/**
 * Get all codes for a category
 */
export function getCodesByCategory(
    category: BillingCategory,
    system?: 'BEMA' | 'GOZ'
): BillingCode[] {
    const codes: BillingCode[] = [];

    if (!system || system === 'BEMA') {
        Object.values(knowledgeBase.kataloge.bema).forEach(code => {
            if (code.kategorie === category) codes.push(code);
        });
    }

    if (!system || system === 'GOZ') {
        Object.values(knowledgeBase.kataloge.goz).forEach(code => {
            if (code.kategorie === category) codes.push(code);
        });
    }

    return codes;
}

/**
 * Get rules that apply to specific codes
 */
export function getRulesForCodes(codeIds: string[]): BillingRule[] {
    return knowledgeBase.regeln.filter(regel =>
        regel.betrifft.some(id => codeIds.includes(id))
    );
}

/**
 * Get tips for a treatment category
 */
export function getTipsForCategory(
    category: BillingCategory,
    versicherung?: 'GKV' | 'PKV' | 'MKV'
): BillingTip[] {
    return knowledgeBase.tipps.filter(tipp => {
        const categoryMatch = tipp.kategorie === category || category === 'sonstiges';
        const versicherungMatch = !versicherung ||
            tipp.versicherung === versicherung ||
            tipp.versicherung === 'alle';
        return categoryMatch && versicherungMatch;
    });
}

/**
 * Search knowledge base by keyword
 */
export function searchKnowledge(query: string): {
    codes: BillingCode[];
    regeln: BillingRule[];
    tipps: BillingTip[];
} {
    const q = query.toLowerCase();

    const codes: BillingCode[] = [];
    Object.values(knowledgeBase.kataloge.bema).forEach(code => {
        if (code.bezeichnung.toLowerCase().includes(q) ||
            code.nummer.toLowerCase().includes(q)) {
            codes.push(code);
        }
    });
    Object.values(knowledgeBase.kataloge.goz).forEach(code => {
        if (code.bezeichnung.toLowerCase().includes(q) ||
            code.nummer.toLowerCase().includes(q)) {
            codes.push(code);
        }
    });

    const regeln = knowledgeBase.regeln.filter(r =>
        r.titel.toLowerCase().includes(q) ||
        r.beschreibung.toLowerCase().includes(q)
    );

    const tipps = knowledgeBase.tipps.filter(t =>
        t.titel.toLowerCase().includes(q) ||
        t.beschreibung.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.includes(q))
    );

    return { codes, regeln, tipps };
}

/**
 * Build context for LLM based on treatment
 */
export function buildBillingContext(
    behandlungsart: string,
    versicherung: 'GKV' | 'PKV',
    aktuelleCodeIds: string[] = []
): BillingContext {
    // Map behandlungsart to category
    const categoryMap: Record<string, BillingCategory> = {
        'fuellung': 'konservierend',
        'wurzelbehandlung': 'endodontie',
        'endo': 'endodontie',
        'extraktion': 'chirurgie',
        'osteotomie': 'chirurgie',
        'wsr': 'chirurgie',
        'pzr': 'prophylaxe',
        'prophylaxe': 'prophylaxe',
        'krone': 'prothetik',
        'bruecke': 'prothetik',
        'prothese': 'prothetik'
    };

    const category = categoryMap[behandlungsart.toLowerCase()] || 'konservierend';

    // Get relevant codes
    const relevanteCodes = getCodesByCategory(category, versicherung === 'GKV' ? 'BEMA' : 'GOZ');

    // Add anesthesia codes
    relevanteCodes.push(...getCodesByCategory('anaesthesie', versicherung === 'GKV' ? 'BEMA' : 'GOZ'));

    // Get relevant rules
    const allCodeIds = [...aktuelleCodeIds, ...relevanteCodes.map(c => c.id)];
    const relevanteRegeln = getRulesForCodes(allCodeIds);

    // Get relevant tips
    const relevanteTipps = getTipsForCategory(category, versicherung);

    return {
        behandlungsart,
        versicherung,
        relevanteCodes,
        relevanteRegeln,
        relevanteTipps,
        relevanteFaelle: []  // TODO
    };
}

/**
 * Format context for LLM prompt
 */
export function formatContextForLLM(context: BillingContext): string {
    let output = '';

    output += `═══════════════════════════════════════\n`;
    output += `ABRECHNUNGSKATALOG (${context.versicherung})\n`;
    output += `═══════════════════════════════════════\n`;
    context.relevanteCodes.slice(0, 20).forEach(code => {
        if (code.system === 'BEMA') {
            output += `${code.id}: ${code.bezeichnung} (${code.punkte} Pkt)\n`;
        } else {
            output += `${code.id}: ${code.bezeichnung} (${code.honorar?.standard}€)\n`;
        }
    });

    output += `\n═══════════════════════════════════════\n`;
    output += `WICHTIGE REGELN\n`;
    output += `═══════════════════════════════════════\n`;
    context.relevanteRegeln.forEach(regel => {
        output += `[${regel.schweregrad.toUpperCase()}] ${regel.titel}\n`;
        output += `  → ${regel.beschreibung}\n`;
    });

    output += `\n═══════════════════════════════════════\n`;
    output += `OPTIMIERUNGSTIPPS\n`;
    output += `═══════════════════════════════════════\n`;
    context.relevanteTipps.forEach(tipp => {
        output += `💡 ${tipp.titel}\n`;
        output += `  → ${tipp.strategie}\n`;
        if (tipp.beispiel?.differenz) {
            output += `  → Mehrerlös: ${tipp.beispiel.differenz}\n`;
        }
    });

    return output;
}

// ═══════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════

export interface ValidationResult {
    valid: boolean;
    errors: { regel: string; message: string }[];
    warnings: { regel: string; message: string }[];
    tipps: BillingTip[];
}

/**
 * Validate billing codes against rules
 */
export function validateBilling(
    codes: string[],
    dokumentation: string,
    versicherung: 'GKV' | 'PKV'
): ValidationResult {
    const errors: { regel: string; message: string }[] = [];
    const warnings: { regel: string; message: string }[] = [];

    // Get applicable rules
    const regeln = getRulesForCodes(codes);

    for (const regel of regeln) {
        // Check BEMA 12 Kofferdam rule
        if (regel.id === 'regel_bema12_nur_kofferdam' && codes.includes('BEMA_12')) {
            const hasKofferdam = dokumentation.toLowerCase().includes('kofferdam') ||
                dokumentation.toLowerCase().includes('spanngummi');
            const hasBlutstillung = dokumentation.toLowerCase().includes('blutstillung');

            if (!hasKofferdam && !hasBlutstillung) {
                errors.push({
                    regel: regel.id,
                    message: 'BEMA 12 abgerechnet, aber Kofferdam/Blutstillung nicht dokumentiert!'
                });
            }
        }

        // Check Cp rule
        if (regel.id === 'regel_bema25_tiefe_karies' && codes.includes('BEMA_25')) {
            const hasTiefeKaries = dokumentation.toLowerCase().includes('profunda') ||
                dokumentation.toLowerCase().includes('pulpanah');
            const hasMaterial = dokumentation.toLowerCase().includes('ca(oh)') ||
                dokumentation.toLowerCase().includes('calciumhydroxid') ||
                dokumentation.toLowerCase().includes('mta');

            if (!hasTiefeKaries) {
                warnings.push({
                    regel: regel.id,
                    message: 'Cp abgerechnet - Diagnose "Caries profunda" nicht gefunden'
                });
            }
            if (!hasMaterial) {
                warnings.push({
                    regel: regel.id,
                    message: 'Cp abgerechnet - Überkappungsmaterial nicht dokumentiert'
                });
            }
        }

        // Add more rule checks as needed...
    }

    // Get relevant tips
    const tipps = knowledgeBase.tipps.filter(t =>
        t.versicherung === versicherung || t.versicherung === 'alle'
    ).slice(0, 5);

    return {
        valid: errors.length === 0,
        errors,
        warnings,
        tipps
    };
}

// Export types
export type {
    BillingCode,
    BillingRule,
    BillingTip,
    BillingCase,
    BillingContext,
    KnowledgeBase,
    BillingCategory
} from './schema';

// Export modular billing registry
export {
    registerBillingModule,
    getBillingModule,
    findModuleForData,
    inferBillingV2,
    getAllModules
} from './logic/billingRegistry';
export type {
    TreatmentBillingModule,
    BillingInferenceResult as ModularBillingResult,
    BillingContext as ModularBillingContext
} from './logic/billingRegistry';

// Auto-register all modules
import './logic/modules';

// Export new database-first architecture (Phase 1)
export { BillingDatabase } from './logic/billingDatabase';
export type { BillingCodeEntry, TreatmentCatalog, TreatmentPhase } from './logic/billingDatabase';
export { TreatmentLoader } from './logic/treatmentLoader';

// Export cross-validation (Phase 3)
export { SessionCollector, toCollectedCode, getQuadrantFromTooth } from './logic/sessionCollector';
export type { SessionBilling, TreatmentResult, CollectedCode, ConflictWarning } from './logic/sessionCollector';
export { CrossValidator, getCrossValidator, validateCodes, validateSession } from './logic/crossValidator';
export type { ValidationResult as CrossValidationResult } from './logic/crossValidator';


