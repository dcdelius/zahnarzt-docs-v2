/**
 * Settings Overrides Service — Emulator Integration Tests
 *
 * Tests the settingsOverridesService against real Firestore rules.
 */

import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
    RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, Timestamp, Firestore } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import {
    SettingsOverridesService,
    SettingsValidationError,
    generateOverrideId,
} from '../../src/docudent/core/settings/settingsOverridesService';
import { validateOverrides } from '../../src/docudent/contracts/settingsValidator';

let testEnv: RulesTestEnvironment;

const PROJECT_ID = 'docudent-test';
const ORG_ID = 'org_test123';
const PRACTICE_ID = 'prac_test456';
const PROVIDER_ID = 'prov_test789';
const ROOM_ID = 'room_test012';

// User IDs
const ORG_ADMIN_UID = 'user_org_admin';
const PRACTICE_ADMIN_UID = 'user_practice_admin';
const PROVIDER_UID = 'user_provider';

// Claims fixtures
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
};

function authedDb(uid: string, claims: object) {
    return testEnv.authenticatedContext(uid, claims).firestore();
}

beforeAll(async () => {
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

    // Seed org + practice + provider
    await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'orgs', ORG_ID), {
            id: ORG_ID,
            name: 'Test Org',
            status: 'active',
        });
        await setDoc(doc(db, `orgs/${ORG_ID}/practices`, PRACTICE_ID), {
            id: PRACTICE_ID,
            orgId: ORG_ID,
            name: 'Test Practice',
            status: 'active',
        });
        // Provider doc with userId link
        await setDoc(doc(db, `orgs/${ORG_ID}/practices/${PRACTICE_ID}/providers`, PROVIDER_ID), {
            id: PROVIDER_ID,
            practiceId: PRACTICE_ID,
            orgId: ORG_ID,
            userId: PROVIDER_UID, // Links to auth UID
            displayName: 'Dr. Test Provider',
            status: 'active',
        });
        // Room doc
        await setDoc(doc(db, `orgs/${ORG_ID}/practices/${PRACTICE_ID}/rooms`, ROOM_ID), {
            id: ROOM_ID,
            practiceId: PRACTICE_ID,
            name: 'Treatment Room 1',
        });
    });
});

// ═══════════════════════════════════════════════════════════════
// HELPER: Create service with authed Firestore
// ═══════════════════════════════════════════════════════════════

function createAuthedService(uid: string, claims: object): SettingsOverridesService {
    const db = authedDb(uid, claims) as unknown as Firestore;
    return new SettingsOverridesService(db);
}

// ═══════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════

