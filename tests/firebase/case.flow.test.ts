/**
 * Case Flow Emulator Tests
 *
 * Tests the case lifecycle: create draft → update → finalize → immutable
 */

import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
    RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';

let testEnv: RulesTestEnvironment;

const PROJECT_ID = 'docudent-test';
const ORG_ID = 'org_test123';
const PRACTICE_ID = 'prac_test456';
const PROVIDER_ID = 'prov_test789';
const PROVIDER_UID = 'user_provider';
const CASE_ID = 'case_flow_test';

const PROVIDER_CLAIMS = {
    orgs: { [ORG_ID]: ['member'] },
    practices: { [PRACTICE_ID]: ['provider'] },
};

function authedDb(uid: string, claims: object) {
    return testEnv.authenticatedContext(uid, claims).firestore();
}

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

    // Seed org + practice
    await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'orgs', ORG_ID), { id: ORG_ID, name: 'Test', status: 'active' });
        await setDoc(doc(db, `orgs/${ORG_ID}/practices`, PRACTICE_ID), {
            id: PRACTICE_ID,
            orgId: ORG_ID,
            name: 'Test Practice',
            status: 'active',
        });
    });
});

const casePath = `orgs/${ORG_ID}/practices/${PRACTICE_ID}/cases`;

function createDraftDoc() {
    return {
        id: CASE_ID,
        orgId: ORG_ID,
        practiceId: PRACTICE_ID,
        providerId: PROVIDER_ID,
        patientRef: 'patient_hash_123',
        treatmentId: 'fuellung',
        status: 'draft',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: PROVIDER_UID,
    };
}

describe('Case Flow Tests', () => {
    it('provider can create draft case', async () => {
        const db = authedDb(PROVIDER_UID, PROVIDER_CLAIMS);
        await assertSucceeds(setDoc(doc(db, casePath, CASE_ID), createDraftDoc()));
    });

    it('cannot create case with status != draft', async () => {
        const db = authedDb(PROVIDER_UID, PROVIDER_CLAIMS);
        const badDoc = { ...createDraftDoc(), status: 'finalized' };
        await assertFails(setDoc(doc(db, casePath, CASE_ID), badDoc));
    });

    it('provider can update draft case', async () => {
        // Seed draft
        await testEnv.withSecurityRulesDisabled(async (context) => {
            await setDoc(doc(context.firestore(), casePath, CASE_ID), createDraftDoc());
        });

        const db = authedDb(PROVIDER_UID, PROVIDER_CLAIMS);
        await assertSucceeds(updateDoc(doc(db, casePath, CASE_ID), {
            'input.rawDictation': '36 mod profunda',
            updatedAt: Timestamp.now(),
        }));
    });

    it('provider can finalize draft with finalizedAt', async () => {
        // Seed draft
        await testEnv.withSecurityRulesDisabled(async (context) => {
            await setDoc(doc(context.firestore(), casePath, CASE_ID), createDraftDoc());
        });

        const db = authedDb(PROVIDER_UID, PROVIDER_CLAIMS);
        await assertSucceeds(updateDoc(doc(db, casePath, CASE_ID), {
            status: 'finalized',
            finalizedAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            reproducibility: {
                playbookVersionId: 'v2.3.1',
                extractionVersion: 'v6',
                resolvedSettingsHash: 'sha256:abc123',
            },
        }));
    });

    it('cannot finalize without finalizedAt', async () => {
        // Seed draft
        await testEnv.withSecurityRulesDisabled(async (context) => {
            await setDoc(doc(context.firestore(), casePath, CASE_ID), createDraftDoc());
        });

        const db = authedDb(PROVIDER_UID, PROVIDER_CLAIMS);
        await assertFails(updateDoc(doc(db, casePath, CASE_ID), {
            status: 'finalized',
            // Missing finalizedAt!
            updatedAt: Timestamp.now(),
        }));
    });

    it('finalized case cannot be modified', async () => {
        // Seed finalized case
        await testEnv.withSecurityRulesDisabled(async (context) => {
            await setDoc(doc(context.firestore(), casePath, CASE_ID), {
                ...createDraftDoc(),
                status: 'finalized',
                finalizedAt: Timestamp.now(),
            });
        });

        const db = authedDb(PROVIDER_UID, PROVIDER_CLAIMS);
        await assertFails(updateDoc(doc(db, casePath, CASE_ID), {
            'input.rawDictation': 'hacked',
            updatedAt: Timestamp.now(),
        }));
    });

    it('finalized case can be marked as amended', async () => {
        // Seed finalized case
        await testEnv.withSecurityRulesDisabled(async (context) => {
            await setDoc(doc(context.firestore(), casePath, CASE_ID), {
                ...createDraftDoc(),
                status: 'finalized',
                finalizedAt: Timestamp.now(),
            });
        });

        const db = authedDb(PROVIDER_UID, PROVIDER_CLAIMS);
        await assertSucceeds(updateDoc(doc(db, casePath, CASE_ID), {
            status: 'amended',
            updatedAt: Timestamp.now(),
            amendmentReason: 'Patient correction requested',
        }));
    });
});
