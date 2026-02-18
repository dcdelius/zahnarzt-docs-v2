/**
 * V10MultiQuestionsPanel — Instance-Grouped Questions
 * 
 * M35: Shows questions grouped by treatment instance (Endo / Füllung).
 * Each instance section has its own questions and submit button.
 */

import React, { useState, useCallback } from 'react';
import { getPack } from '../packs';
import './V10MultiQuestionsPanel.css';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface V10Question {
    id: string;
    text: string;
    type: 'select' | 'text' | 'boolean' | 'multi';
    options?: Array<{ value: string; label: string }>;
    instanceId?: string;
    treatmentType?: 'endo' | 'fuellung' | string;
}

export interface V10Instance {
    id: string;
    treatmentType: 'endo' | 'fuellung' | string;
    treatmentId?: string;
    tooth?: string;
    questions: V10Question[];
}

export type AnswersByInstance = Record<string, Record<string, unknown>>;

interface Props {
    instances: V10Instance[];
    onSubmit: (answersByInstance: AnswersByInstance) => void;
    loading?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function V10MultiQuestionsPanel({ instances, onSubmit, loading }: Props) {
    const [answersByInstance, setAnswersByInstance] = useState<AnswersByInstance>(() => {
        const initial: AnswersByInstance = {};
        for (const inst of instances) {
            initial[inst.id] = {};
        }
        return initial;
    });

    // Track which instances are complete
    const [submittedInstances, setSubmittedInstances] = useState<Set<string>>(new Set());

    const handleAnswerChange = useCallback((instanceId: string, questionId: string, value: unknown) => {
        setAnswersByInstance(prev => ({
            ...prev,
            [instanceId]: {
                ...prev[instanceId],
                [questionId]: value,
            },
        }));
    }, []);

    const handleInstanceSubmit = useCallback((instanceId: string) => {
        setSubmittedInstances(prev => new Set([...prev, instanceId]));

        // Check if all instances are submitted
        const allSubmitted = instances.every(inst =>
            submittedInstances.has(inst.id) || inst.id === instanceId
        );

        if (allSubmitted) {
            onSubmit(answersByInstance);
        }
    }, [instances, submittedInstances, answersByInstance, onSubmit]);

    const handleSubmitAll = useCallback(() => {
        onSubmit(answersByInstance);
    }, [answersByInstance, onSubmit]);

    // Group questions by instance
    const groupedInstances = instances.filter(inst => inst.questions.length > 0);

    if (groupedInstances.length === 0) {
        return null;
    }

    return (
        <div className="v10-multi-questions-panel" data-testid="v10-multi-questions-panel">
            <div className="v10-questions-header">
                <h3>Fragen zur Behandlung</h3>
                <span className="v10-instance-count">{groupedInstances.length} Behandlung{groupedInstances.length > 1 ? 'en' : ''}</span>
            </div>

            {groupedInstances.map(instance => (
                <InstanceSection
                    key={instance.id}
                    instance={instance}
                    answers={answersByInstance[instance.id] || {}}
                    onAnswerChange={(qId, val) => handleAnswerChange(instance.id, qId, val)}
                    onSubmit={() => handleInstanceSubmit(instance.id)}
                    isSubmitted={submittedInstances.has(instance.id)}
                    loading={loading}
                />
            ))}

            {groupedInstances.length > 1 && (
                <div className="v10-submit-all-section">
                    <button
                        className="v10-submit-all-btn"
                        onClick={handleSubmitAll}
                        disabled={loading}
                        data-testid="v10-submit-all-answers"
                    >
                        {loading ? 'Verarbeite...' : 'Alle Antworten senden'}
                    </button>
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// INSTANCE SECTION
// ═══════════════════════════════════════════════════════════════

interface InstanceSectionProps {
    instance: V10Instance;
    answers: Record<string, unknown>;
    onAnswerChange: (questionId: string, value: unknown) => void;
    onSubmit: () => void;
    isSubmitted: boolean;
    loading?: boolean;
}

function InstanceSection({ instance, answers, onAnswerChange, onSubmit, isSubmitted, loading }: InstanceSectionProps) {
    const treatmentId = instance.treatmentId ?? instance.treatmentType;
    const pack = treatmentId ? getPack(treatmentId) : null;
    const treatmentLabel = pack?.meta?.label ?? (instance.treatmentType === 'endo' ? 'Endo' : instance.treatmentType === 'fuellung' ? 'Füllung' : String(treatmentId));
    const treatmentColor = instance.treatmentType === 'endo' ? 'var(--endo-color, #e74c3c)' : 'var(--fuellung-color, #3498db)';

    return (
        <div
            className={`v10-instance-section ${isSubmitted ? 'submitted' : ''}`}
            data-testid={`v10-instance-card-${instance.treatmentType}`}
        >
            <div className="v10-instance-header" style={{ borderLeftColor: treatmentColor }}>
                <span className="v10-instance-badge" style={{ backgroundColor: treatmentColor }}>
                    {treatmentLabel}
                </span>
                {instance.tooth && (
                    <span className="v10-instance-tooth">Zahn {instance.tooth}</span>
                )}
            </div>

            <div className="v10-instance-questions">
                {instance.questions.map(question => (
                    <QuestionRow
                        key={question.id}
                        question={question}
                        value={answers[question.id]}
                        onChange={(val) => onAnswerChange(question.id, val)}
                        instanceId={instance.id}
                        disabled={isSubmitted || loading}
                    />
                ))}
            </div>

            <div className="v10-instance-actions">
                <button
                    className="v10-instance-submit-btn"
                    onClick={onSubmit}
                    disabled={isSubmitted || loading}
                    data-testid={`v10-submit-answers-instance-${instance.id}`}
                >
                    {isSubmitted ? '✓ Beantwortet' : 'Antworten senden'}
                </button>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// QUESTION ROW
// ═══════════════════════════════════════════════════════════════

interface QuestionRowProps {
    question: V10Question;
    value: unknown;
    onChange: (value: unknown) => void;
    instanceId: string;
    disabled?: boolean;
}

function QuestionRow({ question, value, onChange, instanceId, disabled }: QuestionRowProps) {
    return (
        <div
            className="v10-question-row"
            data-testid={`v10-question-${question.id}-instance-${instanceId}`}
        >
            <label className="v10-question-label">{question.text}</label>

            {question.type === 'select' && question.options && (
                <select
                    className="v10-question-select"
                    value={(value as string) || ''}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                >
                    <option value="">Bitte wählen...</option>
                    {question.options.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            )}

            {question.type === 'boolean' && (
                <div className="v10-question-boolean">
                    <button
                        className={`v10-bool-btn ${value === true ? 'selected' : ''}`}
                        onClick={() => onChange(true)}
                        disabled={disabled}
                    >
                        Ja
                    </button>
                    <button
                        className={`v10-bool-btn ${value === false ? 'selected' : ''}`}
                        onClick={() => onChange(false)}
                        disabled={disabled}
                    >
                        Nein
                    </button>
                </div>
            )}

            {question.type === 'text' && (
                <input
                    type="text"
                    className="v10-question-input"
                    value={(value as string) || ''}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                />
            )}
        </div>
    );
}
