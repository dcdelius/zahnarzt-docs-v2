import { TemplateV3 } from '../../types/templateV3';
import { MASTER_TEMPLATE_V3 } from '../../data/masterTemplate';
import { TreatmentId } from '../knowledge/treatments/treatmentCatalog';

const NOW = new Date().toISOString();

export const FILLING_TEMPLATE_V3 = MASTER_TEMPLATE_V3 as TemplateV3;

export const ENDO_TEMPLATE_V3: TemplateV3 = {
    id: 'template_endo_root_v3',
    title: 'Endodontie (Sonia V3)',
    category: 'Endodontie',
    systemVersion: 'v3',
    version: 1,
    description: 'Strukturiertes Endodontie-Schema für Sonia V3 (Längenmessung, Spülung, Obturation).',
    createdAt: NOW,
    updatedAt: NOW,
    fields: [
        { id: 'tooth', label: 'Zahn', type: 'string', required: true, description: 'Behandelter Zahn (FDI).' },
        { id: 'diagnosis', label: 'Diagnose', type: 'text', required: true },
        { id: 'painLevel', label: 'Beschwerden', type: 'text', description: 'Symptome laut Patient.' },
        { id: 'procedures', label: 'Leistungen', type: 'multiselect', options: ['Trepanation', 'Wurzelkanalbehandlung', 'Revision', 'Medikamentöse Einlage'] },
        { id: 'anesthesia', label: 'Anästhesie', type: 'enum', options: ['Infiltration', 'Leitung', 'Intraligamentär', 'Keine'], defaultValue: 'Infiltration' },
        { id: 'isolation', label: 'Isolation', type: 'enum', options: ['Kofferdam', 'Relative', 'Keine'], defaultValue: 'Kofferdam' },
        { id: 'workingLength', label: 'Arbeitslänge', type: 'string', placeholder: 'z.B. 21 mm' },
        { id: 'lengthMeasurement', label: 'Längenmessung', type: 'boolean', defaultValue: false },
        { id: 'machinePreparation', label: 'Maschinelle Aufbereitung', type: 'boolean', defaultValue: false },
        { id: 'irrigation', label: 'Spülprotokoll', type: 'text', placeholder: 'z.B. NaOCl, EDTA' },
        { id: 'medication', label: 'Zwischenmedikation', type: 'text' },
        { id: 'obturation', label: 'Obturation', type: 'enum', options: ['Guttapercha', 'Thermafil', 'Noch offen'], defaultValue: 'Noch offen' },
        { id: 'temporarySealing', label: 'Temporärer Verschluss', type: 'boolean', defaultValue: true },
        { id: 'controlXray', label: 'Röntgenkontrolle', type: 'boolean', defaultValue: false },
        { id: 'consent', label: 'Aufklärung dokumentiert', type: 'boolean', defaultValue: false },
        { id: 'nextSteps', label: 'Weiteres Vorgehen', type: 'text' }
    ],
    practiceDefaults: {
        standardLeistungen: 'Kofferdam, maschinelle Aufbereitung, NaOCl-Spülung, temporärer Verschluss'
    },
    rules: [
        {
            id: 'endo_kofferdam_required',
            description: 'Kofferdam ist Standard bei Endo.',
            when: [{ fieldId: 'isolation', operator: 'neq', value: 'Kofferdam' }],
            then: [{ type: 'warn', message: 'Bitte Isolation mittels Kofferdam dokumentieren.' }]
        },
        {
            id: 'endo_length_missing',
            description: 'Warnung, wenn keine Längenmessung dokumentiert ist.',
            when: [{ fieldId: 'lengthMeasurement', operator: 'neq', value: true }],
            then: [{ type: 'warn', message: 'Längenmessung / Endometrie fehlt.' }]
        },
        {
            id: 'endo_consent_required',
            description: 'Deep caries/Endo ohne Dokumentation der Aufklärung.',
            when: [
                { fieldId: 'diagnosis', operator: 'contains', value: 'pulp' },
                { fieldId: 'consent', operator: 'neq', value: true }
            ],
            then: [{ type: 'error', message: 'Aufklärung über Risiken und Alternativen dokumentieren.' }]
        }
    ],
    renderConfig: {
        blocks: [
            {
                id: 'endo_check',
                title: 'ABRECHNUNG & CHECK',
                type: 'bullets',
                fields: ['anesthesia', 'isolation', 'lengthMeasurement', 'machinePreparation', 'controlXray', 'temporarySealing']
            },
            {
                id: 'endo_flow',
                title: 'BEHANDLUNG & VERLAUF',
                type: 'text',
                template: 'Zahn {tooth}: {diagnosis}. Beschwerden: {painLevel}. Zugang über {procedures}. Arbeitslänge {workingLength}. Spülung: {irrigation}. Zwischenmedikation: {medication}. Obturation: {obturation}. Weiteres Vorgehen: {nextSteps}.'
            }
        ]
    }
};

