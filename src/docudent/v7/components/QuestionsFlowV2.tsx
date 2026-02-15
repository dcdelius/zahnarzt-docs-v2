/**
 * QuestionsFlowV2 — Progressive Disclosure with QuestionBundle
 *
 * P12.7: Wire to QuestionBundle for required/optional separation.
 *
 * Contract:
 * - Receives: bundle (QuestionBundle), answers, onAnswer, onComplete
 * - Renders REQUIRED section (always visible, cannot collapse)
 * - Renders OPTIONAL section with toggle (visible/hidden based on docMode)
 * - Respects medicalSeverity for visual hints
 * - NEVER removes questions (set equality preserved)
 *
 * INVARIANTS:
 * - (optionalVisible ∪ optionalHidden) === original optional list
 * - Required questions always visible
 * - No medical logic here — pure rendering
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DynamicQuestion, QuestionBundle } from '../../contracts/questions';

// ═══════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════

interface QuestionsFlowV2Props {
    /** Question bundle with required/optional separation */
    bundle: QuestionBundle;
    /** Current answers map */
    answers: Map<string, unknown>;
    /** Called when user answers a question */
    onAnswer: (questionId: string, value: unknown) => void;
    /** Called when user completes questions */
    onComplete: () => void;
    /** Extracted data for context display */
    extracted?: {
        tooth?: string | null;
        surfaces?: string[];
        diagnosis?: string | null;
    };
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function QuestionsFlowV2({
    bundle,
    answers,
    onAnswer,
    onComplete,
    extracted
}: QuestionsFlowV2Props) {
    // Local state for optional expansion (does NOT modify bundle)
    const defaultExpanded = bundle.docMode === 'forensic';
    const [optionalExpanded, setOptionalExpanded] = useState(defaultExpanded);

    // Compute all questions and answered counts
    const allRequired = bundle.required;
    const allOptionalVisible = bundle.optionalVisible;
    const allOptionalHidden = bundle.optionalHidden;
    const optionalTotal = bundle.optionalTotal;

    // Answers counting
    const answeredRequired = allRequired.filter(q => answers.has(q.id)).length;
    const answeredOptionalVisible = allOptionalVisible.filter(q => answers.has(q.id)).length;
    const answeredOptionalHidden = allOptionalHidden.filter(q => answers.has(q.id)).length;

    const allRequiredAnswered = answeredRequired === allRequired.length;
    const allOptionalAnswered = (answeredOptionalVisible + answeredOptionalHidden) ===
        (allOptionalVisible.length + allOptionalHidden.length);

    // Can complete if all required answered (optional is optional)
    const canComplete = allRequiredAnswered;

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

                {/* REQUIRED SECTION — Always visible, cannot collapse */}
                {allRequired.length > 0 && (
                    <section data-testid="required-section">
                        <div
                            className="v7-kicker"
                            style={{
                                marginBottom: 8,
                                color: 'var(--v7-red, #c00)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8
                            }}
                        >
                            ERFORDERLICH
                            <span style={{ fontSize: 12, fontWeight: 500 }}>
                                ({answeredRequired}/{allRequired.length})
                            </span>
                        </div>
                        <div style={{ borderTop: '1px solid var(--v7-hairline)' }}>
                            {allRequired.map(question => (
                                <QuestionRow
                                    key={question.id}
                                    question={question}
                                    currentValue={answers.get(question.id)}
                                    onAnswer={(value) => onAnswer(question.id, value)}
                                    isMedical={question.medicalSeverity === 'hard'}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* OPTIONAL SECTION — Collapsible */}
                {optionalTotal > 0 && (
                    <section style={{ marginTop: 32 }} data-testid="optional-section">
                        <button
                            onClick={() => setOptionalExpanded(!optionalExpanded)}
                            style={{
                                width: '100%',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '12px 0',
                                borderTop: '1px solid var(--v7-hairline)'
                            }}
                            data-testid="optional-toggle"
                        >
                            <div className="v7-kicker" style={{ color: 'var(--v7-ink-soft)' }}>
                                OPTIONAL ({optionalTotal})
                            </div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--v7-orange)' }}>
                                {optionalExpanded ? 'Verbergen' : `${allOptionalHidden.length} weitere anzeigen`}
                            </div>
                        </button>

                        <AnimatePresence>
                            {optionalExpanded && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {/* Visible optional */}
                                    {allOptionalVisible.map(question => (
                                        <QuestionRow
                                            key={question.id}
                                            question={question}
                                            currentValue={answers.get(question.id)}
                                            onAnswer={(value) => onAnswer(question.id, value)}
                                            isMedical={question.medicalSeverity === 'soft'}
                                        />
                                    ))}
                                    {/* Hidden optional (revealed on expand) */}
                                    {allOptionalHidden.map(question => (
                                        <QuestionRow
                                            key={question.id}
                                            question={question}
                                            currentValue={answers.get(question.id)}
                                            onAnswer={(value) => onAnswer(question.id, value)}
                                            isMedical={false}
                                        />
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Show visible optional even when collapsed */}
                        {!optionalExpanded && allOptionalVisible.length > 0 && (
                            <div>
                                {allOptionalVisible.map(question => (
                                    <QuestionRow
                                        key={question.id}
                                        question={question}
                                        currentValue={answers.get(question.id)}
                                        onAnswer={(value) => onAnswer(question.id, value)}
                                        isMedical={question.medicalSeverity === 'soft'}
                                    />
                                ))}
                            </div>
                        )}
                    </section>
                )}

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
                            border: `2px solid ${allRequiredAnswered ? 'var(--v7-green, #090)' : 'var(--v7-orange)'}`,
                            display: 'grid', placeItems: 'center',
                            fontSize: 11, fontWeight: 700
                        }}>
                            {allRequired.length > 0 ? Math.round((answeredRequired / allRequired.length) * 100) : 100}%
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--v7-ink-soft)' }}>
                            {allRequired.length - answeredRequired > 0
                                ? `Noch ${allRequired.length - answeredRequired} erforderliche`
                                : 'Alle erforderlichen beantwortet'
                            }
                        </span>
                    </div>

                    <div style={{ display: 'flex', gap: 12 }}>
                        <button
                            className="v7-cta"
                            data-testid="complete-button"
                            onClick={onComplete}
                            disabled={!canComplete}
                            style={{
                                opacity: canComplete ? 1 : 0.5,
                                cursor: canComplete ? 'pointer' : 'not-allowed'
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
// QUESTION ROW
// ═══════════════════════════════════════════════════════════════

interface QuestionRowProps {
    question: DynamicQuestion;
    currentValue: unknown;
    onAnswer: (value: unknown) => void;
    isMedical?: boolean;
}

function QuestionRow({ question, currentValue, onAnswer, isMedical }: QuestionRowProps) {
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
            {/* Label with medical indicator */}
            <div>
                <h3 style={{
                    margin: 0,
                    fontSize: 18,
                    fontWeight: 600,
                    fontFamily: 'var(--v7-font-body)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                }}>
                    {label}
                    {isMedical && (
                        <span
                            style={{
                                fontSize: 10,
                                padding: '2px 6px',
                                borderRadius: 4,
                                background: 'var(--v7-red, #c00)',
                                color: 'white',
                                fontWeight: 700
                            }}
                            title="Medizinisch erforderlich"
                        >
                            MED
                        </span>
                    )}
                </h3>
            </div>

            {/* Control — Maps DynamicQuestion.type to UI */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {/* 'single' type: Render as choice options */}
                {type === 'single' && options && options.length > 0 && options.map((opt) => (
                    <OptionButton
                        key={opt.id}
                        label={opt.label}
                        isActive={currentValue === opt.dataValue || currentValue === opt.id}
                        onClick={() => onAnswer(opt.dataValue ?? opt.id)}
                    />
                ))}

                {/* 'single' with yes/no options */}
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

                {/* 'number' type */}
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

                {/* 'multi' type */}
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

                {/* Fallback */}
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
// OPTION BUTTON
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
