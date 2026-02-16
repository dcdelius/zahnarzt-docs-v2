import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const RULES = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8');
const shouldSkip = !process.env.FIRESTORE_EMULATOR_HOST;

describe.skipIf(shouldSkip)('gate-firestore-v10-settings-rules-emulator', () => {
    let testEnv: RulesTestEnvironment;

    beforeAll(async () => {
        testEnv = await initializeTestEnvironment({
            projectId: 'docudent-rules-v10-settings',
            firestore: { rules: RULES },
        });
    });

    afterAll(async () => {
        await testEnv.cleanup();
    });

    beforeEach(async () => {
        await testEnv.clearFirestore();
    });

    it('allows own user-settings write, blocks non-admin practice-settings write', async () => {
        const providerUid = 'provider-u1';
        const provider = testEnv.authenticatedContext(providerUid, {
            practices: { practice_a: ['provider'] },
            orgs: {},
        });
        const providerDb = provider.firestore();

        await assertFails(setDoc(
            doc(providerDb, 'Praxen', 'practice_a', 'Settings', 'v10'),
            { strictKzvMode: true },
            { merge: true }
        ));

        await assertSucceeds(setDoc(
            doc(providerDb, 'Praxen', 'practice_a', 'Benutzer', providerUid, 'Settings', 'v10'),
            { preferredTextLength: 'kurz' },
            { merge: true }
        ));
    });

    it('blocks writing another user settings for non-admin, allows practice_admin', async () => {
        const providerUid = 'provider-u1';
        const provider = testEnv.authenticatedContext(providerUid, {
            practices: { practice_a: ['provider'] },
            orgs: {},
        });
        const admin = testEnv.authenticatedContext('admin-u1', {
            practices: { practice_a: ['practice_admin'] },
            orgs: {},
        });

        const providerDb = provider.firestore();
        const adminDb = admin.firestore();

        await assertFails(setDoc(
            doc(providerDb, 'Praxen', 'practice_a', 'Benutzer', 'provider-u2', 'Settings', 'v10'),
            { preferredTextLength: 'lang' },
            { merge: true }
        ));

        await assertSucceeds(setDoc(
            doc(adminDb, 'Praxen', 'practice_a', 'Benutzer', 'provider-u2', 'Settings', 'v10'),
            { preferredTextLength: 'lang' },
            { merge: true }
        ));

        const adminRead = await assertSucceeds(getDoc(
            doc(adminDb, 'Praxen', 'practice_a', 'Benutzer', 'provider-u2', 'Settings', 'v10')
        ));
        expect(adminRead.exists()).toBe(true);
    });

    it('blocks reads for users without matching practice membership claim', async () => {
        const admin = testEnv.authenticatedContext('admin-u1', {
            practices: { practice_a: ['practice_admin'] },
            orgs: {},
        });
        const outsider = testEnv.authenticatedContext('outsider-u1', {
            practices: { practice_b: ['provider'] },
            orgs: {},
        });

        const adminDb = admin.firestore();
        const outsiderDb = outsider.firestore();

        await assertSucceeds(setDoc(
            doc(adminDb, 'Praxen', 'practice_a', 'Settings', 'v10'),
            { strictKzvMode: true },
            { merge: true }
        ));

        await assertFails(getDoc(doc(outsiderDb, 'Praxen', 'practice_a', 'Settings', 'v10')));
    });

    it('blocks own-user settings write without practice membership claim', async () => {
        const outsiderUid = 'outsider-u1';
        const outsider = testEnv.authenticatedContext(outsiderUid, {
            practices: { practice_b: ['provider'] },
            orgs: {},
        });
        const outsiderDb = outsider.firestore();

        await assertFails(setDoc(
            doc(outsiderDb, 'Praxen', 'practice_a', 'Benutzer', outsiderUid, 'Settings', 'v10'),
            { preferredTextLength: 'kurz' },
            { merge: true }
        ));
    });
});
