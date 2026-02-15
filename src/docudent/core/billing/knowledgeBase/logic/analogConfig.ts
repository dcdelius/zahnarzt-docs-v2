/**
 * Analog Resolver Configuration
 * 
 * Externalized config for analog suggestions to avoid inline constants.
 * Editable without modifying core resolver logic.
 */

// ═══════════════════════════════════════════════════════════════
// SCORING CONFIG
// ═══════════════════════════════════════════════════════════════

/** Minimum score (0-1) to include a match in results */
export const SCORE_THRESHOLD = 0.55;

/** Maximum number of suggestions to return */
export const MAX_RESULTS = 10;

/** Maximum snippet length in thin index and output */
export const MAX_SNIPPET_LENGTH = 160;

// ═══════════════════════════════════════════════════════════════
// STOPWORDS
// ═══════════════════════════════════════════════════════════════

/**
 * Common dental terms that should NOT trigger analog matching.
 * These are too generic and produce false positives.
 */
export const STOPWORDS = new Set([
    // Teeth terms
    'zahn', 'zähne', 'zahnes', 'zaehne',
    // Caries
    'karies', 'caries',
    // Fillings
    'füll', 'fuellung', 'füllung', 'fuell',
    // Surfaces
    'mod', 'moa', 'dob', 'mob', 'doa', 'do', 'mo', 'od', 'om',
    // Procedures
    'endo', 'wurzel', 'krone', 'brücke', 'bruecke',
    // Insurance
    'gkv', 'pkv', 'bema', 'goz',
    // Materials
    'komposit', 'amalgam', 'kunststoff', 'keramik',
    // Generic
    'patient', 'patienten', 'behandlung', 'therapie',
    // Depth terms
    'media', 'profunda', 'superficialis',
]);

// ═══════════════════════════════════════════════════════════════
// KNOWN ANALOG TREATMENTS
// ═══════════════════════════════════════════════════════════════

/**
 * Mapping of treatment names to their corresponding ANALOG codes.
 * Used for direct matching when `extracted.treatment` matches a key.
 */
export const KNOWN_ANALOG_TREATMENTS: Record<string, string> = {
    // Konservierend
    'icon': 'ANALOG_Kons_04',
    'kariesinfiltration': 'ANALOG_Kons_04',

    // Aufbissbehelfe
    'strahlenschutzschiene': 'ANALOG_Aufbiss_01',
    'bruxchecker': 'ANALOG_Aufbiss_02',
    'indikatorschiene': 'ANALOG_Aufbiss_02',

    // Prothetik
    'mockup': 'ANALOG_ZE_01',
    'mock-up': 'ANALOG_ZE_01',
    'provisorium aus extrahiertem zahn': 'ANALOG_ZE_02',

    // Funktionsanalyse
    'digitale funktionsanalyse': 'ANALOG_FAL_01',
    'virtuelle artikulator': 'ANALOG_FAL_08',
};

// ═══════════════════════════════════════════════════════════════
// DOMAIN TAGS
// ═══════════════════════════════════════════════════════════════

/** Domain tag mapping for scoring based on versorgungsart */
export const DOMAIN_TAGS: Record<string, string[]> = {
    'fuellung': ['Konservierend', 'Füllungstherapie'],
    'endo': ['Endodontie', 'Wurzelbehandlung'],
    'chirurgie': ['Chirurgie', 'Extraktion'],
    'krone': ['Prothetik', 'Kronen'],
    'bruecke': ['Prothetik', 'Brücken'],
    'prothese': ['Prothetik', 'Zahnersatz'],
    'paro': ['Parodontologie', 'Parodontalbehandlung'],
    'implant': ['Implantologie', 'Implantate'],
    'kfo': ['KFO', 'Kieferorthopädie'],
};

// ═══════════════════════════════════════════════════════════════
// TREATMENT KEYWORDS
// ═══════════════════════════════════════════════════════════════

/** Keywords for title matching (query term → possible title matches) */
export const TREATMENT_KEYWORDS: Record<string, string[]> = {
    'icon': ['Kariesinfiltration', 'mikroinvasiv', 'Icon'],
    'kariesinfiltration': ['Kariesinfiltration', 'mikroinvasiv', 'Icon'],
    'trepanation': ['Trepanation', 'Knochen'],
    'zystostomie': ['Zystostomie', 'Zyste'],
    'neurolyse': ['Neurolyse', 'Nerv'],
    'mock-up': ['Mock-up', 'Zahnersatzsimulation'],
    'mockup': ['Mock-up', 'Zahnersatzsimulation'],
    'provisorium': ['Provisorium', 'extrahiert'],
    'bruxchecker': ['Indikatorschiene', 'Parafunktion', 'Bruxismus'],
    'strahlenschutz': ['Strahlenschutzschiene', 'Schleimhautretraktor'],
    'analgosedierung': ['Analgosedierung', 'Sedierung'],
};
