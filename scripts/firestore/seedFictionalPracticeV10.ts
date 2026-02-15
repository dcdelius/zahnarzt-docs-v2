import 'dotenv/config';
import fs from 'node:fs';
import process from 'node:process';
import admin from 'firebase-admin';
import { TREATMENT_DEFINITIONS } from '../../src/docudent/v10/settings/treatmentMaster';

type Args = {
    practiceId: string;
    dryRun: boolean;
};

type SeedUser = {
    id: string;
    profile: Record<string, unknown>;
    settings: Record<string, unknown>;
};

const DEFAULT_PRACTICE_ID = 'demo-praxis-nord-2026';

function parseArgs(argv: string[]): Args {
    const args: Args = { practiceId: DEFAULT_PRACTICE_ID, dryRun: false };
    for (const arg of argv) {
        if (arg.startsWith('--practice-id=')) {
            args.practiceId = arg.replace('--practice-id=', '').trim() || DEFAULT_PRACTICE_ID;
        } else if (arg === '--dry-run') {
            args.dryRun = true;
        }
    }
    return args;
}

function ensureAdminInitialized() {
    if (admin.apps.length > 0) return;
    const servicePath = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!servicePath) {
        throw new Error('Missing FIREBASE_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS');
    }
    const raw = fs.readFileSync(servicePath, 'utf-8');
    const credential = admin.credential.cert(JSON.parse(raw));
    admin.initializeApp({ credential });
}

