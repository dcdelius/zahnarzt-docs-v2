import { SmartRule } from '../types';

export const SURGERY_RULES: SmartRule[] = [
    {
        id: 'chip_surgical_flap',
        category: 'surgery',
        mode: 'chip',
        when: {},
        then: {
            label: 'Mukoperiostlappen',
            description: 'Lappenbildung zur Darstellung des OP-Gebiets',
            priority: 6,
            billingRefs: ['GOZ_3100'],
            textSnippet: 'Mukoperiostlappen gebildet und dargestellt.',
            patches: [
                { op: 'replace', path: 'flapRaised', value: true }
            ]
        }
    },
    {
        id: 'chip_primary_suture',
        category: 'surgery',
        mode: 'chip',
        when: {},
        then: {
            label: 'Primärnaht',
            description: 'Einzelknopfnaht / Matratzennaht dokumentieren',
            priority: 5,
            billingRefs: ['BEMA_104', 'GOZ_3310'],
            textSnippet: 'Wundverschluss mittels Einzelknopfnaht.',
            patches: [
                { op: 'replace', path: 'sutureType', value: 'Einzelknopfnaht' }
            ]
        }
    },
    {
        id: 'chip_postop_sheet',
        category: 'surgery',
        mode: 'chip',
        when: {},
        then: {
            label: 'Postop Hinweisblatt',
            description: 'Standard-Verhaltensliste ausgehändigt',
            priority: 3,
            billingRefs: [],
            textSnippet: 'Postoperatives Hinweiseblatt (Kühlen, Ernährung, Medikamente) übergeben.',
            patches: [
                { op: 'replace', path: 'instructions', value: 'Kühlen, kein Nikotin/Alkohol, weiche Kost, Analgetika laut Plan' }
            ]
        }
    },
    {
        id: 'surgical_bleeding_control',
        category: 'surgery',
        when: {
            requiredFields: [{ path: 'procedures', includes: 'chirurg' }],
            missing: ['hemostasis']
        },
        then: {
            label: 'Blutstillung dokumentieren?',
            description: 'Tamponade, Knochenwachs oder Naht',
            priority: 8,
            billingRefs: ['GOZ_3310'],
            textSnippet: 'Blutstillung durch Tamponade und Kompression.',
            patches: [
                { op: 'replace', path: 'hemostasis', value: 'Tamponade / Kompression' }
            ]
        }
    },
    {
        id: 'surgical_antibiotic',
        category: 'surgery',
        when: {
            requiredFields: [{ path: 'complications', includes: 'entzündung' }],
            missing: ['medication']
        },
        then: {
            label: 'Antibiotikum / Analgetikum?',
            description: 'Rezept oder Einnahmeplan dokumentieren',
            priority: 6,
            billingRefs: ['GOZ_0010'],
            textSnippet: 'Medikation: Amoxicillin 1000 mg 1-1-1, Ibuprofen 600 mg bei Bedarf.',
            patches: [
                { op: 'replace', path: 'medication', value: 'Amoxicillin + Ibuprofen' }
            ]
        }
    }
];

