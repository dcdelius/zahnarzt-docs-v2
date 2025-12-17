/**
 * Onboarding Service — Calls Cloud Functions for practice creation & invites
 *
 * ═══════════════════════════════════════════════════════════════
 * V7 uses this service; no direct Firestore access.
 * ═══════════════════════════════════════════════════════════════
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import type { PracticeRole } from '../auth/authTypes';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface CreatePracticeInput {
    orgName?: string;
    practiceName: string;
}

export interface CreatePracticeResult {
    orgId: string;
    practiceId: string;
}

export interface CreateInviteInput {
    orgId: string;
    practiceId: string;
    role: PracticeRole;
    email?: string;
}

export interface CreateInviteResult {
    inviteId: string;
    token: string;
    link: string;
}

export interface AcceptInviteInput {
    orgId: string;
    practiceId: string;
    inviteId: string;
    token: string;
}

export interface AcceptInviteResult {
    ok: boolean;
    role: PracticeRole;
}

// ═══════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════

let functionsInstance: ReturnType<typeof getFunctions> | null = null;

function getFunctionsInstance() {
    if (!functionsInstance) {
        functionsInstance = getFunctions();
    }
    return functionsInstance;
}

/**
 * Create a new org + practice (self-serve).
 * Creates org, practice, and memberships. Updates user claims.
 */
export async function createPracticeSelfServe(input: CreatePracticeInput): Promise<CreatePracticeResult> {
    const functions = getFunctionsInstance();
    const callable = httpsCallable<CreatePracticeInput, CreatePracticeResult>(functions, 'createPracticeSelfServe');
    const result = await callable(input);
    return result.data;
}

/**
 * Create an invite link for a practice.
 * Only practice_admin can call this.
 */
export async function createInvite(input: CreateInviteInput): Promise<CreateInviteResult> {
    const functions = getFunctionsInstance();
    const callable = httpsCallable<CreateInviteInput, CreateInviteResult>(functions, 'createInvite');
    const result = await callable(input);
    return result.data;
}

/**
 * Accept an invite and join a practice.
 * Creates membership, optionally creates provider doc, updates claims.
 */
export async function acceptInvite(input: AcceptInviteInput): Promise<AcceptInviteResult> {
    const functions = getFunctionsInstance();
    const callable = httpsCallable<AcceptInviteInput, AcceptInviteResult>(functions, 'acceptInvite');
    const result = await callable(input);
    return result.data;
}

// ═══════════════════════════════════════════════════════════════
// CONVENIENCE WRAPPERS
// ═══════════════════════════════════════════════════════════════

export interface OnboardingService {
    createPracticeSelfServe: typeof createPracticeSelfServe;
    createInvite: typeof createInvite;
    acceptInvite: typeof acceptInvite;
}

export function createOnboardingService(): OnboardingService {
    return {
        createPracticeSelfServe,
        createInvite,
        acceptInvite,
    };
}
