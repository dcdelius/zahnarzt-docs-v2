/**
 * M35: Answer Routing Hook
 * 
 * Provides state management for per-instance answers in multi-treatment scenarios.
 */

import { useState, useCallback, useMemo } from 'react';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type AnswersByInstance = Record<string, Record<string, unknown>>;

export interface UseInstanceAnswersOptions {
    initialInstanceIds?: string[];
}

export interface UseInstanceAnswersResult {
    answersByInstance: AnswersByInstance;
    setAnswer: (instanceId: string, questionId: string, value: unknown) => void;
    getAnswer: (instanceId: string, questionId: string) => unknown;
    getAnswersForInstance: (instanceId: string) => Record<string, unknown>;
    getFlatAnswers: () => Record<string, unknown>;
    reset: () => void;
    hasAnswers: boolean;
}

// ═══════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════

/**
 * Hook for managing per-instance answers.
 * 
 * Single mode uses instanceId = "single" for compatibility.
 */
export function useInstanceAnswers(options: UseInstanceAnswersOptions = {}): UseInstanceAnswersResult {
    const { initialInstanceIds = ['single'] } = options;

    const [answersByInstance, setAnswersByInstance] = useState<AnswersByInstance>(() => {
        const initial: AnswersByInstance = {};
        for (const id of initialInstanceIds) {
            initial[id] = {};
        }
        return initial;
    });

    const setAnswer = useCallback((instanceId: string, questionId: string, value: unknown) => {
        setAnswersByInstance(prev => ({
            ...prev,
            [instanceId]: {
                ...(prev[instanceId] || {}),
                [questionId]: value,
            },
        }));
    }, []);

    const getAnswer = useCallback((instanceId: string, questionId: string): unknown => {
        return answersByInstance[instanceId]?.[questionId];
    }, [answersByInstance]);

    const getAnswersForInstance = useCallback((instanceId: string): Record<string, unknown> => {
        return answersByInstance[instanceId] || {};
    }, [answersByInstance]);

    /**
     * Flatten answers for backward compatibility with single-instance API.
     * Merges all instance answers into one object (last wins on collision).
     */
    const getFlatAnswers = useCallback((): Record<string, unknown> => {
        const flat: Record<string, unknown> = {};
        for (const instAnswers of Object.values(answersByInstance)) {
            Object.assign(flat, instAnswers);
        }
        return flat;
    }, [answersByInstance]);

    const reset = useCallback(() => {
        setAnswersByInstance(prev => {
            const reset: AnswersByInstance = {};
            for (const id of Object.keys(prev)) {
                reset[id] = {};
            }
            return reset;
        });
    }, []);

    const hasAnswers = useMemo(() => {
        return Object.values(answersByInstance).some(
            answers => Object.keys(answers).length > 0
        );
    }, [answersByInstance]);

    return {
        answersByInstance,
        setAnswer,
        getAnswer,
        getAnswersForInstance,
        getFlatAnswers,
        reset,
        hasAnswers,
    };
}

// ═══════════════════════════════════════════════════════════════
// ADAPTER
// ═══════════════════════════════════════════════════════════════

/**
 * Adapt instance-scoped answers to the format expected by runV10Bundle.
 */
export function adaptAnswersForBundle(
    answersByInstance: AnswersByInstance
): Array<{ instanceId: string; answers: Record<string, unknown> }> {
    return Object.entries(answersByInstance).map(([instanceId, answers]) => ({
        instanceId,
        answers,
    }));
}

/**
 * Merge flat answers with instance-scoped answers.
 * Instance-scoped answers take precedence.
 */
export function mergeWithFlatAnswers(
    flat: Record<string, unknown>,
    answersByInstance: AnswersByInstance
): AnswersByInstance {
    const merged: AnswersByInstance = {};

    for (const [instanceId, instanceAnswers] of Object.entries(answersByInstance)) {
        merged[instanceId] = {
            ...flat,
            ...instanceAnswers,
        };
    }

    return merged;
}
