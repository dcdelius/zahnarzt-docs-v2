import { SmartRule } from '../types';

export const ENDO_RULES: SmartRule[] = [
    // Chips
    {
        id: 'chip_endo_isolation',
        category: 'endo',
        mode: 'chip',
        when: {},
        then: {
            label: 'Kofferdam',
            description: 'Absolute Isolation mittels Kofferdam',
            priority: 6,
            billingRefs: ['BEMA_12', 'GOZ_2040'],
            textSnippet: 'Absolute Isolation mittels Kofferdam.',
            patches: [
                { op: 'replace', path: 'isolation', value: 'Kofferdam' }
            ]
        }
    },
    {
        id: 'chip_endo_naocl',
        category: 'endo',
        mode: 'chip',
        when: {},
        then: {
            label: 'NaOCl-Spülung',
            description: 'Spülung mit Natriumhypochlorit und EDTA',
            priority: 5,
            billingRefs: ['GOZ_ANALOG_DETECTOR'],
            textSnippet: 'Intensives Spülprotokoll mit NaOCl + EDTA durchgeführt.',
            patches: [
                { op: 'replace', path: 'irrigation', value: 'NaOCl + EDTA' }
            ]
        }
    },
    {
        id: 'chip_endo_medication',
        category: 'endo',
        mode: 'chip',
        when: {},
        then: {
            label: 'Zwischenmedikation (CaOH)',
            description: 'Calciumhydroxid-Einlage dokumentieren',
            priority: 4,
            billingRefs: ['GOZ_2050'],
            textSnippet: 'Zwischenmedikation mit Calciumhydroxid eingebracht.',
            patches: [
                { op: 'replace', path: 'medication', value: 'Calciumhydroxid-Einlage' }
            ]
        }
    },

    // Auto Suggestions
    {
        id: 'length_measurement',
        category: 'endo',
        when: {
            requiredFields: [{ path: 'procedures', includes: 'wurzelkanal' }],
            predicateId: 'needsLengthMeasurement'
        },
        then: {
            label: 'Elektrometrische Längenmessung?',
            description: 'Elektronische Apex-Lokalisation',
            priority: 9,
            billingRefs: ['GOZ_2410'],
            patches: [
                { op: 'replace', path: 'length_measurement', value: 'Endometrie' }
            ]
        }
    },
    {
        id: 'machine_preparation',
        category: 'endo',
        when: {
            predicateId: 'needsMachinePrep'
        },
        then: {
            label: 'Maschinelle Aufbereitung?',
            description: 'Rotierendes NiTi-System',
            priority: 9,
            billingRefs: ['GOZ_2400'],
            patches: [
                { op: 'replace', path: 'machine_preparation', value: 'Rotierende NiTi-Feilen' }
            ]
        }
    }
];
