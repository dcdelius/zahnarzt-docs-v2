/**
 * Firestore Contracts — Type definitions for Firestore data model
 *
 * These are TYPE-ONLY contracts for future Firestore implementation.
 * No runtime code — just schema definitions for the multi-tenant hierarchy.
 *
 * ═══════════════════════════════════════════════════════════════
 * KEY DECISIONS:
 * - NO defaultSettings in org docs (SYSTEM_DEFAULTS is the sole SSOT)
 * - settingsOverrides stores ONLY sparse patches
 * - Case docs include playbookVersionId + resolvedSettingsHash
 * ═══════════════════════════════════════════════════════════════
 */

import type { SettingsOverrides, CaseSettingsSnapshot } from './settingsContracts';

// ═══════════════════════════════════════════════════════════════
// FIRESTORE TIMESTAMP TYPE (placeholder)
// ═══════════════════════════════════════════════════════════════

/** Placeholder for Firestore Timestamp */
export interface FirestoreTimestamp {
    seconds: number;
    nanoseconds: number;
}

// ═══════════════════════════════════════════════════════════════
// ORG DOCUMENT — /orgs/{orgId}
// ═══════════════════════════════════════════════════════════════

/**
 * Organization root document.
 * NOTE: NO defaultSettings field — SYSTEM_DEFAULTS is the only SSOT for defaults.
 */
export interface FirestoreOrgDoc {
    /** Display name of the organization */
    displayName: string;
    /** When the org was created */
    createdAt: FirestoreTimestamp;
    /** When the org was last updated */
    updatedAt?: FirestoreTimestamp;
    /** Active subscription tier */
    subscriptionTier?: 'free' | 'pro' | 'enterprise';
}

// ═══════════════════════════════════════════════════════════════
// PRACTICE DOCUMENT — /orgs/{orgId}/practices/{practiceId}
// ═══════════════════════════════════════════════════════════════

export interface FirestorePracticeDoc {
    displayName: string;
    orgId: string;
    createdAt: FirestoreTimestamp;
    updatedAt?: FirestoreTimestamp;
}

// ═══════════════════════════════════════════════════════════════
// LOCATION DOCUMENT — /orgs/{orgId}/practices/{practiceId}/locations/{locationId}
// ═══════════════════════════════════════════════════════════════

export interface FirestoreLocationDoc {
    displayName: string;
    practiceId: string;
    address?: string;
    createdAt: FirestoreTimestamp;
}

// ═══════════════════════════════════════════════════════════════
// PROVIDER DOCUMENT — /orgs/{orgId}/practices/{practiceId}/providers/{providerId}
// ═══════════════════════════════════════════════════════════════

export interface FirestoreProviderDoc {
    displayName: string;
    practiceId: string;
    locationId?: string;  // Optional: provider may work at multiple locations
    role: 'dentist' | 'assistant' | 'hygienist';
    createdAt: FirestoreTimestamp;
}

// ═══════════════════════════════════════════════════════════════
// SETTINGS OVERRIDES DOCUMENT — Subcollection at any scope
// ═══════════════════════════════════════════════════════════════

/**
 * Settings overrides document.
 * Single doc per scope: /orgs/{orgId}/settingsOverrides/current
 * Or: /orgs/{orgId}/practices/{practiceId}/settingsOverrides/current
 */
export interface FirestoreSettingsOverridesDoc {
    /** Which scope level this belongs to */
    scope: 'org' | 'practice' | 'location' | 'provider';
    /** Reference ID at this scope */
    refId: string;
    /** The sparse override patch */
    overrides: SettingsOverrides;
    /** When last updated */
    updatedAt: FirestoreTimestamp;
    /** Who last updated */
    updatedBy: string;
}

// ═══════════════════════════════════════════════════════════════
// CASE DOCUMENT — /orgs/{orgId}/practices/{practiceId}/cases/{caseId}
// ═══════════════════════════════════════════════════════════════

/**
 * Case document with settings snapshot for reproducibility.
 */
export interface FirestoreCaseDoc extends CaseSettingsSnapshot {
    /** Unique case ID */
    caseId: string;
    /** Patient reference (not PII, just ID) */
    patientId?: string;
    /** Treatment type */
    treatmentId: string;
    /** Provider who created the case */
    providerId: string;
    /** Practice where case was created */
    practiceId: string;
    /** Location where case was created */
    locationId?: string;
    /** Insurance type */
    insuranceType: 'GKV' | 'PKV';
    /** When the case was created */
    createdAt: FirestoreTimestamp;
    /** When the case was last updated */
    updatedAt?: FirestoreTimestamp;
    /** Case status */
    status: 'draft' | 'completed' | 'archived';
}

// ═══════════════════════════════════════════════════════════════
// PLAYBOOK VERSION DOCUMENT — /orgs/{orgId}/playbooks/{treatmentId}/versions/{versionId}
// ═══════════════════════════════════════════════════════════════

export interface FirestorePlaybookVersionDoc {
    /** Version ID, e.g. "fuellung_v2.1.0" */
    versionId: string;
    /** Treatment type */
    treatmentId: string;
    /** When this version was published */
    publishedAt: FirestoreTimestamp;
    /** SHA256 hash of the playbook content */
    contentHash: string;
    /** Is this the current active version */
    isActive: boolean;
}

// ═══════════════════════════════════════════════════════════════
// CATALOG ITEM DOCUMENT — /orgs/{orgId}/catalog/{itemId}
// ═══════════════════════════════════════════════════════════════

export interface FirestoreCatalogItemDoc {
    /** Item ID */
    itemId: string;
    /** Display name */
    displayName: string;
    /** Item type */
    type: 'material' | 'procedure' | 'template';
    /** When created */
    createdAt: FirestoreTimestamp;
    /** Is this item active */
    isActive: boolean;
}
