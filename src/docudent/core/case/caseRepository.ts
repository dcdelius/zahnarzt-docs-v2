/**
 * Case Repository — Query Layer for Cases
 *
 * ═══════════════════════════════════════════════════════════════
 * Read-only queries for case listing and retrieval.
 * CaseService handles writes; this handles reads.
 * ═══════════════════════════════════════════════════════════════
 */

import {
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    getDoc,
    doc,
    Timestamp,
    Firestore,
} from 'firebase/firestore';
import type { CaseDoc, CaseStatus } from './caseService';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface ListCasesParams {
    orgId: string;
    practiceId: string;
    status?: CaseStatus;
    days?: number;          // Filter by last N days
    providerId?: string;    // Filter by provider
    maxResults?: number;    // Default: 50
}

export interface CaseSummary {
    id: string;
    treatmentId: string;
    patientRef: string;
    status: CaseStatus;
    providerId: string;
    createdAt: Date;
    finalizedAt: Date | null;
    hasReproducibility: boolean;
}

// ═══════════════════════════════════════════════════════════════
// MOCK DATA (for dev when no Firestore connection)
// ═══════════════════════════════════════════════════════════════

const MOCK_CASES: CaseSummary[] = [
    { id: 'case_001', treatmentId: 'fuellung', patientRef: 'P-2024-001', status: 'finalized', providerId: 'prov_1', createdAt: new Date('2024-12-15T10:30:00'), finalizedAt: new Date('2024-12-15T10:45:00'), hasReproducibility: true },
    { id: 'case_002', treatmentId: 'endo', patientRef: 'P-2024-002', status: 'finalized', providerId: 'prov_1', createdAt: new Date('2024-12-14T14:00:00'), finalizedAt: new Date('2024-12-14T14:30:00'), hasReproducibility: true },
    { id: 'case_003', treatmentId: 'fuellung', patientRef: 'P-2024-003', status: 'draft', providerId: 'prov_2', createdAt: new Date('2024-12-13T09:15:00'), finalizedAt: null, hasReproducibility: false },
    { id: 'case_004', treatmentId: 'fuellung', patientRef: 'P-2024-004', status: 'finalized', providerId: 'prov_1', createdAt: new Date('2024-12-12T11:00:00'), finalizedAt: new Date('2024-12-12T11:20:00'), hasReproducibility: true },
    { id: 'case_005', treatmentId: 'endo', patientRef: 'P-2024-005', status: 'amended', providerId: 'prov_2', createdAt: new Date('2024-12-11T16:00:00'), finalizedAt: new Date('2024-12-11T16:45:00'), hasReproducibility: true },
    { id: 'case_006', treatmentId: 'fuellung', patientRef: 'P-2024-006', status: 'draft', providerId: 'prov_1', createdAt: new Date('2024-12-10T08:30:00'), finalizedAt: null, hasReproducibility: false },
    { id: 'case_007', treatmentId: 'fuellung', patientRef: 'P-2024-007', status: 'finalized', providerId: 'prov_1', createdAt: new Date('2024-12-09T13:00:00'), finalizedAt: new Date('2024-12-09T13:15:00'), hasReproducibility: true },
    { id: 'case_008', treatmentId: 'endo', patientRef: 'P-2024-008', status: 'finalized', providerId: 'prov_2', createdAt: new Date('2024-12-08T10:00:00'), finalizedAt: new Date('2024-12-08T10:50:00'), hasReproducibility: true },
    { id: 'case_009', treatmentId: 'fuellung', patientRef: 'P-2024-009', status: 'finalized', providerId: 'prov_1', createdAt: new Date('2024-12-07T15:30:00'), finalizedAt: new Date('2024-12-07T15:45:00'), hasReproducibility: true },
    { id: 'case_010', treatmentId: 'fuellung', patientRef: 'P-2024-010', status: 'draft', providerId: 'prov_2', createdAt: new Date('2024-12-06T09:00:00'), finalizedAt: null, hasReproducibility: false },
    { id: 'case_011', treatmentId: 'endo', patientRef: 'P-2024-011', status: 'finalized', providerId: 'prov_1', createdAt: new Date('2024-12-05T14:00:00'), finalizedAt: new Date('2024-12-05T15:00:00'), hasReproducibility: true },
    { id: 'case_012', treatmentId: 'fuellung', patientRef: 'P-2024-012', status: 'finalized', providerId: 'prov_1', createdAt: new Date('2024-12-04T11:30:00'), finalizedAt: new Date('2024-12-04T11:45:00'), hasReproducibility: true },
    { id: 'case_013', treatmentId: 'fuellung', patientRef: 'P-2024-013', status: 'amended', providerId: 'prov_2', createdAt: new Date('2024-12-03T10:00:00'), finalizedAt: new Date('2024-12-03T10:30:00'), hasReproducibility: true },
    { id: 'case_014', treatmentId: 'endo', patientRef: 'P-2024-014', status: 'finalized', providerId: 'prov_1', createdAt: new Date('2024-12-02T13:00:00'), finalizedAt: new Date('2024-12-02T14:00:00'), hasReproducibility: true },
    { id: 'case_015', treatmentId: 'fuellung', patientRef: 'P-2024-015', status: 'finalized', providerId: 'prov_2', createdAt: new Date('2024-12-01T09:30:00'), finalizedAt: new Date('2024-12-01T09:50:00'), hasReproducibility: true },
    { id: 'case_016', treatmentId: 'fuellung', patientRef: 'P-2024-016', status: 'draft', providerId: 'prov_1', createdAt: new Date('2024-11-30T16:00:00'), finalizedAt: null, hasReproducibility: false },
    { id: 'case_017', treatmentId: 'endo', patientRef: 'P-2024-017', status: 'finalized', providerId: 'prov_1', createdAt: new Date('2024-11-29T11:00:00'), finalizedAt: new Date('2024-11-29T12:00:00'), hasReproducibility: true },
    { id: 'case_018', treatmentId: 'fuellung', patientRef: 'P-2024-018', status: 'finalized', providerId: 'prov_2', createdAt: new Date('2024-11-28T14:30:00'), finalizedAt: new Date('2024-11-28T14:45:00'), hasReproducibility: true },
    { id: 'case_019', treatmentId: 'fuellung', patientRef: 'P-2024-019', status: 'finalized', providerId: 'prov_1', createdAt: new Date('2024-11-27T10:00:00'), finalizedAt: new Date('2024-11-27T10:20:00'), hasReproducibility: true },
    { id: 'case_020', treatmentId: 'endo', patientRef: 'P-2024-020', status: 'finalized', providerId: 'prov_2', createdAt: new Date('2024-11-26T15:00:00'), finalizedAt: new Date('2024-11-26T16:00:00'), hasReproducibility: true },
];

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function getCasePath(orgId: string, practiceId: string): string {
    return `orgs/${orgId}/practices/${practiceId}/cases`;
}

