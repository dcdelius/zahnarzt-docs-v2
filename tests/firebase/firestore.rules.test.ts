/**
 * Firebase Emulator Tests for Firestore Security Rules
 *
 * Tests the multi-tenant model: orgs/practices/providers/memberships/settingsOverrides/cases/patients_private
 *
 * Run with: firebase emulators:exec --only firestore "npx vitest run tests/firebase/firestore.rules.test.ts"
 */

import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
    RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// TEST ENVIRONMENT SETUP
// ═══════════════════════════════════════════════════════════════

let testEnv: RulesTestEnvironment;

const PROJECT_ID = 'docudent-test';
const ORG_ID = 'org_test123';
const PRACTICE_ID = 'prac_test456';
const PROVIDER_ID = 'prov_test789';
const ROOM_ID = 'room_test012';
const CASE_ID = 'case_test345';
const PATIENT_REF = 'patient_hash_abc';

// User IDs
const ORG_ADMIN_UID = 'user_org_admin';
const PRACTICE_ADMIN_UID = 'user_practice_admin';
const PROVIDER_UID = 'user_provider';
const ASSISTANT_UID = 'user_assistant';
const VIEWER_UID = 'user_viewer';
const OUTSIDER_UID = 'user_outsider';

// ═══════════════════════════════════════════════════════════════
// CLAIMS FIXTURES
// ═══════════════════════════════════════════════════════════════

const CLAIMS = {
    orgAdmin: {
        orgs: { [ORG_ID]: ['org_admin'] },
        practices: { [PRACTICE_ID]: ['practice_admin'] },
    },
    practiceAdmin: {
        orgs: { [ORG_ID]: ['member'] },
        practices: { [PRACTICE_ID]: ['practice_admin'] },
    },
    provider: {
        orgs: { [ORG_ID]: ['member'] },
        practices: { [PRACTICE_ID]: ['provider'] },
    },
    assistant: {
        orgs: { [ORG_ID]: ['member'] },
        practices: { [PRACTICE_ID]: ['assistant'] },
    },
    viewer: {
        orgs: { [ORG_ID]: ['member'] },
        practices: { [PRACTICE_ID]: ['viewer'] },
    },
    outsider: {
        orgs: {},
        practices: {},
    },
};

// ═══════════════════════════════════════════════════════════════
// HELPER: Get authenticated Firestore
// ═══════════════════════════════════════════════════════════════

function authedDb(uid: string, claims: object) {
    return testEnv.authenticatedContext(uid, claims).firestore();
}

function unauthDb() {
    return testEnv.unauthenticatedContext().firestore();
}

// ═══════════════════════════════════════════════════════════════
// SETUP / TEARDOWN
// ═══════════════════════════════════════════════════════════════

beforeAll(async () => {
    // Set emulator host for Firebase SDK
    process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

    const rules = readFileSync('firestore.rules', 'utf8');

    testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: { rules },
    });
});

afterAll(async () => {
    await testEnv.cleanup();
});

beforeEach(async () => {
    await testEnv.clearFirestore();
});

// ═══════════════════════════════════════════════════════════════
// SEED HELPERS
// ═══════════════════════════════════════════════════════════════

async function seedOrg() {
    await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'orgs', ORG_ID), {
            id: ORG_ID,
            name: 'Test Org',
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: ORG_ADMIN_UID,
        });
    });
}

async function seedPractice() {
    await seedOrg();
    await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, `orgs/${ORG_ID}/practices`, PRACTICE_ID), {
            id: PRACTICE_ID,
            orgId: ORG_ID,
            name: 'Test Practice',
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    });
}

async function seedProvider() {
    await seedPractice();
    await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, `orgs/${ORG_ID}/practices/${PRACTICE_ID}/providers`, PROVIDER_ID), {
            id: PROVIDER_ID,
            practiceId: PRACTICE_ID,
            orgId: ORG_ID,
            userId: PROVIDER_UID, // Links to auth UID
            displayName: 'Dr. Test Provider',
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    });
}