export const EXTRACTION_TEMPLATE_V3: TemplateV3 = {
    id: 'template_surgery_extraction_v3',
    title: 'Chirurgie / Extraktion',
    category: 'Chirurgie',
    systemVersion: 'v3',
    version: 1,
    description: 'Schema für einfache/komplizierte Extraktionen mit Lappenbildung, Osteotomie und Naht.',
    createdAt: NOW,
    updatedAt: NOW,
    fields: [
        { id: 'tooth', label: 'Zahn', type: 'string', required: true },
        { id: 'indication', label: 'Indikation', type: 'text', required: true },
        { id: 'procedures', label: 'Leistungen', type: 'multiselect', options: ['Einfache Extraktion', 'Chirurgische Entfernung', 'Osteotomie', 'Freilegung'] },
        { id: 'anesthesia', label: 'Anästhesie', type: 'enum', options: ['Leitung', 'Infiltration', 'Sedierung'], defaultValue: 'Leitung' },
        { id: 'flapRaised', label: 'Mukoperiostlappen', type: 'boolean', defaultValue: false },
        { id: 'boneRemoval', label: 'Osteotomie', type: 'boolean', defaultValue: false },
        { id: 'sectioning', label: 'Zahn separiert', type: 'boolean', defaultValue: false },
        { id: 'sutureType', label: 'Nahttechnik', type: 'string' },
        { id: 'sutureMaterial', label: 'Nahtmaterial', type: 'string' },
        { id: 'hemostasis', label: 'Blutstillung', type: 'text', placeholder: 'Tamponade, Naht, Elektrokoagulation' },
        { id: 'medication', label: 'Medikation / Rezept', type: 'text' },
        { id: 'instructions', label: 'Verhaltenshinweise', type: 'text' },
        { id: 'complications', label: 'Besonderheiten', type: 'text' },
        { id: 'consent', label: 'Aufklärung dokumentiert', type: 'boolean', defaultValue: false },
        { id: 'followUp', label: 'Kontrolle / Fadenentfernung', type: 'text' }
    ],
    practiceDefaults: {
        standardLeistungen: 'Leitungsanästhesie, Kürettage, Naht, postoperatives Merkblatt'
    },
    rules: [
        {
            id: 'extraction_consent_needed',
            description: 'Jede Chirurgie benötigt dokumentierte Aufklärung.',
            when: [{ fieldId: 'consent', operator: 'neq', value: true }],
            then: [{ type: 'error', message: 'Aufklärung (Risiken/Alternativen) dokumentieren.' }]
        },
        {
            id: 'extraction_naht_missing',
            description: 'Wenn Lappen oder Osteotomie, dann Naht dokumentieren.',
            when: [
                { fieldId: 'flapRaised', operator: 'eq', value: true },
                { fieldId: 'sutureType', operator: 'exists' }
            ],
            then: [{ type: 'setDefault', targetFieldId: 'sutureType', value: 'Einzelknopfnaht' }]
        }
    ],
    renderConfig: {
        blocks: [
            {
                id: 'surgery_billing',
                title: 'ABRECHNUNG & CHECK',
                type: 'bullets',
                fields: ['anesthesia', 'flapRaised', 'boneRemoval', 'sectioning', 'sutureType']
            },
            {
                id: 'surgery_flow',
                title: 'EINGRIFF',
                type: 'text',
                template: 'Zahn {tooth}: {indication}. Vorgehen: {procedures}. Lappen: {flapRaised}. Knochenabtrag: {boneRemoval}. Separation: {sectioning}. Naht: {sutureType} ({sutureMaterial}). Blutstillung: {hemostasis}. Besonderheiten: {complications}. Medikamente/Hinweise: {medication}. Verhalten: {instructions}. Kontrolle: {followUp}.'
            }
        ]
    }
};