describe('SettingsOverridesService Emulator Tests', () => {
    describe('org scope', () => {
        it('org_admin can write scope=org', async () => {
            const service = createAuthedService(ORG_ADMIN_UID, CLAIMS.orgAdmin);

            const overrideId = await service.writeSettingsOverride({
                orgId: ORG_ID,
                scope: 'org',
                overrides: { 'fuellung.defaults.trockenlegung': 'kofferdam' },
                updatedBy: ORG_ADMIN_UID,
            });

            expect(overrideId).toBe('org');
        });

        it('practice_admin cannot write scope=org', async () => {
            const service = createAuthedService(PRACTICE_ADMIN_UID, CLAIMS.practiceAdmin);

            await expect(service.writeSettingsOverride({
                orgId: ORG_ID,
                scope: 'org',
                overrides: { 'fuellung.defaults.trockenlegung': 'kofferdam' },
                updatedBy: PRACTICE_ADMIN_UID,
            })).rejects.toThrow(); // Firestore permission denied
        });
    });

    describe('practice scope', () => {
        it('practice_admin can write scope=practice for own practice', async () => {
            const service = createAuthedService(PRACTICE_ADMIN_UID, CLAIMS.practiceAdmin);

            const overrideId = await service.writeSettingsOverride({
                orgId: ORG_ID,
                scope: 'practice',
                scopeId: PRACTICE_ID,
                overrides: { 'fuellung.defaults.trockenlegung': 'relativ' },
                updatedBy: PRACTICE_ADMIN_UID,
            });

            expect(overrideId).toBe(`practice_${PRACTICE_ID}`);
        });

        it('provider cannot write scope=practice', async () => {
            const service = createAuthedService(PROVIDER_UID, CLAIMS.provider);

            await expect(service.writeSettingsOverride({
                orgId: ORG_ID,
                scope: 'practice',
                scopeId: PRACTICE_ID,
                overrides: { 'fuellung.defaults.trockenlegung': 'relativ' },
                updatedBy: PROVIDER_UID,
            })).rejects.toThrow();
        });
    });

    describe('provider scope', () => {
        it('provider can write scope=provider for OWN providerId', async () => {
            const service = createAuthedService(PROVIDER_UID, CLAIMS.provider);

            const overrideId = await service.writeSettingsOverride({
                orgId: ORG_ID,
                scope: 'provider',
                scopeId: PROVIDER_ID,
                practiceId: PRACTICE_ID, // Required
                overrides: { 'fuellung.defaults.trockenlegung': 'kofferdam' },
                updatedBy: PROVIDER_UID,
            });

            expect(overrideId).toBe(`provider_${PROVIDER_ID}`);
        });

        it('provider cannot write scope=provider for OTHER providerId', async () => {
            const service = createAuthedService(PROVIDER_UID, CLAIMS.provider);
            const otherProviderId = 'prov_other999';

            await expect(service.writeSettingsOverride({
                orgId: ORG_ID,
                scope: 'provider',
                scopeId: otherProviderId,
                practiceId: PRACTICE_ID,
                overrides: { 'fuellung.defaults.trockenlegung': 'kofferdam' },
                updatedBy: PROVIDER_UID,
            })).rejects.toThrow();
        });
    });

    describe('practiceId requirement', () => {
        it('room scope fails without practiceId', async () => {
            const service = createAuthedService(PRACTICE_ADMIN_UID, CLAIMS.practiceAdmin);

            await expect(service.writeSettingsOverride({
                orgId: ORG_ID,
                scope: 'room',
                scopeId: ROOM_ID,
                // practiceId missing!
                overrides: { 'fuellung.defaults.trockenlegung': 'kofferdam' },
                updatedBy: PRACTICE_ADMIN_UID,
            })).rejects.toThrow('practiceId required for room scope');
        });

        it('provider scope fails without practiceId', async () => {
            const service = createAuthedService(PROVIDER_UID, CLAIMS.provider);

            await expect(service.writeSettingsOverride({
                orgId: ORG_ID,
                scope: 'provider',
                scopeId: PROVIDER_ID,
                // practiceId missing!
                overrides: { 'fuellung.defaults.trockenlegung': 'kofferdam' },
                updatedBy: PROVIDER_UID,
            })).rejects.toThrow('practiceId required for provider scope');
        });
    });

    describe('validator blocks before Firestore write', () => {
        it('rejects unknown path before write attempt', async () => {
            const service = createAuthedService(ORG_ADMIN_UID, CLAIMS.orgAdmin);

            try {
                await service.writeSettingsOverride({
                    orgId: ORG_ID,
                    scope: 'org',
                    overrides: { 'invalid.unknown.path': 'value' },
                    updatedBy: ORG_ADMIN_UID,
                });
                expect.fail('Should have thrown SettingsValidationError');
            } catch (error) {
                expect(error).toBeInstanceOf(SettingsValidationError);
                const validationError = error as SettingsValidationError;
                expect(validationError.issues[0].code).toBe('UNKNOWN_PATH');
            }
        });

        it('rejects invalid value before write attempt', async () => {
            const service = createAuthedService(ORG_ADMIN_UID, CLAIMS.orgAdmin);

            try {
                await service.writeSettingsOverride({
                    orgId: ORG_ID,
                    scope: 'org',
                    overrides: { 'fuellung.defaults.trockenlegung': 'bad_value' },
                    updatedBy: ORG_ADMIN_UID,
                });
                expect.fail('Should have thrown SettingsValidationError');
            } catch (error) {
                expect(error).toBeInstanceOf(SettingsValidationError);
                const validationError = error as SettingsValidationError;
                expect(validationError.issues[0].code).toBe('INVALID_VALUE');
            }
        });

        it('rejects empty overrides before write attempt', async () => {
            const service = createAuthedService(ORG_ADMIN_UID, CLAIMS.orgAdmin);

            try {
                await service.writeSettingsOverride({
                    orgId: ORG_ID,
                    scope: 'org',
                    overrides: {},
                    updatedBy: ORG_ADMIN_UID,
                });
                expect.fail('Should have thrown SettingsValidationError');
            } catch (error) {
                expect(error).toBeInstanceOf(SettingsValidationError);
                const validationError = error as SettingsValidationError;
                expect(validationError.issues[0].code).toBe('EMPTY_PATCH');
            }
        });
    });
});

describe('generateOverrideId', () => {
    it('generates correct org id', () => {
        expect(generateOverrideId('org')).toBe('org');
    });

    it('generates correct practice id', () => {
        expect(generateOverrideId('practice', 'prac_123')).toBe('practice_prac_123');
    });

    it('generates correct room id', () => {
        expect(generateOverrideId('room', 'room_abc')).toBe('room_room_abc');
    });

    it('generates correct provider id', () => {
        expect(generateOverrideId('provider', 'prov_xyz')).toBe('provider_prov_xyz');
    });
});
