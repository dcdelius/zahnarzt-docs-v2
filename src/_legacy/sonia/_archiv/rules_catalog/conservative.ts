import { SmartRule } from '../types';

/**
 * CONSERVATIVE RULES (Filling Treatment)
 * 
 * ARCHITECTURE:
 * - mode: 'chip' → User-togglable in UI
 * - mode: 'auto' → Always applied for this treatment (no click needed)
 * - mode: 'suggest' → Suggested after extraction (upsell)
 * 
 * Each rule sets a `_line` field → Blueprint renders it dynamically
 */

export const CONSERVATIVE_RULES: SmartRule[] = [

    // ========================================
    // AUTO-MODE: Standard für jede Füllung (kein Chip nötig)
    // ========================================

    {
        id: 'auto_excavation',
        category: 'conservative',
        mode: 'auto', // Always applied
        when: {},
        then: {
            label: 'Exkavation',
            description: 'Standard bei Füllung',
            priority: 10,
            billingRefs: [], // Inklusive in F-Code
            textSnippet: 'Exkavation kariöser Anteile bis sondenhart.',
            patches: [
                { op: 'replace', path: 'excavation_line', value: '• Exkavation bis sondenhart' }
            ]
        }
    },
    {
        id: 'auto_occlusion',
        category: 'conservative',
        mode: 'auto',
        when: {},
        then: {
            label: 'Okklusionskontrolle',
            description: 'Standard bei Füllung',
            priority: 10,
            billingRefs: [], // Inklusive
            textSnippet: 'Okklusion geprüft, ggf. eingeschliffen.',
            patches: [
                { op: 'replace', path: 'occlusion_line', value: '• Okklusionskontrolle (Shimstock/Artikulationspapier)' }
            ]
        }
    },
    {
        id: 'auto_polishing',
        category: 'conservative',
        mode: 'auto',
        when: {},
        then: {
            label: 'Politur',
            description: 'Standard bei Füllung',
            priority: 10,
            billingRefs: [], // Inklusive
            textSnippet: 'Ausarbeitung und Hochglanzpolitur.',
            patches: [
                { op: 'replace', path: 'polishing_line', value: '• Ausarbeitung und Politur' }
            ]
        }
    },

    // ========================================
    // CHIP-MODE: User-togglable (Quick Standards)
    // ========================================

    // --- ANESTHESIA (mutually exclusive) ---
    {
        id: 'chip_infiltration_anesthesia',
        category: 'conservative',
        mode: 'chip',
        when: {},
        then: {
            label: 'Infiltration',
            description: 'Lokalanästhesie mittels Infiltration',
            priority: 5,
            billingRefs: ['BEMA_40', 'GOZ_0090'],
            textSnippet: 'LA Infiltration (Ultracain D-S).',
            patches: [
                { op: 'replace', path: 'anesthesia_short', value: 'Infiltration' },
                { op: 'replace', path: 'anesthesia_drug', value: 'Ultracain D-S' },
                { op: 'replace', path: 'anesthesia_line', value: '• Lokalanästhesie (Infiltration; Ultracain D-S)' }
            ]
        }
    },
    {
        id: 'chip_conduction_anesthesia',
        category: 'conservative',
        mode: 'chip',
        when: {},
        then: {
            label: 'Leitung',
            description: 'Leitungsanästhesie (Mandibula)',
            priority: 5,
            billingRefs: ['BEMA_41', 'GOZ_0100'],
            textSnippet: 'Leitungsanästhesie N. alveolaris inferior (Ultracain D-S).',
            patches: [
                { op: 'replace', path: 'anesthesia_short', value: 'Leitungsanästhesie' },
                { op: 'replace', path: 'anesthesia_drug', value: 'Ultracain D-S' },
                { op: 'replace', path: 'anesthesia_line', value: '• Leitungsanästhesie (N. alv. inf.; Ultracain D-S)' }
            ]
        }
    },

    // --- KOFFERDAM + bMF (combined - one billing code) ---
    {
        id: 'chip_kofferdam_bmf',
        category: 'conservative',
        mode: 'chip',
        when: {},
        then: {
            label: 'Kofferdam (bMF)',
            description: 'Absolute Trockenlegung + bes. Maßnahmen → BEMA 12',
            priority: 5,
            billingRefs: ['BEMA_12', 'GOZ_2040'],
            textSnippet: 'Kofferdam angelegt. bMF: Speichelkontrolle, Formgebung.',
            patches: [
                { op: 'replace', path: 'isolation', value: 'Kofferdam' },
                { op: 'replace', path: 'bmf', value: true },
                { op: 'replace', path: 'isolation_line', value: '• Trockenlegung: Kofferdam (absolut), bMF' }
            ]
        }
    },

    // --- ADHESIVE TECHNIQUE ---
    {
        id: 'chip_adhesive',
        category: 'conservative',
        mode: 'chip',
        when: {},
        then: {
            label: 'Ätz-/Adhäsivtechnik',
            description: 'Konditionierung (Etch & Bond) → GOZ 2197',
            priority: 5,
            billingRefs: ['GOZ_2197'], // Nur PKV extra
            textSnippet: 'Ätz-/Adhäsivtechnik (Schmelz/Dentin konditioniert).',
            patches: [
                { op: 'replace', path: 'conditioning', value: 'Total-Etch' },
                { op: 'replace', path: 'adhesive_system', value: 'OptiBond FL' },
                { op: 'replace', path: 'adhesive_line', value: '• Ätz-/Adhäsivtechnik (OptiBond FL)' }
            ]
        }
    },

    // --- LAYERING TECHNIQUE ---
    {
        id: 'chip_layering',
        category: 'conservative',
        mode: 'chip',
        when: {},
        then: {
            label: 'Schichttechnik',
            description: 'Inkrementell, lichthärtend → GOZ 2060',
            priority: 5,
            billingRefs: ['GOZ_2060'], // Nur PKV extra
            textSnippet: 'Komposit-Mehrschichtfüllung (≤2mm Schichten), lichthärtend.',
            patches: [
                { op: 'replace', path: 'technique', value: 'Schichttechnik' },
                { op: 'replace', path: 'layering_line', value: '• Komposit-Schichttechnik (je Schicht ≤2mm, lichthärtend)' }
            ]
        }
    },

    // ========================================
    // SUGGESTIONS: Upsells nach Extraktion
    // ========================================

    {
        id: 'upsell_fluoridation',
        category: 'conservative',
        mode: 'suggest',
        when: { missing: ['fluoridation'] },
        then: {
            label: 'Fluoridiert?',
            description: 'Lokalfluoridierung → GOZ 1020',
            reasoning: 'Separat abrechenbar (PKV)',
            priority: 6,
            billingRefs: ['GOZ_1020', 'BEMA_IP4'],
            textSnippet: 'Lokalfluoridierung.',
            patches: [
                { op: 'replace', path: 'fluoridation', value: 'Elmex Gelee' },
                { op: 'replace', path: 'fluoridation_line', value: '• Fluoridierung (Elmex Gelee)' }
            ]
        }
    },

    {
        id: 'upsell_matrix',
        category: 'conservative',
        mode: 'suggest',
        when: { missing: ['matrix'] },
        then: {
            label: 'Matrizensystem?',
            description: 'Teilmatrize + Keil',
            reasoning: 'Forensisch wichtig für Approximalkontakt',
            priority: 5,
            billingRefs: [], // Inklusive
            textSnippet: 'Teilmatrize verkeilt.',
            patches: [
                { op: 'replace', path: 'matrix', value: 'Teilmatrize' },
                { op: 'replace', path: 'matrix_line', value: '• Teilmatrize + Holzkeil' }
            ]
        }
    },

    {
        id: 'upsell_xray',
        category: 'conservative',
        mode: 'suggest',
        when: { missing: ['xray_control'] },
        then: {
            label: 'Röntgen-Kontrolle?',
            description: 'Einzelzahn-Röntgen',
            reasoning: 'Bei tiefer Karies dokumentieren',
            priority: 5,
            billingRefs: ['BEMA_925A', 'GOZ_5000'],
            textSnippet: 'Rö-Kontrolle.',
            patches: [
                { op: 'replace', path: 'xray_control', value: true },
                { op: 'replace', path: 'xray_line', value: '• Rö-Kontrolle' }
            ]
        }
    },

    {
        id: 'upsell_cp',
        category: 'conservative',
        mode: 'suggest',
        when: {
            field: 'diagnosis',
            contains: 'profunda'
        },
        then: {
            label: 'CP-Behandlung?',
            description: 'Indirekte Überkappung bei tiefer Karies',
            reasoning: 'Bei Caries profunda prüfen!',
            priority: 8,
            billingRefs: ['BEMA_CP', 'GOZ_2330'],
            textSnippet: 'Indirekte Überkappung (Cp) mit CaOH.',
            patches: [
                { op: 'replace', path: 'cp_statement', value: 'Cp mit CaOH-Unterfüllung' },
                { op: 'replace', path: 'cp_line', value: '• Cp (Indirekte Überkappung, CaOH)' }
            ]
        }
    }
];
