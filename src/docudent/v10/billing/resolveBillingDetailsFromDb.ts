import { lookupBillingCatalogEntry } from './billingCatalog';

export interface BillingDetail {
    code: string;
    bezeichnung: string;
    punkte?: number;
    betrag?: number;
}

export function resolveBillingDetailsFromDb(codes: string[]): BillingDetail[] {
    const details: BillingDetail[] = [];

    for (const code of codes) {
        const info = lookupBillingCatalogEntry(code);
        if (info) {
            details.push({
                code,
                bezeichnung: info.bezeichnung ?? '',
                punkte: info.punkte,
                betrag: info.betrag_23,
            });
        } else {
            details.push({ code, bezeichnung: '' });
        }
    }

    return details;
}
