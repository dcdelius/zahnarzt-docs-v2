/**
 * QuestionsFlow — PURE DUMB RENDERER
 * 
 * Contract:
 * - Receives: questions[], answers (Map), onAnswer, onComplete
 * - Renders each question with controlled state
 * - Calls onAnswer(questionId, value) on click
 * - Calls onComplete() when user clicks "Fertigstellen"
 * 
 * ❌ NO step gating logic
 * ❌ NO "required" decisions
 * ❌ NO mock data
 * ✅ PURE rendering of props
 */

import React from 'react';
import { motion } from 'framer-motion';
import type { DynamicQuestion } from '../../contracts/questions';

interface QuestionsFlowProps {
    questions: DynamicQuestion[];
    answers: Map<string, unknown>;
    onAnswer: (questionId: string, value: unknown) => void;
    onComplete: () => void;
    extracted?: {
        tooth?: string | null;
        surfaces?: string[];
        diagnosis?: string | null;
    };
}

export function QuestionsFlow({
    questions,
    answers,
    onAnswer,
    onComplete,
    extracted
}: QuestionsFlowProps) {
    // Count answered vs total
    const answeredCount = questions.filter(q => answers.has(q.id)).length;
    const totalCount = questions.length;
    const allAnswered = answeredCount === totalCount;

    return (
        <div className="v7">
            <div className="v7-bg" />

            <div className="v7-container" style={{ maxWidth: 760 }}>
                {/* Header */}
                <header style={{ marginTop: 60, marginBottom: 40 }}>
                    <div className="v7-kicker" style={{ marginBottom: 12 }}>Rückfragen</div>
                    <h2 className="v7-h1" style={{ fontSize: 42, color: 'var(--v7-ink)' }}>Details klären</h2>
                    {extracted?.tooth && (
                        <p className="v7-lead" style={{ fontSize: 16, color: 'var(--v7-ink-soft)', marginTop: 12 }}>
                            Wir benötigen noch ein paar Angaben zu <strong>Zahn {extracted.tooth}</strong>.
                        </p>
                    )}
                </header>

                {/* Questions List */}
                <div style={{ borderTop: '1px solid var(--v7-hairline)' }}>
                    {questions.map((question) => (
                        <QuestionRow
                            key={question.id}
                            question={question}
                            currentValue={answers.get(question.id)}
                            onAnswer={(value) => onAnswer(question.id, value)}
                        />
                    ))}
                </div>

                {/* Sticky Action Bar */}
                <div
                    style={{
                        position: 'sticky', bottom: 24, margin: '40px 0 20px',
                        padding: '16px 24px', borderRadius: 'var(--v7-r-xl)',
                        background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(16px)',
                        border: '1px solid rgba(255,255,255,0.4)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        boxShadow: 'var(--v7-shadow-soft)'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            border: '2px solid var(--v7-orange)',
                            display: 'grid', placeItems: 'center',
                            fontSize: 11, fontWeight: 700
                        }}>
                            {totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0}%
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--v7-ink-soft)' }}>
                            {totalCount - answeredCount > 0
                                ? `Noch ${totalCount - answeredCount} Frage${totalCount - answeredCount > 1 ? 'n' : ''}`
                                : 'Alle beantwortet'
                            }
                        </span>
                    </div>

                    <div style={{ display: 'flex', gap: 12 }}>
                        <button
                            className="v7-cta"
                            data-testid="complete-button"
                            onClick={onComplete}
                            disabled={!allAnswered}
                            style={{
                                opacity: allAnswered ? 1 : 0.5,
                                cursor: allAnswered ? 'pointer' : 'not-allowed'
                            }}
                        >
                            Fertigstellen
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// QUESTION ROW — Renders a single question with controlled state
// ═══════════════════════════════════════════════════════════════

interface QuestionRowProps {
    question: DynamicQuestion;
    currentValue: unknown;
    onAnswer: (value: unknown) => void;
}

function QuestionRow({ question, currentValue, onAnswer }: QuestionRowProps) {
    const { id, question: label, type, options } = question;

    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 18,
                padding: '24px 0',
                borderBottom: '1px solid var(--v7-hairline)',
                alignItems: 'center'
            }}
            data-testid={`question-row-${id}`}
        >
            {/* Label */}
            <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, fontFamily: 'var(--v7-font-body)' }}>
                    {label}
                </h3>
                {/* Note: upsellNotes may come from questionService but is not in DynamicQuestion contract */}
                {(question as any).upsellNotes && (
                    <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--v7-ink-soft)' }}>
                        {(question as any).upsellNotes}
                    </p>
                )}
            </div>

            {/* Control — Maps DynamicQuestion.type to UI */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {/* 'single' type: Render as choice options (most common) */}
                {type === 'single' && options && options.length > 0 && options.map((opt) => (
                    <OptionButton
                        key={opt.id}
                        label={opt.label}
                        isActive={currentValue === opt.dataValue || currentValue === opt.id}
                        onClick={() => onAnswer(opt.dataValue ?? opt.id)}
                    />
                ))}

                {/* 'single' with yes/no options (boolean-like) */}
                {type === 'single' && (!options || options.length === 0) && (
                    <>
                        <OptionButton
                            label="Ja"
                            isActive={currentValue === true || currentValue === 'ja'}
                            onClick={() => onAnswer(true)}
                        />
                        <OptionButton
                            label="Nein"
                            isActive={currentValue === false || currentValue === 'nein'}
                            onClick={() => onAnswer(false)}
                        />
                    </>
                )}

                {/* 'number' type: Numeric input */}
                {type === 'number' && (
                    <input
                        type="number"
                        value={currentValue !== undefined ? String(currentValue) : ''}
                        onChange={(e) => onAnswer(e.target.value ? Number(e.target.value) : undefined)}
                        min={question.min}
                        max={question.max}
                        step={question.step}
                        style={{
                            width: 80, textAlign: 'center', padding: '10px',
                            borderRadius: '999px', border: '1px solid var(--v7-hairline)',
                            background: 'rgba(255,255,255,0.6)', fontSize: 16, fontWeight: 700
                        }}
                        data-testid={`input-${id}`}
                    />
                )}

                {/* 'multi' type: Multi-select (render as toggleable pills) */}
                {type === 'multi' && options?.map((opt) => {
                    const currentArray = Array.isArray(currentValue) ? currentValue : [];
                    const isSelected = currentArray.includes(opt.dataValue ?? opt.id);
                    return (
                        <OptionButton
                            key={opt.id}
                            label={opt.label}
                            isActive={isSelected}
                            onClick={() => {
                                const val = opt.dataValue ?? opt.id;
                                if (isSelected) {
                                    onAnswer(currentArray.filter(v => v !== val));
                                } else {
                                    onAnswer([...currentArray, val]);
                                }
                            }}
                        />
                    );
                })}

                {/* Fallback: No type or unknown — render options if present */}
                {!type && options && options.map((opt) => (
                    <OptionButton
                        key={opt.id}
                        label={opt.label}
                        isActive={currentValue === opt.dataValue || currentValue === opt.id}
                        onClick={() => onAnswer(opt.dataValue ?? opt.id)}
                    />
                ))}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// OPTION BUTTON — Controlled pill button
// ═══════════════════════════════════════════════════════════════

interface OptionButtonProps {
    label: string;
    isActive: boolean;
    onClick: () => void;
}

function OptionButton({ label, isActive, onClick }: OptionButtonProps) {
    return (
        <motion.button
            type="button"
            onClick={onClick}
            className="v7-pill"
            animate={{
                background: isActive ? 'var(--v7-ink)' : 'transparent',
                color: isActive ? 'white' : 'var(--v7-ink)',
            }}
            transition={{ duration: 0.15 }}
            style={{
                padding: '8px 16px',
                borderRadius: '999px',
                border: '1px solid var(--v7-hairline)',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
            }}
            data-testid={`option-${label}`}
        >
            {label}
        </motion.button>
    );
}
