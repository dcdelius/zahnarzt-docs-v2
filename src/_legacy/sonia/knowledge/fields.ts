import { FieldDictionary } from './types';

export const FIELD_DICTIONARY: FieldDictionary = {
    // Core Identifiers
    'tooth': {
        id: 'tooth',
        label: 'Zahn',
        type: 'string',
        required: true
    },
    'surfaces': {
        id: 'surfaces',
        label: 'Flächen',
        type: 'multiselect',
        options: ['m', 'o', 'd', 'v', 'l', 'i', 'b', 'p'],
        required: false
    },

    // Procedures & Materials
    'procedures': {
        id: 'procedures',
        label: 'Behandlung',
        type: 'multiselect',
        required: true
    },
    'material': {
        id: 'material',
        label: 'Material',
        type: 'select',
        options: ['Komposit', 'Zement', 'Amalgam', 'Keramik'],
        defaultValue: 'Komposit'
    },

    // Conservative / Filling
    'anesthesia': {
        id: 'anesthesia',
        label: 'Anästhesie',
        type: 'select',
        options: ['Infiltrationsanästhesie (ILA)', 'Leitungsanästhesie', 'Intraligamentär', 'Oberflächenanästhesie']
    },
    'isolation': {
        id: 'isolation',
        label: 'Trockenlegung',
        type: 'select',
        options: ['Kofferdam', 'Relativ (Watterolle)', 'Absolut']
    },
    'conditioning': {
        id: 'conditioning',
        label: 'Konditionierung',
        type: 'string', // e.g. "Total-Etch"
    },
    'adhesive_system': {
        id: 'adhesive_system',
        label: 'Adhäsivsystem',
        type: 'string'
    },
    'matrix_system': {
        id: 'matrix_system',
        label: 'Matrizensystem',
        type: 'string'
    },
    'technique': {
        id: 'technique',
        label: 'Füllungstechnik',
        type: 'string' // e.g. "Schichttechnik"
    },
    'caries_depth': {
        id: 'caries_depth',
        label: 'Karies-Tiefe',
        type: 'select',
        options: ['Caries media', 'Caries profunda', 'Dentinnahe']
    },
    'pulp_capping': {
        id: 'pulp_capping',
        label: 'Überkappung',
        type: 'select',
        options: ['Indirekte Überkappung (Cp)', 'Direkte Überkappung (P)']
    },
    'underfilling': {
        id: 'underfilling',
        label: 'Unterfüllung',
        type: 'string'
    },
    'bmf': {
        id: 'bmf',
        label: 'Besondere Maßnahmen',
        type: 'string'
    },
    'caries_detector': {
        id: 'caries_detector',
        label: 'Kariesdetektor',
        type: 'boolean'
    },
    'bite_registration': {
        id: 'bite_registration',
        label: 'Aufbissregistrierung',
        type: 'string'
    },
    'fluoridation': {
        id: 'fluoridation',
        label: 'Fluoridierung',
        type: 'string'
    },
    'xray': {
        id: 'xray',
        label: 'Röntgen',
        type: 'string'
    },

    // Endo
    'length_measurement': {
        id: 'length_measurement',
        label: 'Längenmessung',
        type: 'string'
    },
    'machine_preparation': {
        id: 'machine_preparation',
        label: 'Aufbereitung',
        type: 'string'
    },
    'medication': {
        id: 'medication',
        label: 'Med. Einlage',
        type: 'string'
    },
    'root_filling': {
        id: 'root_filling',
        label: 'Wurzelfüllung',
        type: 'string'
    }
};