async function seedDraftCase() {
    await seedPractice();
    await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, `orgs/${ORG_ID}/practices/${PRACTICE_ID}/cases`, CASE_ID), {
            id: CASE_ID,
            orgId: ORG_ID,
            practiceId: PRACTICE_ID,
            providerId: PROVIDER_ID,
            patientRef: PATIENT_REF,
            treatmentId: 'fuellung',
            status: 'draft',
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: PROVIDER_UID,
        });
    });
}

async function seedFinalizedCase() {
    await seedPractice();
    await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, `orgs/${ORG_ID}/practices/${PRACTICE_ID}/cases`, CASE_ID), {
            id: CASE_ID,
            orgId: ORG_ID,
            practiceId: PRACTICE_ID,
            providerId: PROVIDER_ID,
            patientRef: PATIENT_REF,
            treatmentId: 'fuellung',
            status: 'finalized',
            finalizedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: PROVIDER_UID,
        });
    });
}

// ═══════════════════════════════════════════════════════════════
// A) ORGS TESTS
// ═══════════════════════════════════════════════════════════════

describe('A) Orgs', () => {
    it('outsider cannot read org', async () => {
        await seedOrg();
        const db = authedDb(OUTSIDER_UID, CLAIMS.outsider);
        await assertFails(getDoc(doc(db, 'orgs', ORG_ID)));
    });

    it('org member can read org', async () => {
        await seedOrg();
        const db = authedDb(PROVIDER_UID, CLAIMS.provider);
        await assertSucceeds(getDoc(doc(db, 'orgs', ORG_ID)));
    });

    it('org_admin can update org', async () => {
        await seedOrg();
        const db = authedDb(ORG_ADMIN_UID, CLAIMS.orgAdmin);
        await assertSucceeds(updateDoc(doc(db, 'orgs', ORG_ID), { name: 'Updated Name' }));
    });

    it('non-admin cannot update org', async () => {
        await seedOrg();
        const db = authedDb(PROVIDER_UID, CLAIMS.provider);
        await assertFails(updateDoc(doc(db, 'orgs', ORG_ID), { name: 'Hacked' }));
    });

    it('unauthenticated cannot read org', async () => {
        await seedOrg();
        const db = unauthDb();
        await assertFails(getDoc(doc(db, 'orgs', ORG_ID)));
    });
});

// ═══════════════════════════════════════════════════════════════
// B) PRACTICES TESTS
// ═══════════════════════════════════════════════════════════════

describe('B) Practices', () => {
    it('org member can read practice', async () => {
        await seedPractice();
        const db = authedDb(PROVIDER_UID, CLAIMS.provider);
        await assertSucceeds(getDoc(doc(db, `orgs/${ORG_ID}/practices`, PRACTICE_ID)));
    });

    it('practice_admin can update practice', async () => {
        await seedPractice();
        const db = authedDb(PRACTICE_ADMIN_UID, CLAIMS.practiceAdmin);
        await assertSucceeds(updateDoc(doc(db, `orgs/${ORG_ID}/practices`, PRACTICE_ID), { name: 'Updated' }));
    });

    it('provider cannot update practice', async () => {
        await seedPractice();
        const db = authedDb(PROVIDER_UID, CLAIMS.provider);
        await assertFails(updateDoc(doc(db, `orgs/${ORG_ID}/practices`, PRACTICE_ID), { name: 'Hacked' }));
    });

    it('outsider cannot read practice', async () => {
        await seedPractice();
        const db = authedDb(OUTSIDER_UID, CLAIMS.outsider);
        await assertFails(getDoc(doc(db, `orgs/${ORG_ID}/practices`, PRACTICE_ID)));
    });
});

// ═══════════════════════════════════════════════════════════════
// C) SETTINGS OVERRIDES TESTS (Critical)
// ═══════════════════════════════════════════════════════════════

