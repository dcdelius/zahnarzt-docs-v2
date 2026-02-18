export type DocumentationObligationCondition =
    | { kind: 'present' }
    | { kind: 'positiveNumber' }
    | { kind: 'equals'; value: string };

export type DocumentationObligationLineConfig =
    | { kind: 'value'; template: string; format?: 'raw' | 'currency2' }
    | { kind: 'fixed'; text: string; materialPath?: string };

export type DocumentationObligationRule = {
    id: string;
    sectionId: string;
    factPath: string;
    treatmentIds?: string[];
    askbackId?: string;
    condition: DocumentationObligationCondition;
    line: DocumentationObligationLineConfig;
};

/**
 * Shared obligation SSOT:
 * - used by output composer (text must include obligation)
 * - used by clinical obligation evaluator (askback requirement + status)
 */
export const DOCUMENTATION_OBLIGATION_RULES: DocumentationObligationRule[] = [
    {
        id: 'endo_working_lengths',
        sectionId: 'behandlung',
        factPath: 'endo.workingLengthsText',
        treatmentIds: ['endo'],
        askbackId: 'ENDO_T1_WORKING_LENGTHS',
        condition: { kind: 'present' },
        line: { kind: 'value', template: 'Arbeitslängen dokumentiert: {{value}}.' },
    },
    {
        id: 'endo_canal_count',
        sectionId: 'leistungen',
        factPath: 'endo.canalCount',
        treatmentIds: ['endo'],
        askbackId: 'endo_canal_count',
        condition: { kind: 'positiveNumber' },
        line: { kind: 'value', template: 'Kanalanzahl dokumentiert: {{value}}.' },
    },
    {
        id: 'endo_medication',
        sectionId: 'behandlung',
        factPath: 'endo.medication',
        treatmentIds: ['endo'],
        askbackId: 'endo_medication',
        condition: { kind: 'present' },
        line: { kind: 'value', template: 'Medikamentöse Einlage dokumentiert: {{value}}.' },
    },
    {
        id: 'radiology_indication',
        sectionId: 'befund',
        factPath: 'radiology.indication',
        askbackId: 'medical_roentgen_indikation',
        condition: { kind: 'present' },
        line: { kind: 'value', template: 'Röntgenindikation: {{value}}.' },
    },
    {
        id: 'radiology_type',
        sectionId: 'befund',
        factPath: 'radiology.type',
        askbackId: 'medical_roentgen_typ',
        condition: { kind: 'present' },
        line: { kind: 'value', template: 'Röntgentyp: {{value}}.' },
    },
    {
        id: 'radiology_timing',
        sectionId: 'befund',
        factPath: 'radiology.timing',
        askbackId: 'medical_roentgen_zeitpunkt',
        condition: { kind: 'present' },
        line: { kind: 'value', template: 'Röntgenzeitpunkt: {{value}}.' },
    },
    {
        id: 'radiology_findings',
        sectionId: 'befund',
        factPath: 'radiology.findings',
        askbackId: 'medical_roentgen_befund',
        condition: { kind: 'present' },
        line: { kind: 'value', template: 'Röntgenbefund: {{value}}.' },
    },
    {
        id: 'capping_performed',
        sectionId: 'behandlung',
        factPath: 'capping.performed',
        treatmentIds: ['fuellung', 'ueberkappung'],
        askbackId: 'medical_ueberkappung',
        condition: { kind: 'equals', value: 'yes' },
        line: {
            kind: 'fixed',
            text: 'Überkappung durchgeführt.',
            materialPath: 'capping.material',
        },
    },
    {
        id: 'mkv_justification',
        sectionId: 'aufklaerung',
        factPath: 'mkv_justification',
        treatmentIds: ['fuellung', 'ueberkappung'],
        condition: { kind: 'present' },
        line: { kind: 'value', template: 'Mehrkostenbegründung: {{value}}.' },
    },
    {
        id: 'mkv_amount',
        sectionId: 'aufklaerung',
        factPath: 'mkv_betrag',
        treatmentIds: ['fuellung', 'ueberkappung'],
        askbackId: 'mkv_betrag',
        condition: { kind: 'positiveNumber' },
        line: {
            kind: 'value',
            template: 'Mehrkostenbetrag dokumentiert: {{value}} EUR.',
            format: 'currency2',
        },
    },
];