function toSummary(caseDoc: CaseDoc): CaseSummary {
    return {
        id: caseDoc.id,
        treatmentId: caseDoc.treatmentId,
        patientRef: caseDoc.patientRef,
        status: caseDoc.status,
        providerId: caseDoc.providerId,
        createdAt: caseDoc.createdAt.toDate(),
        finalizedAt: caseDoc.finalizedAt?.toDate() ?? null,
        hasReproducibility: !!caseDoc.reproducibility,
    };
}

// ═══════════════════════════════════════════════════════════════
// REPOSITORY
// ═══════════════════════════════════════════════════════════════

export class CaseRepository {
    private useMockData: boolean;

    constructor(private db: Firestore | null, useMockData = false) {
        this.useMockData = useMockData || db === null;
    }

    /**
     * List cases with optional filters.
     */
    async listCases(params: ListCasesParams): Promise<CaseSummary[]> {
        // Use mock data in dev
        if (this.useMockData) {
            return this.listMockCases(params);
        }

        if (!this.db) {
            throw new Error('Firestore not initialized');
        }

        const colRef = collection(this.db, getCasePath(params.orgId, params.practiceId));
        const constraints: any[] = [];

        // Status filter
        if (params.status) {
            constraints.push(where('status', '==', params.status));
        }

        // Provider filter
        if (params.providerId) {
            constraints.push(where('providerId', '==', params.providerId));
        }

        // Days filter
        if (params.days) {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - params.days);
            constraints.push(where('createdAt', '>=', Timestamp.fromDate(cutoff)));
        }

        // Order and limit
        constraints.push(orderBy('createdAt', 'desc'));
        constraints.push(limit(params.maxResults ?? 50));

        const q = query(colRef, ...constraints);
        const snap = await getDocs(q);

        return snap.docs.map(d => toSummary(d.data() as CaseDoc));
    }

    /**
     * Get a single case by ID.
     */
    async getCase(orgId: string, practiceId: string, caseId: string): Promise<CaseDoc | null> {
        // Use mock data in dev
        if (this.useMockData) {
            const summary = MOCK_CASES.find(c => c.id === caseId);
            if (!summary) return null;
            return this.mockSummaryToDoc(summary, orgId, practiceId);
        }

        if (!this.db) {
            throw new Error('Firestore not initialized');
        }

        const ref = doc(this.db, getCasePath(orgId, practiceId), caseId);
        const snap = await getDoc(ref);
        return snap.exists() ? (snap.data() as CaseDoc) : null;
    }

    // ─── Mock helpers ───────────────────────────────────────────

    private listMockCases(params: ListCasesParams): CaseSummary[] {
        let result = [...MOCK_CASES];

        // Status filter
        if (params.status) {
            result = result.filter(c => c.status === params.status);
        }

        // Provider filter
        if (params.providerId) {
            result = result.filter(c => c.providerId === params.providerId);
        }

        // Days filter
        if (params.days) {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - params.days);
            result = result.filter(c => c.createdAt >= cutoff);
        }

        // Sort and limit
        result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return result.slice(0, params.maxResults ?? 50);
    }

    private mockSummaryToDoc(summary: CaseSummary, orgId: string, practiceId: string): CaseDoc {
        return {
            id: summary.id,
            orgId,
            practiceId,
            providerId: summary.providerId,
            patientRef: summary.patientRef,
            treatmentId: summary.treatmentId as any,
            status: summary.status,
            createdAt: Timestamp.fromDate(summary.createdAt),
            updatedAt: Timestamp.fromDate(summary.createdAt),
            finalizedAt: summary.finalizedAt ? Timestamp.fromDate(summary.finalizedAt) : undefined,
            createdBy: 'mock-user',
            reproducibility: summary.hasReproducibility ? {
                playbookVersionId: 'playbook_v1',
                extractionVersion: '1.0.0',
                resolvedSettingsHash: 'sha256:abc123',
            } : undefined,
            input: {
                rawDictation: 'Mock dictation text',
                normalizedDictation: 'mock dictation text',
                insuranceType: 'GKV',
                hasMKV: false,
            },
        };
    }
}

// ═══════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════

export function createCaseRepository(db: Firestore | null, useMockData = false): CaseRepository {
    return new CaseRepository(db, useMockData);
}