describe('C) SettingsOverrides', () => {
    const orgOverrideId = 'org';
    const practiceOverrideId = `practice_${PRACTICE_ID}`;
    const providerOverrideId = `provider_${PROVIDER_ID}`;

    it('org_admin can write scope=org', async () => {
        await seedOrg();
        const db = authedDb(ORG_ADMIN_UID, CLAIMS.orgAdmin);
        await assertSucceeds(setDoc(doc(db, `orgs/${ORG_ID}/settingsOverrides`, orgOverrideId), {
            id: orgOverrideId,
            orgId: ORG_ID,
            scope: 'org',
            scopeId: null,
            overrides: { 'fuellung.defaults.trockenlegung': 'kofferdam' },
            updatedAt: new Date(),
            updatedBy: ORG_ADMIN_UID,
        }));
    });

    it('practice_admin cannot write scope=org', async () => {
        await seedOrg();
        const db = authedDb(PRACTICE_ADMIN_UID, CLAIMS.practiceAdmin);
        await assertFails(setDoc(doc(db, `orgs/${ORG_ID}/settingsOverrides`, orgOverrideId), {
            id: orgOverrideId,
            orgId: ORG_ID,
            scope: 'org',
            scopeId: null,
            overrides: {},
            updatedAt: new Date(),
            updatedBy: PRACTICE_ADMIN_UID,
        }));
    });

    it('practice_admin can write scope=practice for their practice', async () => {
        await seedPractice();
        const db = authedDb(PRACTICE_ADMIN_UID, CLAIMS.practiceAdmin);
        await assertSucceeds(setDoc(doc(db, `orgs/${ORG_ID}/settingsOverrides`, practiceOverrideId), {
            id: practiceOverrideId,
            orgId: ORG_ID,
            scope: 'practice',
            scopeId: PRACTICE_ID,
            overrides: { 'endo.defaults.spuelprotokoll': 'naocl_edta' },
            updatedAt: new Date(),
            updatedBy: PRACTICE_ADMIN_UID,
        }));
    });

    it('provider cannot write scope=practice', async () => {
        await seedPractice();
        const db = authedDb(PROVIDER_UID, CLAIMS.provider);
        await assertFails(setDoc(doc(db, `orgs/${ORG_ID}/settingsOverrides`, practiceOverrideId), {
            id: practiceOverrideId,
            orgId: ORG_ID,
            scope: 'practice',
            scopeId: PRACTICE_ID,
            overrides: {},
            updatedAt: new Date(),
            updatedBy: PROVIDER_UID,
        }));
    });

    it('provider can write scope=provider for OWN providerId', async () => {
        await seedProvider(); // Creates provider doc with userId = PROVIDER_UID
        const db = authedDb(PROVIDER_UID, CLAIMS.provider);
        await assertSucceeds(setDoc(doc(db, `orgs/${ORG_ID}/settingsOverrides`, providerOverrideId), {
            id: providerOverrideId,
            orgId: ORG_ID,
            scope: 'provider',
            scopeId: PROVIDER_ID,
            practiceId: PRACTICE_ID, // Required for rule check
            overrides: { 'fuellung.defaults.trockenlegung': 'relativ' },
            updatedAt: new Date(),
            updatedBy: PROVIDER_UID,
        }));
    });

    it('provider cannot write scope=provider for OTHER providerId', async () => {
        await seedProvider();
        const db = authedDb(PROVIDER_UID, CLAIMS.provider);
        const otherProviderId = 'prov_other999';
        await assertFails(setDoc(doc(db, `orgs/${ORG_ID}/settingsOverrides`, `provider_${otherProviderId}`), {
            id: `provider_${otherProviderId}`,
            orgId: ORG_ID,
            scope: 'provider',
            scopeId: otherProviderId, // Not their own
            practiceId: PRACTICE_ID,
            overrides: {},
            updatedAt: new Date(),
            updatedBy: PROVIDER_UID,
        }));
    });

    it('outsider cannot read settingsOverrides', async () => {
        await seedOrg();
        // First create an override with admin
        await testEnv.withSecurityRulesDisabled(async (context) => {
            await setDoc(doc(context.firestore(), `orgs/${ORG_ID}/settingsOverrides`, orgOverrideId), {
                id: orgOverrideId,
                orgId: ORG_ID,
                scope: 'org',
                scopeId: null,
                overrides: {},
                updatedAt: new Date(),
                updatedBy: ORG_ADMIN_UID,
            });
        });

        const db = authedDb(OUTSIDER_UID, CLAIMS.outsider);
        await assertFails(getDoc(doc(db, `orgs/${ORG_ID}/settingsOverrides`, orgOverrideId)));
    });

    it('org member can read settingsOverrides', async () => {
        await seedOrg();
        await testEnv.withSecurityRulesDisabled(async (context) => {
            await setDoc(doc(context.firestore(), `orgs/${ORG_ID}/settingsOverrides`, orgOverrideId), {
                id: orgOverrideId,
                orgId: ORG_ID,
                scope: 'org',
                scopeId: null,
                overrides: {},
                updatedAt: new Date(),
                updatedBy: ORG_ADMIN_UID,
            });
        });

        const db = authedDb(PROVIDER_UID, CLAIMS.provider);
        await assertSucceeds(getDoc(doc(db, `orgs/${ORG_ID}/settingsOverrides`, orgOverrideId)));
    });
});

