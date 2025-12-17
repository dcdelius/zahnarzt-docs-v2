/**
 * useCases — V7 Hook for Case Listing
 *
 * ═══════════════════════════════════════════════════════════════
 * Wraps core/case/caseRepository for V7 consumption.
 * No Firestore imports here.
 * ═══════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback } from 'react';
import { createCaseRepository, type CaseSummary, type ListCasesParams } from '../../core/case/caseRepository';
import type { CaseDoc, CaseStatus } from '../../core/case/caseService';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface CasesState {
    cases: CaseSummary[];
    isLoading: boolean;
    error: string | null;
}

export interface CaseDetailState {
    caseDoc: CaseDoc | null;
    isLoading: boolean;
    error: string | null;
}

export interface UseCasesResult {
    state: CasesState;
    filters: CaseFilters;
    setFilters: (filters: Partial<CaseFilters>) => void;
    refresh: () => void;
    loadCase: (caseId: string) => Promise<CaseDoc | null>;
}

export interface CaseFilters {
    status: CaseStatus | null;
    days: number;
    providerId: string | null;
}

const DEFAULT_FILTERS: CaseFilters = {
    status: null,
    days: 30,
    providerId: null,
};

// ═══════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════

export function useCases(orgId: string, practiceId: string): UseCasesResult {
    const [state, setState] = useState<CasesState>({
        cases: [],
        isLoading: true,
        error: null,
    });

    const [filters, setFiltersState] = useState<CaseFilters>(DEFAULT_FILTERS);

    // Use mock data in dev (no Firestore connection for now)
    const repo = createCaseRepository(null, true);

    const loadCases = useCallback(async () => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            const params: ListCasesParams = {
                orgId,
                practiceId,
                status: filters.status ?? undefined,
                days: filters.days,
                providerId: filters.providerId ?? undefined,
            };

            const cases = await repo.listCases(params);
            setState({ cases, isLoading: false, error: null });
        } catch (err) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: err instanceof Error ? err.message : 'Laden fehlgeschlagen',
            }));
        }
    }, [orgId, practiceId, filters, repo]);

    // Load on mount and filter change
    useEffect(() => {
        loadCases();
    }, [loadCases]);

    const setFilters = useCallback((partial: Partial<CaseFilters>) => {
        setFiltersState(prev => ({ ...prev, ...partial }));
    }, []);

    const loadCase = useCallback(async (caseId: string): Promise<CaseDoc | null> => {
        try {
            return await repo.getCase(orgId, practiceId, caseId);
        } catch {
            return null;
        }
    }, [orgId, practiceId, repo]);

    return {
        state,
        filters,
        setFilters,
        refresh: loadCases,
        loadCase,
    };
}

export default useCases;
