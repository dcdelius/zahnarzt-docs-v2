import { TemplateV3 } from '../../knowledge/types';

/**
 * MASTER FILLING BLUEPRINT v6
 * 
 * ARCHITECTURE:
 * - Each {{field_line}} is set by a chip/auto-rule
 * - If chip inactive → field missing → line disappears
 * - Billing codes generated automatically from active chips
 */

export const MASTER_FILL_V3_BLUEPRINT: TemplateV3 = {
    id: 'master_fill_v3_blueprint',
    title: 'Füllung (Perfekt Blueprint)',
    systemVersion: 'v3',
    treatmentType: 'filling',
    version: 6,
    rulesetId: 'conservative_rules',
    renderSpec: {
        sections: [
            { id: 'summary', required: true, title: 'ÜBERSICHT & ABRECHNUNG' },
            { id: 'procedure', required: true, title: 'BEHANDLUNGSABLAUF' },
            { id: 'extras', required: false, title: 'SONSTIGES' }
        ],
        strict: true
    },
    renderMode: 'deterministic',
    blueprint: {
        summary: `Zahn: {{tooth}} ({{surfacesShort}})
Diagnose: {{diagnosis}}
Material: {{material}}
Befund: {{findings}}

Durchgeführte Leistungen:
{{anesthesia_line}}
{{isolation_line}}
{{excavation_line}}
{{cp_line}}
{{matrix_line}}
{{adhesive_line}}
{{layering_line}}
{{occlusion_line}}
{{polishing_line}}
{{fluoridation_line}}
{{xray_line}}

Abrechnung:
{{billingTable}}`,

        procedure: `Aufklärung: Postoperative Sensibilität, Materialverhalten, ggf. Pulpitis-Risiko; Einwilligung erteilt.

{{procedureLines}}

Pat. beschwerdearm entlassen.`,

        extras: `{{dictationExtras}}`
    },
    requiredFacts: ['tooth'],
    fields: [
        { id: 'tooth', label: 'Zahn', type: 'string' },
        { id: 'surfaces', label: 'Flächen', type: 'multiselect', options: ['m', 'o', 'd', 'b', 'l', 'v', 'p'] },
        { id: 'diagnosis', label: 'Diagnose', type: 'string' },
        { id: 'material', label: 'Material', type: 'string' },
        { id: 'findings', label: 'Befund', type: 'string' },
        // Dynamic lines (set by chips)
        { id: 'anesthesia_line', label: 'Anästhesie', type: 'string' },
        { id: 'isolation_line', label: 'Trockenlegung', type: 'string' },
        { id: 'excavation_line', label: 'Exkavation', type: 'string' },
        { id: 'cp_line', label: 'Überkappung', type: 'string' },
        { id: 'matrix_line', label: 'Matrize', type: 'string' },
        { id: 'adhesive_line', label: 'Adhäsiv', type: 'string' },
        { id: 'layering_line', label: 'Schichttechnik', type: 'string' },
        { id: 'occlusion_line', label: 'Okklusion', type: 'string' },
        { id: 'polishing_line', label: 'Politur', type: 'string' },
        { id: 'fluoridation_line', label: 'Fluoridierung', type: 'string' },
        { id: 'xray_line', label: 'Röntgen', type: 'string' }
    ],
    defaults: {
        diagnosis: 'Caries profunda',
        material: 'Komposit',
        findings: 'ViPr + / Perk −'
    }
};