export const PROPHYLAXIS_TEMPLATE_V3: TemplateV3 = {
    id: 'template_prevention_prophy_v3',
    title: 'PZR / Prophylaxe',
    category: 'Prophylaxe',
    systemVersion: 'v3',
    version: 1,
    description: 'Schema für professionelle Zahnreinigung / Individualprophylaxe.',
    createdAt: NOW,
    updatedAt: NOW,
    fields: [
        { id: 'diagnosis', label: 'Befund / PSI', type: 'text', required: true },
        { id: 'procedures', label: 'Leistungen', type: 'multiselect', options: ['PZR', 'AIRFLOW', 'Politur', 'Fluoridierung'] },
        { id: 'stainRemoval', label: 'Belagentfernung', type: 'boolean', defaultValue: true },
        { id: 'polishing', label: 'Politur', type: 'boolean', defaultValue: true },
        { id: 'fluoridation', label: 'Fluoridierung', type: 'boolean', defaultValue: true },
        { id: 'instructions', label: 'Mundhygiene-Empfehlungen', type: 'text' },
        { id: 'recall', label: 'Recall-Intervall', type: 'enum', options: ['3 Monate', '6 Monate', '12 Monate'], defaultValue: '6 Monate' }
    ],
    rules: [
        {
            id: 'prophy_recall_missing',
            when: [{ fieldId: 'recall', operator: 'notExists' }],
            then: [{ type: 'setDefault', targetFieldId: 'recall', value: '6 Monate' }]
        }
    ],
    renderConfig: {
        blocks: [
            {
                id: 'prophy_check',
                title: 'PZR CHECK',
                type: 'bullets',
                fields: ['diagnosis', 'procedures', 'stainRemoval', 'polishing', 'fluoridation']
            },
            {
                id: 'prophy_flow',
                title: 'VERLAUF & TIPPS',
                type: 'text',
                template: 'PSI/Befund: {diagnosis}. Durchgeführt: {procedures}. Hinweise: {instructions}. Recall: {recall}.'
            }
        ]
    }
};

export const BUILT_IN_TEMPLATES: Record<string, TemplateV3> = {
    [FILLING_TEMPLATE_V3.id]: FILLING_TEMPLATE_V3,
    [ENDO_TEMPLATE_V3.id]: ENDO_TEMPLATE_V3,
    [EXTRACTION_TEMPLATE_V3.id]: EXTRACTION_TEMPLATE_V3,
    [PROPHYLAXIS_TEMPLATE_V3.id]: PROPHYLAXIS_TEMPLATE_V3
};

export const DEFAULT_TREATMENT_TEMPLATES: Partial<Record<TreatmentId, string>> = {
    filling: FILLING_TEMPLATE_V3.id,
    endo: ENDO_TEMPLATE_V3.id,
    extraction: EXTRACTION_TEMPLATE_V3.id,
    prophylaxis: PROPHYLAXIS_TEMPLATE_V3.id,
    consultation: PROPHYLAXIS_TEMPLATE_V3.id
};

export const getBuiltInTemplates = () => Object.values(BUILT_IN_TEMPLATES);

export const getBuiltInTemplateById = (id?: string) => {
    if (!id) return undefined;
    return BUILT_IN_TEMPLATES[id];
};

