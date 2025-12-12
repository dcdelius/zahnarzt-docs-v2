import { SmartRule } from '../types';

export const PREVENTION_RULES: SmartRule[] = [
    {
        id: 'chip_prophy_polishing',
        category: 'prevention',
        mode: 'chip',
        when: {},
        then: {
            label: 'Politur',
            description: 'Politur mit Prophypaste / Gummikelch',
            priority: 4,
            billingRefs: ['GOZ_1040'],
            textSnippet: 'Flächenpolitur mit Prophypaste und Gummikelch durchgeführt.',
            patches: [
                { op: 'replace', path: 'polishing', value: true }
            ]
        }
    },
    {
        id: 'chip_prophy_fluoride',
        category: 'prevention',
        mode: 'chip',
        when: {},
        then: {
            label: 'Fluoridierung',
            description: 'Lokale Fluoridierung zum Abschluss',
            priority: 4,
            billingRefs: ['BEMA_IP4', 'GOZ_1020'],
            textSnippet: 'Abschließende Fluoridierung mit Lack/Schiene.',
            patches: [
                { op: 'replace', path: 'fluoridation', value: true }
            ]
        }
    },
    {
        id: 'prevention_homecare',
        category: 'prevention',
        when: {
            missing: ['instructions']
        },
        then: {
            label: 'Mundhygiene-Tipps ergänzen?',
            description: 'PZR ohne individuelle Empfehlung wirkt unvollständig',
            priority: 5,
            billingRefs: [],
            textSnippet: 'Mundhygieneinstruktion (Interdentalbürsten, elektr. Zahnbürste) besprochen.',
            patches: [
                { op: 'replace', path: 'instructions', value: 'Interdentalbürsten + elektrische Zahnbürste empfohlen' }
            ]
        }
    }
];

