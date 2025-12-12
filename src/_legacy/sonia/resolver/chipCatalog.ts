// chipCatalog.ts
// Defines the patch logic for each standard chip.

export interface ChipDefinition {
    id: string;
    label: string;
    patch: Record<string, any>; // Deep partial of CaseState.data
    textSnippet: string; // Exact text to inject
    billingRefs?: string[]; // Billing codes
}

export const CHIP_CATALOG: Record<string, ChipDefinition> = {
    'chip_surface_anesthesia': {
        id: 'chip_surface_anesthesia',
        label: 'Oberflächenanästhesie',
        patch: { anesthesia: 'Oberflächenanästhesie' },
        textSnippet: 'Oberflächenanästhesie zur Vorbereitung appliziert.',
        billingRefs: ['GOZ_0080']
    },
    'chip_relative_isolation': {
        id: 'chip_relative_isolation',
        label: 'Relative Trockenlegung',
        patch: { isolation: 'Relative Trockenlegung' },
        textSnippet: 'Relative Trockenlegung mittels Watterollen und Speichelzieher.',
        billingRefs: []
    },
    'chip_kofferdam': {
        id: 'chip_kofferdam',
        label: 'Kofferdam',
        patch: { isolation: 'Kofferdam', kofferdam: true },
        textSnippet: 'Absolute Trockenlegung mittels Kofferdam.',
        billingRefs: ['BEMA_12', 'GOZ_2040']
    },
    'chip_adhesive': {
        id: 'chip_adhesive',
        label: 'Adhäsivtechnik',
        patch: { conditioning: 'Total-Etch mit OptiBond' },
        textSnippet: 'Adhäsive Vorbehandlung in Total-Etch-Technik mit OptiBond FL.',
        billingRefs: ['GOZ_2197', 'BEMA_13d']
    },
    'chip_layering': {
        id: 'chip_layering',
        label: 'Mehrschicht-Technik',
        patch: { technique: 'Schichttechnik' },
        textSnippet: 'Füllung in inkrementeller Mehrschicht-Technik gelegt.',
        billingRefs: ['GOZ_2060']
    },
    'chip_occlusion_check': {
        id: 'chip_occlusion_check',
        label: 'Okklusionsprüfung',
        patch: { bite_registration: 'Okklusionsprüfung' },
        textSnippet: 'Okklusion und Artikulation mit Okklusionspapier geprüft.',
        billingRefs: ['BEMA_01', 'GOZ_8000']
    },
    'chip_polishing': {
        id: 'chip_polishing',
        label: 'Politur',
        patch: { polishing: true },
        textSnippet: 'Ausarbeitung und Hochglanzpolitur der Restauration.',
        billingRefs: []
    },
    'chip_fluoridation': {
        id: 'chip_fluoridation',
        label: 'Fluoridierung',
        patch: { fluoridation: 'Lokale Fluoridierung' },
        textSnippet: 'Lokale Fluoridierung mit Elmex Gelee durchgeführt.',
        billingRefs: ['BEMA_IP4', 'GOZ_1020']
    },
    'chip_endo_isolation': {
        id: 'chip_endo_isolation',
        label: 'Kofferdam (Endo)',
        patch: { isolation: 'Kofferdam', kofferdam: true },
        textSnippet: 'Absolute Isolation mittels Kofferdam.',
        billingRefs: ['BEMA_12', 'GOZ_2040']
    },
    'chip_endo_naocl': {
        id: 'chip_endo_naocl',
        label: 'NaOCl + EDTA',
        patch: { irrigation: 'NaOCl + EDTA' },
        textSnippet: 'Intensive Spülprotokolle mit NaOCl und EDTA durchgeführt.',
        billingRefs: ['GOZ_ANALOG_DETECTOR']
    },
    'chip_endo_medication': {
        id: 'chip_endo_medication',
        label: 'Zwischenmedikation (Ca(OH)2)',
        patch: { medication: 'Calciumhydroxid-Einlage' },
        textSnippet: 'Zwischenmedikation mit Calciumhydroxid eingebracht.',
        billingRefs: ['GOZ_2050']
    },
    'chip_surgical_flap': {
        id: 'chip_surgical_flap',
        label: 'Mukoperiostlappen',
        patch: { flapRaised: true },
        textSnippet: 'Mukoperiostlappen gebildet und dargestellt.',
        billingRefs: ['GOZ_3100']
    },
    'chip_primary_suture': {
        id: 'chip_primary_suture',
        label: 'Primärnaht',
        patch: { sutureType: 'Einzelknopfnaht' },
        textSnippet: 'Wundverschluss mittels Einzelknopfnaht.',
        billingRefs: ['BEMA_104', 'GOZ_3310']
    },
    'chip_postop_sheet': {
        id: 'chip_postop_sheet',
        label: 'Postop-Hinweise',
        patch: { instructions: 'Kühlen, weiche Kost, Analgetika wie besprochen.' },
        textSnippet: 'Postoperatives Hinweiseblatt (Kühlen, Ernährung, Analgetika) übergeben.',
        billingRefs: []
    },
    'chip_prophy_polishing': {
        id: 'chip_prophy_polishing',
        label: 'Prophylaxe-Politur',
        patch: { polishing: true },
        textSnippet: 'Politur mit Prophypaste und Gummikelch durchgeführt.',
        billingRefs: ['GOZ_1040']
    },
    'chip_prophy_fluoride': {
        id: 'chip_prophy_fluoride',
        label: 'Prophylaxe-Fluoridierung',
        patch: { fluoridation: true }, // Boolean for Prophylaxis template
        textSnippet: 'Abschließende Fluoridierung mittels Lack oder Schiene durchgeführt.',
        billingRefs: ['BEMA_IP4', 'GOZ_1020']
    }
};

const LEGACY_CHIP_IDS: Record<string, string> = {
    'Oberflächenanästhesie': 'chip_surface_anesthesia',
    'Trockenlegung (relativ)': 'chip_relative_isolation',
    'Adhäsivtechnik': 'chip_adhesive',
    'Mehrschicht-Technik': 'chip_layering',
    'Okklusionsprüfung': 'chip_occlusion_check',
    'Politur': 'chip_polishing',
    'Fluoridierung': 'chip_fluoridation',
    'Kofferdam': 'chip_kofferdam'
};

Object.entries(LEGACY_CHIP_IDS).forEach(([legacyId, modernId]) => {
    const modern = CHIP_CATALOG[modernId];
    if (modern) {
        CHIP_CATALOG[legacyId] = modern;
    }
});
