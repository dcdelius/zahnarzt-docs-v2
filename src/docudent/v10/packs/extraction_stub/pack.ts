/**
 * M48: Extraction Stub Pack — Minimal Pack for UI Dry Run
 * 
 * Proves: Adding a new pack requires ZERO UI code changes.
 * UI renders controls/settings/askbacks from contract automatically.
 */

import type { TreatmentPack, PackUiContractV1 } from '../types';

// ═══════════════════════════════════════════════════════════════
// EXTRACTION STUB PACK
// ═══════════════════════════════════════════════════════════════

export function createExtractionStubPack(): TreatmentPack {
    return {
        id: 'extraction_stub',
        version: '0.1.0',
        meta: {
            label: 'Extraktion (Stub)',
            description: 'Minimal stub pack for UI testing',
        },

        // No treatment KB - unsupported in pipeline
        getTreatmentKb() {
            return null;
        },

        // M48: Empty scenarios - stub is for UI testing only, not pipeline
        getGoldenClinicalScenarios() {
            return [];
        },

        getCombinabilityGoldens() {
            return [];
        },

        // M48: UI Contract (this is what makes UI work automatically)
        getUiContract(): PackUiContractV1 {
            return {
                chipControls: [
                    // Boolean control
                    {
                        chipId: 'stub_komplikation',
                        mode: 'toggle',
                        label: 'Komplikation',
                        group: 'optional',
                    },
                    // Param control (uses existing LA mapping)
                    {
                        chipId: 'la_type',
                        mode: 'param',
                        label: 'Anästhesie',
                        group: 'relevant',
                        pin: true,
                        options: [
                            { value: 'none', label: 'Ohne LA' },
                            { value: 'infiltr', label: 'Infiltration' },
                            { value: 'leitung', label: 'Leitung' },
                        ],
                        chipMapping: {
                            'infiltr': 'la_infiltr',
                            'leitung': 'la_leitung',
                        },
                    },
                ],

                settingsSchema: {
                    practice: [
                        {
                            key: 'defaultExtractorApproach',
                            label: 'Standard-Technik',
                            type: 'enum',
                            options: [
                                { value: 'einfach', label: 'Einfach' },
                                { value: 'chirurgisch', label: 'Chirurgisch' },
                            ],
                        },
                    ],
                    user: [
                        {
                            key: 'defaultLAType',
                            label: 'Standard-LA',
                            type: 'enum',
                            options: [
                                { value: 'infiltr', label: 'Infiltration' },
                                { value: 'leitung', label: 'Leitung' },
                                { value: 'ila', label: 'Intraligamentär (ILA)' },
                            ],
                            mapsToAskbackId: 'medical_la_type',
                        },
                    ],
                },

                askbackPolicy: {
                    criticalAskbacks: [
                        'extraction_tooth', // M48: Must include tooth identifier
                    ],
                    skippableAskbacks: [
                        'medical_la_type',
                    ],
                },

                dictationHints: [
                    'Sag "Extraktion 36" für einfache Extraktion',
                ],
            };
        },
    };
}
