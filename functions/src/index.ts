/**
 * Docudent Cloud Functions — Auth & Invite System
 *
 * F1: createPracticeSelfServe — Create org + practice for new user
 * F2: createInvite — Generate invite link
 * F3: acceptInvite — Accept invite and join practice
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import type {
    OrgDoc,
    PracticeDoc,
    OrgMembershipDoc,
    PracticeMembershipDoc,
    InviteDoc,
    ProviderDoc,
    CustomClaims,
    OrgRole,
    PracticeRole,
} from './authTypes';

admin.initializeApp();
const db = admin.firestore();
const auth = admin.auth();

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
}

function hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}

async function getUserClaims(uid: string): Promise<CustomClaims> {
    try {
        const user = await auth.getUser(uid);
        return (user.customClaims as CustomClaims) ?? { orgs: {}, practices: {} };
    } catch {
        return { orgs: {}, practices: {} };
    }
}

async function updateUserClaims(uid: string, claims: CustomClaims): Promise<void> {
    await auth.setCustomUserClaims(uid, claims);
}

async function hasPracticeRole(uid: string, orgId: string, practiceId: string, role: PracticeRole): Promise<boolean> {
    // Check Firestore membership directly (more reliable than claims for verification)
    const membershipRef = db.doc(`orgs/${orgId}/practices/${practiceId}/memberships/${uid}`);
    const snap = await membershipRef.get();
    if (!snap.exists) return false;
    const data = snap.data() as PracticeMembershipDoc;
    return data.roles.includes(role);
}

// ═══════════════════════════════════════════════════════════════
// F1: CREATE PRACTICE SELF-SERVE
// ═══════════════════════════════════════════════════════════════

interface CreatePracticeInput {
    orgName?: string;
    practiceName: string;
}

interface CreatePracticeOutput {
    orgId: string;
    practiceId: string;
}

export const createPracticeSelfServe = functions.https.onCall(
    async (data: CreatePracticeInput, context): Promise<CreatePracticeOutput> => {
        // Auth required
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Login required');
        }

        const uid = context.auth.uid;
        const email = context.auth.token.email ?? 'unknown';
        const now = admin.firestore.Timestamp.now();

        // Validate input
        const practiceName = (data.practiceName ?? '').trim();
        if (!practiceName || practiceName.length < 2) {
            throw new functions.https.HttpsError('invalid-argument', 'Practice name required (min 2 chars)');
        }

        const orgName = (data.orgName ?? practiceName).trim();

        // Generate IDs
        const orgId = generateId('org');
        const practiceId = generateId('practice');

        // Create org
        const orgDoc: OrgDoc = {
            id: orgId,
            name: orgName,
            status: 'active',
            createdAt: now,
            createdBy: uid,
        };
        await db.doc(`orgs/${orgId}`).set(orgDoc);

        // Create practice
        const practiceDoc: PracticeDoc = {
            id: practiceId,
            orgId,
            name: practiceName,
            status: 'active',
            createdAt: now,
            createdBy: uid,
        };
        await db.doc(`orgs/${orgId}/practices/${practiceId}`).set(practiceDoc);

        // Create org membership (member role)
        const orgMembership: OrgMembershipDoc = {
            userId: uid,
            orgId,
            roles: ['member'],
            createdAt: now,
            createdBy: uid,
        };
        await db.doc(`orgs/${orgId}/memberships/${uid}`).set(orgMembership);

        // Create practice membership (practice_admin role)
        const practiceMembership: PracticeMembershipDoc = {
            userId: uid,
            orgId,
            practiceId,
            roles: ['practice_admin'],
            createdAt: now,
            createdBy: uid,
        };
        await db.doc(`orgs/${orgId}/practices/${practiceId}/memberships/${uid}`).set(practiceMembership);

        // Update custom claims
        const claims = await getUserClaims(uid);
        claims.orgs = claims.orgs ?? {};
        claims.practices = claims.practices ?? {};
        claims.orgs[orgId] = ['member'];
        claims.practices[practiceId] = ['practice_admin'];
        await updateUserClaims(uid, claims);

        functions.logger.info(`Created practice ${practiceId} in org ${orgId} by ${email}`);

        return { orgId, practiceId };
    }
);

// ═══════════════════════════════════════════════════════════════
// F2: CREATE INVITE
// ═══════════════════════════════════════════════════════════════

interface CreateInviteInput {
    orgId: string;
    practiceId: string;
    role: PracticeRole;
    email?: string;
}

interface CreateInviteOutput {
    inviteId: string;
    token: string;
    link: string;
}

export const createInvite = functions.https.onCall(
    async (data: CreateInviteInput, context): Promise<CreateInviteOutput> => {
        // Auth required
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Login required');
        }

        const uid = context.auth.uid;
        const now = admin.firestore.Timestamp.now();

        // Validate input
        const { orgId, practiceId, role, email } = data;
        if (!orgId || !practiceId) {
            throw new functions.https.HttpsError('invalid-argument', 'orgId and practiceId required');
        }

        const validRoles: PracticeRole[] = ['practice_admin', 'provider', 'assistant'];
        if (!validRoles.includes(role)) {
            throw new functions.https.HttpsError('invalid-argument', `Invalid role: ${role}`);
        }

        // Verify caller is practice_admin
        const isPracticeAdmin = await hasPracticeRole(uid, orgId, practiceId, 'practice_admin');
        if (!isPracticeAdmin) {
            throw new functions.https.HttpsError('permission-denied', 'Only practice_admin can create invites');
        }

        // Generate token (32 bytes = 64 hex chars)
        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = hashToken(token);
        const inviteId = generateId('invite');

        // Create invite doc
        const inviteDoc: InviteDoc = {
            id: inviteId,
            orgId,
            practiceId,
            role,
            tokenHash,
            createdAt: now,
            createdBy: uid,
        };

        if (email) {
            inviteDoc.emailLower = email.toLowerCase().trim();
        }

        await db.doc(`orgs/${orgId}/practices/${practiceId}/invites/${inviteId}`).set(inviteDoc);

        // Build invite link
        const baseUrl = process.env.APP_URL ?? 'https://docudent.app';
        const link = `${baseUrl}/accept-invite?orgId=${orgId}&practiceId=${practiceId}&inviteId=${inviteId}&token=${token}`;

        functions.logger.info(`Created invite ${inviteId} for role ${role} in practice ${practiceId}`);

        return { inviteId, token, link };
    }
);

// ═══════════════════════════════════════════════════════════════
// F3: ACCEPT INVITE
// ═══════════════════════════════════════════════════════════════

interface AcceptInviteInput {
    orgId: string;
    practiceId: string;
    inviteId: string;
    token: string;
}

interface AcceptInviteOutput {
    ok: boolean;
    role: PracticeRole;
}

export const acceptInvite = functions.https.onCall(
    async (data: AcceptInviteInput, context): Promise<AcceptInviteOutput> => {
        // Auth required
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Login required');
        }

        const uid = context.auth.uid;
        const userEmail = context.auth.token.email?.toLowerCase() ?? '';
        const now = admin.firestore.Timestamp.now();

        // Validate input
        const { orgId, practiceId, inviteId, token } = data;
        if (!orgId || !practiceId || !inviteId || !token) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
        }

        // Load invite
        const inviteRef = db.doc(`orgs/${orgId}/practices/${practiceId}/invites/${inviteId}`);
        const inviteSnap = await inviteRef.get();

        if (!inviteSnap.exists) {
            throw new functions.https.HttpsError('not-found', 'Invite not found');
        }

        const invite = inviteSnap.data() as InviteDoc;

        // Check if already consumed
        if (invite.consumedAt) {
            throw new functions.https.HttpsError('failed-precondition', 'Invite already used');
        }

        // Verify token
        const providedHash = hashToken(token);
        if (providedHash !== invite.tokenHash) {
            throw new functions.https.HttpsError('permission-denied', 'Invalid invite token');
        }

        // Check email restriction if present
        if (invite.emailLower && invite.emailLower !== userEmail) {
            throw new functions.https.HttpsError(
                'permission-denied',
                `This invite is restricted to ${invite.emailLower}`
            );
        }

        // Create org membership if not exists
        const orgMembershipRef = db.doc(`orgs/${orgId}/memberships/${uid}`);
        const orgMembershipSnap = await orgMembershipRef.get();
        if (!orgMembershipSnap.exists) {
            const orgMembership: OrgMembershipDoc = {
                userId: uid,
                orgId,
                roles: ['member'],
                createdAt: now,
                createdBy: uid,
            };
            await orgMembershipRef.set(orgMembership);
        }

        // Create practice membership
        const practiceMembershipRef = db.doc(`orgs/${orgId}/practices/${practiceId}/memberships/${uid}`);
        const practiceMembershipSnap = await practiceMembershipRef.get();

        if (practiceMembershipSnap.exists) {
            // Already a member - add role if not present
            const existingData = practiceMembershipSnap.data() as PracticeMembershipDoc;
            if (!existingData.roles.includes(invite.role)) {
                await practiceMembershipRef.update({
                    roles: admin.firestore.FieldValue.arrayUnion(invite.role),
                });
            }
        } else {
            const practiceMembership: PracticeMembershipDoc = {
                userId: uid,
                orgId,
                practiceId,
                roles: [invite.role],
                createdAt: now,
                createdBy: uid,
            };
            await practiceMembershipRef.set(practiceMembership);
        }

        // If provider role, create provider doc
        if (invite.role === 'provider') {
            const providerId = generateId('prov');
            const user = await auth.getUser(uid);
            const providerDoc: ProviderDoc = {
                id: providerId,
                practiceId,
                orgId,
                userId: uid,
                displayName: user.displayName ?? user.email ?? 'Provider',
                createdAt: now,
                createdBy: uid,
            };
            await db.doc(`orgs/${orgId}/practices/${practiceId}/providers/${providerId}`).set(providerDoc);
        }

        // Mark invite as consumed
        await inviteRef.update({
            consumedAt: now,
            consumedBy: uid,
        });

        // Update custom claims
        const claims = await getUserClaims(uid);
        claims.orgs = claims.orgs ?? {};
        claims.practices = claims.practices ?? {};

        if (!claims.orgs[orgId]) {
            claims.orgs[orgId] = ['member'];
        }

        if (!claims.practices[practiceId]) {
            claims.practices[practiceId] = [invite.role];
        } else if (!claims.practices[practiceId].includes(invite.role)) {
            claims.practices[practiceId].push(invite.role);
        }

        await updateUserClaims(uid, claims);

        functions.logger.info(`User ${uid} accepted invite ${inviteId} with role ${invite.role}`);

        return { ok: true, role: invite.role };
    }
);