// ═══════════════════════════════════════════════════════════════
// D) CASES TESTS (Immutability)
// ═══════════════════════════════════════════════════════════════

describe('D) Cases - Immutability', () => {
    const casePath = `orgs/${ORG_ID}/practices/${PRACTICE_ID}/cases`;

    it('provider can create draft case', async () => {
        await seedPractice();
        const db = authedDb(PROVIDER_UID, CLAIMS.provider);
        await assertSucceeds(setDoc(doc(db, casePath, 'new_case_1'), {
            id: 'new_case_1',
            orgId: ORG_ID,
            practiceId: PRACTICE_ID,
            providerId: PROVIDER_ID,
            patientRef: PATIENT_REF,
            treatmentId: 'fuellung',
            status: 'draft',
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: PROVIDER_UID,
        }));
    });

    it('assistant can create draft case', async () => {
        await seedPractice();
        const db = authedDb(ASSISTANT_UID, CLAIMS.assistant);
        await assertSucceeds(setDoc(doc(db, casePath, 'new_case_2'), {
            id: 'new_case_2',
            orgId: ORG_ID,
            practiceId: PRACTICE_ID,
            providerId: PROVIDER_ID,
            patientRef: PATIENT_REF,
            treatmentId: 'fuellung',
            status: 'draft',
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: ASSISTANT_UID,
        }));
    });

    it('create must fail if status != draft', async () => {
        await seedPractice();
        const db = authedDb(PROVIDER_UID, CLAIMS.provider);
        await assertFails(setDoc(doc(db, casePath, 'bad_case'), {
            id: 'bad_case',
            orgId: ORG_ID,
            practiceId: PRACTICE_ID,
            providerId: PROVIDER_ID,
            patientRef: PATIENT_REF,
            treatmentId: 'fuellung',
            status: 'finalized', // NOT ALLOWED on create
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: PROVIDER_UID,
        }));
    });

    it('draft update allowed for provider', async () => {
        await seedDraftCase();
        const db = authedDb(PROVIDER_UID, CLAIMS.provider);
        await assertSucceeds(updateDoc(doc(db, casePath, CASE_ID), {
            updatedAt: new Date(),
            // Add some data
            'input.rawDictation': '36 mod profunda',
        }));
    });

    it('draft->finalized allowed with finalizedAt', async () => {
        await seedDraftCase();
        const db = authedDb(PROVIDER_UID, CLAIMS.provider);
        await assertSucceeds(updateDoc(doc(db, casePath, CASE_ID), {
            status: 'finalized',
            finalizedAt: new Date(),
            updatedAt: new Date(),
        }));
    });

    it('draft->finalized fails without finalizedAt', async () => {
        await seedDraftCase();
        const db = authedDb(PROVIDER_UID, CLAIMS.provider);
        await assertFails(updateDoc(doc(db, casePath, CASE_ID), {
            status: 'finalized',
            // Missing finalizedAt!
            updatedAt: new Date(),
        }));
    });

    it('finalized case cannot be updated', async () => {
        await seedFinalizedCase();
        const db = authedDb(PROVIDER_UID, CLAIMS.provider);
        await assertFails(updateDoc(doc(db, casePath, CASE_ID), {
            'input.rawDictation': 'hacked',
            updatedAt: new Date(),
        }));
    });

    it('finalized->amended allowed with only status+updatedAt', async () => {
        await seedFinalizedCase();
        const db = authedDb(PROVIDER_UID, CLAIMS.provider);
        await assertSucceeds(updateDoc(doc(db, casePath, CASE_ID), {
            status: 'amended',
            updatedAt: new Date(),
            amendmentReason: 'Patient requested correction',
        }));
    });

    it('delete draft allowed for practice_admin', async () => {
        await seedDraftCase();
        const db = authedDb(PRACTICE_ADMIN_UID, CLAIMS.practiceAdmin);
        await assertSucceeds(deleteDoc(doc(db, casePath, CASE_ID)));
    });

    it('delete draft denied for provider', async () => {
        await seedDraftCase();
        const db = authedDb(PROVIDER_UID, CLAIMS.provider);
        await assertFails(deleteDoc(doc(db, casePath, CASE_ID)));
    });

    it('viewer cannot create case', async () => {
        await seedPractice();
        const db = authedDb(VIEWER_UID, CLAIMS.viewer);
        await assertFails(setDoc(doc(db, casePath, 'viewer_case'), {
            id: 'viewer_case',
            orgId: ORG_ID,
            practiceId: PRACTICE_ID,
            providerId: PROVIDER_ID,
            patientRef: PATIENT_REF,
            treatmentId: 'fuellung',
            status: 'draft',
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: VIEWER_UID,
        }));
    });

    it('outsider cannot read case', async () => {
        await seedDraftCase();
        const db = authedDb(OUTSIDER_UID, CLAIMS.outsider);
        await assertFails(getDoc(doc(db, casePath, CASE_ID)));
    });
});

