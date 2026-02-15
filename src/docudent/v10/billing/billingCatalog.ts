import bemaCatalog from '@/docudent/core/billing/billing_db/catalogs/bema.json';
import goaeCatalog from '@/docudent/core/billing/billing_db/catalogs/goa.json';
import gozCatalog from '@/docudent/core/billing/billing_db/catalogs/goz.json';

export interface BillingCatalogEntry {
    code: string;
    bezeichnung: string;
    punkte?: number;
    betrag_23?: number;
    dokumentation_erforderlich?: string[];
    regressfalle?: string;
}

export function lookupBillingCatalogEntry(codeId: string): BillingCatalogEntry | null {
    if (codeId.startsWith('BEMA_')) {
        const entry = (bemaCatalog as Record<string, any>)[codeId];
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
        const entry = (goaeCatalog as Record<string, any>)[normalizedId];
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

    return null;
}
