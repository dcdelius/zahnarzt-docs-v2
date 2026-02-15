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
import type { QuestionBundle } from '../../contracts/questions';
import type { V10ReviewContext } from '../types';
import { colors, gradients, radii, shadows, spacing, typography, motion as motionTokens } from '../styles/tokens';
import { V10StageHeader } from './V10StageHeader';
import { V10ReviewSummaryCard } from './V10ReviewSummaryCard';
import { V10QuestionRow } from './V10QuestionRow';
import './QuestionsFlowV2.css';

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
    /** Safe review context (no raw dictation), for "Erkannt" summary */
    review?: V10ReviewContext;
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function QuestionsFlowV2({
    bundle,
    answers,
    onAnswer,
    onComplete,
    extracted,
    review,
}: QuestionsFlowV2Props) {
    // Local state for optional expansion (does NOT modify bundle)
    const defaultExpanded = bundle.docMode === 'forensic';
    const [optionalExpanded, setOptionalExpanded] = useState(defaultExpanded);

    // Compute all questions and answered counts
    const allRequired = bundle.required;
    const allOptionalVisible = bundle.optionalVisible;
    const allOptionalHidden = bundle.optionalHidden;
    const optionalTotal = bundle.optionalTotal;
    const hasHiddenOptional = allOptionalHidden.length > 0;

    // Answers counting
    const answeredRequired = allRequired.filter(q => answers.has(q.id)).length;
    const answeredOptionalVisible = allOptionalVisible.filter(q => answers.has(q.id)).length;
    const answeredOptionalHidden = allOptionalHidden.filter(q => answers.has(q.id)).length;

    const allRequiredAnswered = answeredRequired === allRequired.length;
    const allOptionalAnswered = (answeredOptionalVisible + answeredOptionalHidden) ===
        (allOptionalVisible.length + allOptionalHidden.length);

    // Can complete if all required answered (optional is optional)
    const canComplete = allRequiredAnswered;
    const pendingRequired = Math.max(0, allRequired.length - answeredRequired);

    const sectionCardStyle: React.CSSProperties = {
        padding: spacing.xxl,
        borderRadius: radii.card,
        background: colors.surfaceGlass,
        boxShadow: shadows.cardMedium,
        backdropFilter: 'blur(18px)',
    };

    return (
        <div className="v7" data-testid="v10-questions-flow-v2">
            <div className="v7-container v10-questions-shell">
                {/* Header */}
                <header style={{ marginTop: spacing.xxxl }}>
                    <V10StageHeader
                        kicker="Rückfragen"
                        title="Details klären"
                        right={(
                            <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
                                <div
                                    style={{
                                        padding: '10px 14px',
                                        borderRadius: radii.pill,
                                        background: gradients.innerHighlightStrong,
                                        border: 'none',
                                        fontSize: typography.caption,
                                        color: colors.textSecondary,
                                        fontWeight: typography.semibold,
                                        letterSpacing: '0.10em',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    Erforderlich&nbsp;
                                    <span style={{ color: colors.textPrimary }}>
                                        {answeredRequired}/{allRequired.length}
                                    </span>
                                </div>
                                {optionalTotal > 0 ? (
                                    <div
                                        style={{
                                            padding: '10px 14px',
                                            borderRadius: radii.pill,
                                            background: colors.surfaceGlassActive,
                                            fontSize: typography.caption,
                                            color: colors.textSecondary,
                                            fontWeight: typography.semibold,
                                            letterSpacing: '0.10em',
                                            textTransform: 'uppercase',
                                        }}
                                    >
                                        Optional&nbsp;
                                        <span style={{ color: colors.textPrimary }}>
                                            {answeredOptionalVisible + answeredOptionalHidden}/{optionalTotal}
                                        </span>
                                    </div>
                                ) : null}
                            </div>
                        )}
                    />
                </header>

                <div className="v10-questions-grid">
                    <aside className="v10-questions-stack">
                        <V10ReviewSummaryCard
                            review={review}
                            extractedFallback={extracted}
                            title="Erkannt & Standards"
                            maxPills={6}
                            maxStandards={8}
                        />
                    </aside>

                    <main className="v10-questions-stack">
                        {/* REQUIRED SECTION — Always visible, cannot collapse */}
                        {allRequired.length > 0 && (
                            <section data-testid="required-section" style={sectionCardStyle}>
                                <div
                                    style={{
                                        marginBottom: spacing.md,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: spacing.sm,
                                    }}
                                >
                                    <div style={{ fontSize: typography.label, fontWeight: typography.semibold, letterSpacing: '0.14em', textTransform: 'uppercase', color: colors.coralAccent }}>
                                        Erforderlich
                                    </div>
                                    <span style={{ fontSize: typography.caption, fontWeight: typography.semibold, color: colors.textSecondary }}>
                                        {answeredRequired}/{allRequired.length}
                                    </span>
                                </div>
                                <div style={{ display: 'grid', gap: spacing.md }}>
                                    {allRequired.map(question => (
                                        <V10QuestionRow
                                            key={question.id}
                                            question={question}
                                            value={answers.get(question.id)}
                                            onChange={(value) => onAnswer(question.id, value)}
                                            isMedical={question.medicalSeverity === 'hard'}
                                            variant="bare"
                                        />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* OPTIONAL SECTION — Collapsible */}
                        {optionalTotal > 0 && (
                            <section data-testid="optional-section">
                                {hasHiddenOptional ? (
                                    <>
                                        <motion.button
                                            onClick={() => setOptionalExpanded(!optionalExpanded)}
                                            whileHover={{ y: -1 }}
                                            whileTap={{ scale: 0.99 }}
                                            style={{
                                                width: '100%',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                background: colors.surfaceGlass,
                                                border: 'none',
                                                borderRadius: radii.pill,
                                                cursor: 'pointer',
                                                padding: '12px 16px',
                                                boxShadow: shadows.cardHover,
                                                backdropFilter: 'blur(16px)',
                                            }}
                                            data-testid="optional-toggle"
                                        >
                                            <div style={{ fontSize: typography.label, fontWeight: typography.semibold, letterSpacing: '0.14em', textTransform: 'uppercase', color: colors.textSecondary }}>
                                                Optional ({optionalTotal})
                                            </div>
                                            <div style={{ fontSize: typography.caption, fontWeight: typography.semibold, color: colors.coralAccent }}>
                                                {optionalExpanded ? 'Weniger' : `Mehr (${allOptionalHidden.length})`}
                                            </div>
                                        </motion.button>

                                        <AnimatePresence>
                                            {optionalExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: motionTokens.durationSmall }}
                                                    style={{ marginTop: spacing.md }}
                                                >
                                                    <div style={sectionCardStyle}>
                                                        <div style={{ display: 'grid', gap: spacing.md }}>
                                                            {/* Visible optional */}
                                                            {allOptionalVisible.map(question => (
                                                                <V10QuestionRow
                                                                    key={question.id}
                                                                    question={question}
                                                                    value={answers.get(question.id)}
                                                                    onChange={(value) => onAnswer(question.id, value)}
                                                                    isMedical={question.medicalSeverity === 'soft'}
                                                                    variant="bare"
                                                                />
                                                            ))}
                                                            {/* Hidden optional (revealed on expand) */}
                                                            {allOptionalHidden.map(question => (
                                                                <V10QuestionRow
                                                                    key={question.id}
                                                                    question={question}
                                                                    value={answers.get(question.id)}
                                                                    onChange={(value) => onAnswer(question.id, value)}
                                                                    isMedical={false}
                                                                    variant="bare"
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Show visible optional even when collapsed */}
                                        {!optionalExpanded && allOptionalVisible.length > 0 && (
                                            <div style={{ marginTop: spacing.md }}>
                                                <div style={sectionCardStyle}>
                                                    <div style={{ display: 'grid', gap: spacing.md }}>
                                                        {allOptionalVisible.map(question => (
                                                            <V10QuestionRow
                                                                key={question.id}
                                                                question={question}
                                                                value={answers.get(question.id)}
                                                                onChange={(value) => onAnswer(question.id, value)}
                                                                isMedical={question.medicalSeverity === 'soft'}
                                                                variant="bare"
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div style={sectionCardStyle}>
                                        <div style={{ display: 'grid', gap: spacing.md }}>
                                            {allOptionalVisible.map(question => (
                                                <V10QuestionRow
                                                    key={question.id}
                                                    question={question}
                                                    value={answers.get(question.id)}
                                                    onChange={(value) => onAnswer(question.id, value)}
                                                    isMedical={question.medicalSeverity === 'soft'}
                                                    variant="bare"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </section>
                        )}
                    </main>
                </div>

                {/* Sticky Action Bar */}
                <motion.div
                    style={{
                        position: 'sticky',
                        bottom: 24,
                        margin: '32px 0 20px',
                        padding: '14px 18px',
                        borderRadius: radii.pill,
                        background: colors.surfaceGlass,
                        backdropFilter: 'blur(18px)',
                        border: 'none',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        boxShadow: shadows.barDefault,
                    }}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: motionTokens.durationSmall, ease: motionTokens.easing }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            border: `2px solid ${allRequiredAnswered ? '#22c55e' : colors.coralAccent}`,
                            display: 'grid', placeItems: 'center',
                            fontSize: 11, fontWeight: 700,
                            color: colors.textPrimary
                        }}>
                            {allRequired.length > 0 ? Math.round((answeredRequired / allRequired.length) * 100) : 100}%
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: colors.textSecondary }}>
                            {pendingRequired > 0 ? `Offen ${pendingRequired}` : 'Bereit'}
                        </span>
                    </div>

                    <div style={{ display: 'flex', gap: 12 }}>
                        <motion.button
                            data-testid="complete-button"
                            onClick={onComplete}
                            disabled={!canComplete}
                            style={{
                                padding: '10px 18px',
                                borderRadius: radii.pill,
                                border: 'none',
                                background: gradients.button,
                                color: colors.textPrimary,
                                fontSize: 14,
                                fontWeight: typography.semibold,
                                boxShadow: shadows.buttonDefault,
                                opacity: canComplete ? 1 : 0.5,
                                cursor: canComplete ? 'pointer' : 'not-allowed'
                            }}
                            whileHover={canComplete ? { y: -1 } : undefined}
                            whileTap={canComplete ? { scale: 0.98 } : undefined}
                        >
                            Fertigstellen
                        </motion.button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
