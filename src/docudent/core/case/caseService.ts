/**
 * Case Service V1 — Firestore Case Lifecycle Management
 *
 * ═══════════════════════════════════════════════════════════════
 * Handles: createDraft → updateDraft → finalize flow
 * Enforces: immutability, reproducibility, no PII in case docs
 * ═══════════════════════════════════════════════════════════════
 */

import {
    collection,
    doc,
    setDoc,
    updateDoc,
    getDoc,
    Timestamp,
    Firestore,
} from 'firebase/firestore';
import { computeSettingsHashSync } from './hashUtils';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type CaseStatus = 'draft' | 'finalized' | 'amended';
export type InsuranceType = 'GKV' | 'PKV';
export type TreatmentId = 'fuellung' | 'endo';

export interface Reproducibility {
    playbookVersionId: string;
    extractionVersion: string;
    resolvedSettingsHash: string;
    _resolvedSettingsSnapshot?: Record<string, unknown>;
}

type KbSource = 'json' | 'firestore' | 'firestore_fallback' | 'forced';

export interface KbMetaSnapshot {
    releaseId?: string;
    medical?: {
        version: string;
        hash: string;
        source: KbSource;
    };
    treatments?: Record<string, {
        version: string;
        hash: string;
        source: KbSource;
    }>;
    combinability?: {
        version: string;
        hash: string;
        source: KbSource;
    };
}

export interface CaseInput {
    rawDictation: string;
    normalizedDictation: string;
    insuranceType: InsuranceType;
    hasMKV: boolean;
}

export interface CaseExtracted {
    version: string;
    payload: Record<string, unknown>;
}

export interface CaseOutput {
    sections: unknown[];
    billingCodes: unknown[];
    warnings: unknown[];
}

export interface CaseDoc {
    id: string;
    orgId: string;
    practiceId: string;
    providerId: string;
    roomId?: string;
    patientRef: string; // Pseudonymized only, NO PII
    treatmentId: TreatmentId;
    status: CaseStatus;
    reproducibility?: Reproducibility;
    input?: CaseInput;
    extracted?: CaseExtracted;
    answers?: Record<string, unknown>;
    output?: CaseOutput;
    amendedFromCaseId?: string;
    amendmentReason?: string;
    /** KB version/hash metadata (pinned release) */
    kbMeta?: KbMetaSnapshot;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    finalizedAt?: Timestamp;
    createdBy: string;
}

export interface CreateDraftParams {
    orgId: string;
    practiceId: string;
    providerId: string;
    patientRef: string;
    treatmentId: TreatmentId;
    createdBy: string;
    roomId?: string;
}

export interface FinalizeParams {
    playbookVersionId: string;
    extractionVersion: string;
    resolvedSettings: Record<string, unknown>;
    kbMeta?: KbMetaSnapshot;
    auditModeEnabled?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function generateCaseId(): string {
    return `case_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function getCasePath(orgId: string, practiceId: string): string {
    return `orgs/${orgId}/practices/${practiceId}/cases`;
}

// ═══════════════════════════════════════════════════════════════
// CASE SERVICE
// ═══════════════════════════════════════════════════════════════

export class CaseService {
    constructor(private db: Firestore) { }

    /**
     * Create a new draft case.
     * Must be created with status='draft' (enforced by security rules).
     */
    async createDraftCase(params: CreateDraftParams): Promise<string> {
        const caseId = generateCaseId();
        const now = Timestamp.now();

        const caseDoc: CaseDoc = {
            id: caseId,
            orgId: params.orgId,
            practiceId: params.practiceId,
            providerId: params.providerId,
            patientRef: params.patientRef,
            treatmentId: params.treatmentId,
            status: 'draft', // MUST be draft on create
            createdAt: now,
            updatedAt: now,
            createdBy: params.createdBy,
        };

        if (params.roomId) {
            caseDoc.roomId = params.roomId;
        }

        const ref = doc(this.db, getCasePath(params.orgId, params.practiceId), caseId);
        await setDoc(ref, caseDoc);

        return caseId;
    }

    /**
     * Update a draft case.
     * Only allowed while status='draft'.
     */
    async updateDraftCase(
        orgId: string,
        practiceId: string,
        caseId: string,
        patch: Partial<Pick<CaseDoc, 'input' | 'extracted' | 'answers' | 'output'>>
    ): Promise<void> {
        const ref = doc(this.db, getCasePath(orgId, practiceId), caseId);
        await updateDoc(ref, {
            ...patch,
            updatedAt: Timestamp.now(),
        });
    }

    /**
     * Finalize a case.
     * Sets status='finalized', adds reproducibility fields.
     * After this, the case is IMMUTABLE.
     */
    async finalizeCase(
        orgId: string,
        practiceId: string,
        caseId: string,
        params: FinalizeParams
    ): Promise<void> {
        const ref = doc(this.db, getCasePath(orgId, practiceId), caseId);
        const now = Timestamp.now();

        const reproducibility: Reproducibility = {
            playbookVersionId: params.playbookVersionId,
            extractionVersion: params.extractionVersion,
            resolvedSettingsHash: computeSettingsHashSync(params.resolvedSettings),
        };

        // If audit mode, store full snapshot
        if (params.auditModeEnabled) {
            reproducibility._resolvedSettingsSnapshot = params.resolvedSettings;
        }

        await updateDoc(ref, {
            status: 'finalized',
            finalizedAt: now,
            updatedAt: now,
            reproducibility,
            ...(params.kbMeta ? { kbMeta: params.kbMeta } : {}),
        });
    }

    /**
     * Get a case by ID.
     */
    async getCase(orgId: string, practiceId: string, caseId: string): Promise<CaseDoc | null> {
        const ref = doc(this.db, getCasePath(orgId, practiceId), caseId);
        const snap = await getDoc(ref);
        return snap.exists() ? (snap.data() as CaseDoc) : null;
    }

    /**
     * Mark a finalized case as amended.
     * Original case stays immutable; caller should create a new case with amendedFromCaseId.
     */
    async markAsAmended(
        orgId: string,
        practiceId: string,
        caseId: string,
        reason?: string
    ): Promise<void> {
        const ref = doc(this.db, getCasePath(orgId, practiceId), caseId);
        const updateData: Record<string, unknown> = {
            status: 'amended',
            updatedAt: Timestamp.now(),
        };

        if (reason) {
            updateData.amendmentReason = reason;
        }

        await updateDoc(ref, updateData);
    }
}

// ═══════════════════════════════════════════════════════════════
// FACTORY (for dependency injection)
// ═══════════════════════════════════════════════════════════════

export function createCaseService(db: Firestore): CaseService {
    return new CaseService(db);
}