// ═══════════════════════════════════════════════════════════════
// E) PATIENTS_PRIVATE TESTS
// ═══════════════════════════════════════════════════════════════

describe('E) patients_private', () => {
    const patientPath = `orgs/${ORG_ID}/patients_private`;

    async function seedPatient() {
        await seedPractice();
        await testEnv.withSecurityRulesDisabled(async (context) => {
            await setDoc(doc(context.firestore(), patientPath, PATIENT_REF), {
                id: PATIENT_REF,
                orgId: ORG_ID,
                practiceId: PRACTICE_ID,
                encryptedPayload: 'encrypted_data_here',
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        });
    }

    it('provider can read patient from their practice', async () => {
        await seedPatient();
        const db = authedDb(PROVIDER_UID, CLAIMS.provider);
        await assertSucceeds(getDoc(doc(db, patientPath, PATIENT_REF)));
    });

    it('practice_admin can read patient from their practice', async () => {
        await seedPatient();
        const db = authedDb(PRACTICE_ADMIN_UID, CLAIMS.practiceAdmin);
        await assertSucceeds(getDoc(doc(db, patientPath, PATIENT_REF)));
    });

    it('provider can write patient for their practice', async () => {
        await seedPractice();
        const db = authedDb(PROVIDER_UID, CLAIMS.provider);
        await assertSucceeds(setDoc(doc(db, patientPath, 'new_patient_1'), {
            id: 'new_patient_1',
            orgId: ORG_ID,
            practiceId: PRACTICE_ID,
            encryptedPayload: 'encrypted',
            createdAt: new Date(),
            updatedAt: new Date(),
        }));
    });

    it('outsider cannot read patient', async () => {
        await seedPatient();
        const db = authedDb(OUTSIDER_UID, CLAIMS.outsider);
        await assertFails(getDoc(doc(db, patientPath, PATIENT_REF)));
    });

    it('outsider cannot write patient', async () => {
        await seedPractice();
        const db = authedDb(OUTSIDER_UID, CLAIMS.outsider);
        await assertFails(setDoc(doc(db, patientPath, 'hacked_patient'), {
            id: 'hacked_patient',
            orgId: ORG_ID,
            practiceId: PRACTICE_ID,
            encryptedPayload: 'hacked',
            createdAt: new Date(),
            updatedAt: new Date(),
        }));
    });
});
