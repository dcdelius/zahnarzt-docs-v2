/**
 * Auth Types — Shared types for auth/invite system
 */

export type OrgRole = 'org_admin' | 'member';
export type PracticeRole = 'practice_admin' | 'provider' | 'assistant';

export interface OrgDoc {
    id: string;
    name: string;
    status: 'active' | 'suspended';
    createdAt: FirebaseFirestore.Timestamp;
    createdBy: string;
}

export interface PracticeDoc {
    id: string;
    orgId: string;
    name: string;
    status: 'active' | 'suspended';
    createdAt: FirebaseFirestore.Timestamp;
    createdBy: string;
}

export interface OrgMembershipDoc {
    userId: string;
    orgId: string;
    roles: OrgRole[];
    createdAt: FirebaseFirestore.Timestamp;
    createdBy: string;
}

export interface PracticeMembershipDoc {
    userId: string;
    orgId: string;
    practiceId: string;
    roles: PracticeRole[];
    createdAt: FirebaseFirestore.Timestamp;
    createdBy: string;
}

export interface InviteDoc {
    id: string;
    orgId: string;
    practiceId: string;
    emailLower?: string;
    role: PracticeRole;
    tokenHash: string;
    createdAt: FirebaseFirestore.Timestamp;
    createdBy: string;
    consumedAt?: FirebaseFirestore.Timestamp;
    consumedBy?: string;
}

export interface ProviderDoc {
    id: string;
    practiceId: string;
    orgId: string;
    userId: string;
    displayName: string;
    createdAt: FirebaseFirestore.Timestamp;
    createdBy: string;
}

// Custom claims structure
export interface CustomClaims {
    orgs: Record<string, OrgRole[]>;
    practices: Record<string, PracticeRole[]>;
    isSoftwareAdmin?: boolean;
}
