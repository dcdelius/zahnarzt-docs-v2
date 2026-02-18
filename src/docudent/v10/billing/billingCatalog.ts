import bemaCatalog from '@/docudent/core/billing/billing_db/catalogs/bema.json';
import goaeCatalog from '@/docudent/core/billing/billing_db/catalogs/goa.json';
import gozCatalog from '@/docudent/core/billing/billing_db/catalogs/goz.json';
import belCatalog from '@/docudent/core/billing/billing_db/catalogs/bel2_2022.json';

export interface BillingCatalogEntry {
    code: string;
    bezeichnung: string;
    punkte?: number;
    betrag_23?: number;
    dokumentation_erforderlich?: string[];
    regressfalle?: string;
}

function getCatalogRecordByKey(catalog: Record<string, any>, codeId: string): any | null {
    const direct = catalog[codeId];
    if (direct) return direct;

    // BEMA variants in source catalog are not fully normalized (e.g. Ae/ä forms).
    const variants = new Set<string>([
        codeId,
        codeId.replace('Ä', 'Ae'),
        codeId.replace('ä', 'ae'),
        codeId.replace('AE', 'Ae'),
        codeId.replace('_Ä', '_ä'),
        codeId.replace('_Ä', '_Ae'),
    ]);
    for (const key of variants) {
        if (catalog[key]) return catalog[key];
    }

    const lowered = codeId.toLowerCase();
    const caseInsensitiveKey = Object.keys(catalog).find(key => key.toLowerCase() === lowered);
    if (caseInsensitiveKey && catalog[caseInsensitiveKey]) {
        return catalog[caseInsensitiveKey];
    }

    // Legacy BEMA umbrella entries may be emitted without letter suffix
    // (e.g. BEMA_100 while catalog stores 100a..100f).
    const bemaNumeric = codeId.match(/^BEMA_(\d{2,4})$/);
    if (bemaNumeric) {
        const familyPrefix = `BEMA_${bemaNumeric[1]}`.toLowerCase();
        const familyMatches = Object.keys(catalog)
            .filter(key => key.toLowerCase().startsWith(familyPrefix))
            .sort((a, b) => a.localeCompare(b));
        if (familyMatches.length > 0) {
            return catalog[familyMatches[0]];
        }
    }
    return null;
}

function lookupBelEntry(codeId: string): any | null {
    const catalog = belCatalog as Record<string, any>;
    const direct = catalog[codeId];
    if (direct) return direct;

    const entries = Array.isArray(catalog.entries) ? catalog.entries : [];
    return entries.find((entry: any) =>
        entry?.codeId === codeId
        || `BEL_${entry?.code}` === codeId
    ) ?? null;
}

export function lookupBillingCatalogEntry(codeId: string): BillingCatalogEntry | null {
    if (codeId.startsWith('BEMA_')) {
        const entry = getCatalogRecordByKey(bemaCatalog as Record<string, any>, codeId);
        if (entry) {
            return {
                code: entry.nummer || codeId.replace('BEMA_', ''),
                bezeichnung: entry.bezeichnung || entry.kurzform || '',
                punkte: entry.punkte,
                dokumentation_erforderlich: entry.dokumentation_erforderlich,
                regressfalle: entry.regressfalle,
            };
        }
    }

    if (codeId.startsWith('GOZ_')) {
        const entry = (gozCatalog as Record<string, any>)[codeId];
        if (entry) {
            const betrag = entry.honorar?.standard || entry.betrag_23;
            return {
                code: entry.nummer || codeId.replace('GOZ_', ''),
                bezeichnung: entry.bezeichnung || '',
                betrag_23: betrag,
                dokumentation_erforderlich: entry.dokumentation_erforderlich,
            };
        }
    }

    if (codeId.startsWith('GOÄ_') || codeId.startsWith('GOAE_')) {
        const normalizedId = codeId.startsWith('GOAE_')
            ? codeId.replace('GOAE_', 'GOÄ_')
            : codeId;
        const entry = getCatalogRecordByKey(goaeCatalog as Record<string, any>, normalizedId);
        if (entry) {
            const betrag = entry.honorar?.standard || entry.betrag_23;
            return {
                code: entry.nummer || normalizedId.replace('GOÄ_', ''),
                bezeichnung: entry.bezeichnung || '',
                betrag_23: betrag,
                dokumentation_erforderlich: entry.dokumentation_erforderlich,
            };
        }
    }

    if (codeId.startsWith('BEL_')) {
        const entry = lookupBelEntry(codeId);
        if (entry) {
            return {
                code: entry.code || entry.nummer || codeId.replace('BEL_', ''),
                bezeichnung: entry.leistungsinhalt || entry.kurztext || entry.bezeichnung || '',
            };
        }
    }

    return null;
}

export function hasBillingCatalogEntry(codeId: string): boolean {
    return lookupBillingCatalogEntry(codeId) !== null;
}