function buildPracticeSeed(practiceId: string) {
    const enabledTreatments = Object.keys(TREATMENT_DEFINITIONS).sort();

    const practiceDoc = {
        name: 'Praxis Nordblick (Demo)',
        active: true,
        version: '1.0.0',
        seededAt: '2026-02-15T00:00:00.000Z',
        seedTag: 'fictional_v10_practice_pack',
        seedMode: 'upsert',
        practiceId,
    };

    const practiceSettings = {
        version: '1.0.0',
        strictKzvMode: true,
        defaultIsolation: 'kofferdam',
        defaultRoentgenPolicy: 'on_indication',
        defaultAnestheticAgentId: 'la_ultracain_ds_forte',
        defaultMaterial: 'komposit',
        enabledTreatments,
        treatments: {
            endo: {
                defaultWLMethod: 'both',
                defaultWFTechnique: 'warm',
                defaultIrrigationProtocol: 'naocl_edta',
                defaultInstrumentationMode: 'rotary',
                defaultSealer: true,
            },
            fuellung: {
                defaultSchichtung: 'mehrschicht',
                defaultPulpaschutz: 'indirekt',
                defaultUeberkappung: 'keine',
                defaultHemostasis: 'yes',
                defaultSensitivityFollowup: 'yes',
                defaultMatrixSystem: 'sectional',
                defaultKeilUsed: true,
                defaultKontaktpunktCheck: true,
                aufklaerungEnabled: true,
            },
        },
        materials: {
            anesthesia: [
                'Ultracain D-S forte',
                'Ultracain D-S',
                'Ubistesin forte',
            ],
            fuellung: [
                'Filtek Supreme XTE',
                'Filtek One Bulk Fill',
                'Tetric EvoFlow',
                'Scotchbond Universal Plus',
                'Ultra-Etch 35%',
                'Palodent V3',
                'Biodentine',
            ],
            endo: [
                'Natriumhypochlorit 3%',
                'EDTA 17%',
                'CHX 2%',
                'Calciumhydroxid',
                'Ledermix',
                'Guttapercha warm',
                'AH Plus Sealer',
            ],
        },
        materialCatalog: {
            fuellung: [
                'comp_universal_filtek_supreme',
                'comp_bulk_filtek_one',
                'comp_flow_tetric_evoflow',
                'adh_universal_scotchbond_plus',
                'etch_ultraetch_35',
                'matrix_sectional_palodent_v3',
                'liner_biodentine',
                'la_ultracain_ds_forte',
            ],
        },
        inventory: {
            endo: {
                microscope: true,
                apexLocator: true,
                xray: true,
                motorRotary: true,
                motorReciproc: true,
                obturationWarm: true,
                irrigantNaOCl: true,
                irrigantEDTA: true,
            },
            fuellung: {
                kofferdamKit: true,
                bulkFill: true,
                flowableComposite: true,
                adhesiveUniversal: true,
                adhesiveEtchRinse: true,
                etchGel: true,
                sectionalMatrix: true,
                tofflemireMatrix: true,
                stripMatrix: true,
            },
        },
    };

    const users: SeedUser[] = [
        {
            id: 'dr-anna-keller',
            profile: {
                name: 'Dr. Anna Keller',
                role: 'practice_admin',
                email: 'anna.keller@praxis-nordblick.demo',
                active: true,
                avatarColor: '#3b82f6',
                createdAt: '2026-02-15T00:00:00.000Z',
            },
            settings: {
                version: '1.0.0',
                preferredTextLength: 'lang',
                defaultLAType: 'leitung',
                defaultLATypeUkPosterior: 'leitung',
                defaultAnestheticAgentId: 'la_ultracain_ds_forte',
                defaultIsolation: 'kofferdam',
                defaultCappingMaterial: 'biodentin',
                defaultHasMKV: false,
                enabledTreatments,
                treatments: {
                    endo: {
                        defaultWLMethod: 'both',
                        defaultWFTechnique: 'warm',
                        defaultIrrigationProtocol: 'naocl_edta',
                        singleVisit: false,
                        defaultSealer: true,
                    },
                    fuellung: {
                        defaultSchichtung: 'mehrschicht',
                        defaultCompositeMaterialId: 'comp_universal_filtek_supreme',
                        defaultAdhesiveMaterialId: 'adh_universal_scotchbond_plus',
                        defaultEtchMaterialId: 'etch_ultraetch_35',
                        defaultMatrixSystem: 'sectional',
                        defaultFlowableBase: true,
                        defaultFlowableMaterialId: 'comp_flow_tetric_evoflow',
                    },
                },
            },
        },
        {
            id: 'dr-ben-weiss',
            profile: {
                name: 'Dr. Ben Weiss',
                role: 'provider',
                email: 'ben.weiss@praxis-nordblick.demo',
                active: true,
                avatarColor: '#10b981',
                createdAt: '2026-02-15T00:00:00.000Z',
            },
            settings: {
                version: '1.0.0',
                preferredTextLength: 'mittel',
                defaultLAType: 'infiltration',
                defaultLATypeUkPosterior: 'leitung',
                defaultAnestheticAgentId: 'la_ultracain_ds',
                defaultIsolation: 'relative',
                defaultCappingMaterial: 'mta',
                defaultHasMKV: false,
                enabledTreatments,
                treatments: {
                    endo: {
                        defaultWLMethod: 'elektrisch',
                        defaultWFTechnique: 'kalt',
                        defaultIrrigationProtocol: 'naocl_edta',
                        singleVisit: true,
                        defaultSealer: true,
                    },
                    fuellung: {
                        defaultSchichtung: 'bulk',
                        defaultCompositeMaterialId: 'comp_bulk_filtek_one',
                        defaultAdhesiveMaterialId: 'adh_universal_scotchbond_plus',
                        defaultEtchMaterialId: 'etch_ultraetch_35',
                        defaultMatrixSystem: 'tofflemire',
                        defaultFlowableBase: true,
                        defaultFlowableMaterialId: 'comp_flow_tetric_evoflow',
                    },
                },
            },
        },
        {
            id: 'dr-clara-neumann',
            profile: {
                name: 'Dr. Clara Neumann',
                role: 'provider',
                email: 'clara.neumann@praxis-nordblick.demo',
                active: true,
                avatarColor: '#f59e0b',
                createdAt: '2026-02-15T00:00:00.000Z',
            },
            settings: {
                version: '1.0.0',
                preferredTextLength: 'kurz',
                defaultLAType: 'ila',
                defaultLATypeUkPosterior: 'leitung',
                defaultAnestheticAgentId: 'la_ubistesin_forte',
                defaultIsolation: 'kofferdam',
                defaultCappingMaterial: 'caoh2',
                defaultHasMKV: true,
                enabledTreatments,
                treatments: {
                    endo: {
                        defaultWLMethod: 'both',
                        defaultWFTechnique: 'einzel',
                        defaultIrrigationProtocol: 'naocl_only',
                        singleVisit: false,
                        defaultSealer: true,
                    },
                    fuellung: {
                        defaultSchichtung: 'mehrschicht',
                        defaultCompositeMaterialId: 'comp_universal_tetric_evoceram',
                        defaultAdhesiveMaterialId: 'adh_universal_adhese',
                        defaultEtchMaterialId: 'etch_totaletch_37',
                        defaultMatrixSystem: 'sectional',
                        defaultFlowableBase: false,
                    },
                },
            },
        },
    ];

    return { practiceDoc, practiceSettings, users };
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    ensureAdminInitialized();
    const db = admin.firestore();
    const { practiceDoc, practiceSettings, users } = buildPracticeSeed(args.practiceId);

    console.log(`[seed-practice] practiceId=${args.practiceId} dryRun=${args.dryRun ? 'true' : 'false'}`);
    console.log(`[seed-practice] users=${users.map(u => u.id).join(', ')}`);

    if (args.dryRun) return;

    const batch = db.batch();
    batch.set(db.doc(`Praxen/${args.practiceId}`), practiceDoc, { merge: true });
    batch.set(db.doc(`Praxen/${args.practiceId}/Settings/v10`), practiceSettings, { merge: true });

    for (const user of users) {
        batch.set(db.doc(`Praxen/${args.practiceId}/Benutzer/${user.id}`), user.profile, { merge: true });
        batch.set(db.doc(`Praxen/${args.practiceId}/Benutzer/${user.id}/Settings/v10`), user.settings, { merge: true });
    }

    await batch.commit();
    console.log(`[seed-practice] seeded practice and ${users.length} users.`);
}

main().catch(error => {
    console.error('[seed-practice] failed:', error);
    process.exit(1);
});
