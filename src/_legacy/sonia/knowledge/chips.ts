import { ChipDefinition } from './types';

export const CHIP_CATALOG: ChipDefinition[] = [
    // Anesthesia
    {
        id: 'anesthesia_ila',
        label: 'Infiltrationsanästhesie',
        category: 'anesthesia',
        patches: [{ op: 'replace', path: 'anesthesia', value: 'Infiltrationsanästhesie (ILA)' }],
        textSnippet: 'Lokalanästhesie mittels Infiltration (ILA) durchgeführt.'
    },
    {
        id: 'anesthesia_leit',
        label: 'Leitungsanästhesie',
        category: 'anesthesia',
        patches: [{ op: 'replace', path: 'anesthesia', value: 'Leitungsanästhesie' }],
        textSnippet: 'Lokalanästhesie mittels Leitungsanästhesie durchgeführt.'
    },
    {
        id: 'anesthesia_top',
        label: 'Oberflächenanästhesie',
        category: 'anesthesia',
        patches: [{ op: 'replace', path: 'anesthesia', value: 'Oberflächenanästhesie' }],
        textSnippet: 'Oberflächenanästhesie zur Schmerzreduktion appliziert.'
    },

    // Isolation
    {
        id: 'isolation_kofferdam',
        label: 'Kofferdam',
        category: 'isolation',
        patches: [{ op: 'replace', path: 'isolation', value: 'Kofferdam' }],
        textSnippet: 'Absolute Trockenlegung mittels Kofferdam.'
    },
    {
        id: 'isolation_relativ',
        label: 'Relativ (Watterolle)',
        category: 'isolation',
        patches: [{ op: 'replace', path: 'isolation', value: 'Relativ (Watterolle)' }],
        textSnippet: 'Relative Trockenlegung mit Watterollen und Speichelzieher.'
    },

    // Conditioning
    {
        id: 'cond_total_etch',
        label: 'Total-Etch',
        category: 'conditioning',
        patches: [{ op: 'replace', path: 'conditioning', value: 'Total-Etch' }],
        textSnippet: 'Konditionierung mittels Säure-Ätz-Technik (Total-Etch).'
    },

    // Technique
    {
        id: 'tech_layering',
        label: 'Schichttechnik',
        category: 'technique',
        patches: [{ op: 'replace', path: 'technique', value: 'Schichttechnik' }],
        textSnippet: 'Füllung in inkrementeller Schichttechnik gelegt.'
    },

    // Matrix
    {
        id: 'matrix_sectional',
        label: 'Sectional Matrix',
        category: 'matrix_system',
        patches: [{ op: 'replace', path: 'matrix_system', value: 'Sectional Matrix System' }],
        textSnippet: 'Verwendung eines Teilmatrizensystems (Sectional Matrix).'
    },

    // Endo
    {
        id: 'endo_len_elect',
        label: 'Endometrie',
        category: 'length_measurement',
        patches: [{ op: 'replace', path: 'length_measurement', value: 'Endometrie' }],
        textSnippet: 'Elektronische Längenbestimmung (Endometrie) durchgeführt.'
    },
    {
        id: 'endo_prep_mach',
        label: 'Maschinell (NiTi)',
        category: 'machine_preparation',
        patches: [{ op: 'replace', path: 'machine_preparation', value: 'Rotierende NiTi-Feilen' }],
        textSnippet: 'Maschinelle Aufbereitung des Wurzelkanalsystems mit rotierenden NiTi-Feilen.'
    }
];
