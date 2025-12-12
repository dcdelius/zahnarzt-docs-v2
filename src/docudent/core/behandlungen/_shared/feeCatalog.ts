/**
 * @deprecated DIESE DATEI IST OBSOLET!
 * 
 * Verwende stattdessen: lookupBillingCode() aus treatmentEngine.ts
 * Diese Datei wird in einer zukünftigen Version gelöscht.
 * 
 * Grund: Alle Code-Definitionen sind jetzt in:
 * - kataloge/bema.json
 * - kataloge/goz.json
 */

export interface FeeDefinition {
    code: string;
    label: string;
    description?: string;
    category?: 'anesthesia' | 'filling' | 'procedure' | 'diagnostic' | 'prophylaxis' | 'surgery';
    isStandard?: boolean; // Always included in this treatment type
}

export const FEE_CATALOG: Record<string, FeeDefinition> = {
    // ==========================================
    // BEMA (GKV)
    // ==========================================

    // Diagnostik
    'BEMA_01': { code: 'BEMA 01', label: 'U', category: 'diagnostic' },
    'BEMA_Ä1': { code: 'BEMA Ä1', label: 'Beratung', category: 'diagnostic' },
    'BEMA_04': { code: 'BEMA 04', label: 'PSI', category: 'diagnostic' },
    'BEMA_VIPR': { code: 'BEMA ViPr', label: 'Sensibilitätsprüfung', category: 'diagnostic' },
    'BEMA_RÖ': { code: 'BEMA Ä925a', label: 'Röntgen', category: 'diagnostic' },
    'BEMA_925A': { code: 'BEMA Ä925a', label: 'Röntgen', category: 'diagnostic' },

    // Anästhesie
    'BEMA_40': { code: 'BEMA 40', label: 'Infiltrationsanästhesie', category: 'anesthesia' },
    'BEMA_41': { code: 'BEMA 41a', label: 'Leitungsanästhesie (intraoral)', category: 'anesthesia' },

    // Füllung - bMF (besondere Maßnahmen)
    'BEMA_12': { code: 'BEMA 12', label: 'bMF (Kofferdam/Speichelkontrolle)', category: 'procedure' },

    // Füllung - F-Codes nach Flächenzahl
    'BEMA_13': { code: 'BEMA 13', label: 'F1 (Einflächig)', category: 'filling' },
    'BEMA_13b': { code: 'BEMA 13b', label: 'F2 (Zweiflächig)', category: 'filling' },
    'BEMA_13c': { code: 'BEMA 13c', label: 'F3 (Dreiflächig)', category: 'filling' },
    'BEMA_13d': { code: 'BEMA 13d', label: 'F4 (Mehr als 3 Flächen)', category: 'filling' },

    // Überkappung
    'BEMA_CP': { code: 'BEMA 25', label: 'Cp (Indirekte Überkappung)', category: 'procedure' },
    'BEMA_P': { code: 'BEMA 26', label: 'P (Direkte Überkappung)', category: 'procedure' },

    // Prophylaxe
    'BEMA_IP4': { code: 'BEMA IP4', label: 'Fluoridierung', category: 'prophylaxis' },

    // Chirurgie
    'BEMA_104': { code: 'BEMA 104', label: 'Naht / Wundversorgung', category: 'surgery' },
    'BEMA_199': { code: 'BEMA 199', label: 'Kofferdam (selten)', category: 'procedure' },

    // ==========================================
    // GOZ (PKV)
    // ==========================================

    // Diagnostik
    'GOZ_Ä1': { code: 'GOZ Ä1', label: 'Beratung', category: 'diagnostic' },
    'GOZ_0010': { code: 'GOZ 0010', label: 'Eingehende Untersuchung', category: 'diagnostic' },
    'GOZ_5000': { code: 'GOZ 5000', label: 'Röntgen (Zahnfilm)', category: 'diagnostic' },
    'GOZ_8000': { code: 'GOZ 8000', label: 'Funktionsanalyse', category: 'diagnostic' },

    // Anästhesie
    'GOZ_0080': { code: 'GOZ 0080', label: 'Oberflächenanästhesie', category: 'anesthesia' },
    'GOZ_0090': { code: 'GOZ 0090', label: 'Infiltrationsanästhesie', category: 'anesthesia' },
    'GOZ_0100': { code: 'GOZ 0100', label: 'Leitungsanästhesie', category: 'anesthesia' },


    // Füllung - Procedure (GOZ 2060 is in F-Codes section)
    'GOZ_2030': { code: 'GOZ 2030', label: 'bMF (Besondere Maßnahmen)', category: 'procedure' },
    'GOZ_2040': { code: 'GOZ 2040', label: 'Kofferdam', category: 'procedure' },
    'GOZ_2050': { code: 'GOZ 2050', label: 'Unterfüllung', category: 'procedure' },
    'GOZ_2197': { code: 'GOZ 2197', label: 'Adhäsivtechnik', category: 'procedure' },

    // Füllung - F-Codes nach Flächenzahl (inkl. Adhäsiv/Schichttechnik)
    'GOZ_2060': { code: 'GOZ 2060', label: 'Kompositfüllung 1-flächig', category: 'filling' },
    'GOZ_2080': { code: 'GOZ 2080', label: 'Kompositfüllung 2-flächig', category: 'filling' },
    'GOZ_2100': { code: 'GOZ 2100', label: 'Kompositfüllung 3-flächig', category: 'filling' },
    'GOZ_2120': { code: 'GOZ 2120', label: 'Kompositfüllung 4+ flächig', category: 'filling' },

    // Überkappung
    'GOZ_2330': { code: 'GOZ 2330', label: 'Cp (Indirekte Überkappung)', category: 'procedure' },
    'GOZ_2340': { code: 'GOZ 2340', label: 'P (Direkte Überkappung)', category: 'procedure' },

    // Prophylaxe
    'GOZ_1020': { code: 'GOZ 1020', label: 'Lokale Fluoridierung', category: 'prophylaxis' },
    'GOZ_1040': { code: 'GOZ 1040', label: 'PZR', category: 'prophylaxis' },

    // Endo
    'GOZ_2400': { code: 'GOZ 2400', label: 'Maschinelle Aufbereitung', category: 'procedure' },
    'GOZ_2410': { code: 'GOZ 2410', label: 'Endometrie', category: 'procedure' },

    // Chirurgie
    'GOZ_3100': { code: 'GOZ 3100', label: 'Knochenchirurgie', category: 'surgery' },
    'GOZ_3310': { code: 'GOZ 3310', label: 'Naht/Wundverschluss', category: 'surgery' },

    // Analog-Positionen
    'GOZ_ANALOG_MATRIX': { code: 'GOZ 2030a', label: 'Matrizensystem (Analog)', category: 'procedure' },
    'GOZ_ANALOG_DETECTOR': { code: 'GOZ 2030a', label: 'Kariesdetektor (Analog)', category: 'diagnostic' },

    // Kariesdetektor - separate Analogposition (häufig GOZ 2020 x2,0)
    'GOZ_2020_ANALOG': {
        code: 'GOZ 2020a',
        label: 'Kariesdetektor (Analog)',
        description: 'Kariesanfärbung - Analogposition gem. § 6 Abs. 1 GOZ',
        category: 'diagnostic'
    },
};

// Helper to get code for insurance type
export function getCodeForInsurance(refId: string, insuranceType: 'GKV' | 'PKV'): FeeDefinition | undefined {
    const def = FEE_CATALOG[refId];
    if (!def) return undefined;

    // Check if matches insurance type
    if (insuranceType === 'GKV' && def.code.startsWith('BEMA')) return def;
    if (insuranceType === 'PKV' && def.code.startsWith('GOZ')) return def;

    return undefined;
}
