/**
 * QuestionsCard — V6-style Glass Card Container
 *
 * Single glass card containing all questions, grouped by category.
 * Uses QuestionRenderer for content, wrapped in V6 glass styling.
 *
 * ❌ NO logic — pure presentation wrapper
 */

import React from 'react';
import { motion } from 'framer-motion';
import type { DynamicQuestion } from '../pipeline/types';
import { QuestionRenderer } from './QuestionRenderer';
import {
    colors,
    gradients,
    shadows,
    radii,
    motion as motionTokens,
    typography,
    spacing,
} from '../styles/tokens';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface QuestionsCardProps {
    questions: DynamicQuestion[];
    answers: Map<string, unknown>;
    onAnswer: (questionId: string, value: unknown) => void;
    onComplete: () => void;
}

// ═══════════════════════════════════════════════════════════════
// STYLES — V6 Glass Card
// ═══════════════════════════════════════════════════════════════

const styles = {
    card: {
        position: 'relative' as const,
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRadius: radii.card,
        padding: '32px',
        boxShadow: `
            0 24px 48px rgba(0, 0, 0, 0.18),
            0 8px 24px rgba(0, 0, 0, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.12)
        `,
        border: '1px solid rgba(255, 255, 255, 0.08)',
        overflow: 'hidden',
    },
    innerHighlight: {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        right: 0,
        height: '50%',
        background: gradients.innerHighlight,
        borderRadius: `${radii.card} ${radii.card} 0 0`,
        pointerEvents: 'none' as const,
    },
    header: {
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: `1px solid ${colors.lineUltraSoft}`,
    },
    headerTitle: {
        fontSize: typography.subtitle,
        fontWeight: typography.semibold,
        color: colors.textPrimary,
        margin: 0,
    },
    headerSubtitle: {
        fontSize: typography.label,
        color: colors.textMuted,
        marginTop: '4px',
    },
    content: {
        position: 'relative' as const,
    },
};

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function QuestionsCard({
    questions,
    answers,
    onAnswer,
    onComplete,
}: QuestionsCardProps) {
    // Count unanswered questions
    const unansweredCount = questions.filter(q => !answers.has(q.id)).length;
    const totalCount = questions.length;

    return (
        <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
                duration: motionTokens.durationLarge,
                ease: motionTokens.easing,
                delay: 0.1,
            }}
            style={styles.card}
        >
            {/* Inner highlight for glass materiality */}
            <div style={styles.innerHighlight} />

            {/* Header */}
            <div style={styles.header}>
                <h3 style={styles.headerTitle}>Rückfragen</h3>
                <div style={styles.headerSubtitle}>
                    {unansweredCount > 0
                        ? `${unansweredCount} von ${totalCount} offen`
                        : 'Alle beantwortet'}
                </div>
            </div>

            {/* Questions content */}
            <div style={styles.content}>
                <QuestionRenderer
                    questions={questions}
                    answers={answers}
                    onAnswer={onAnswer}
                    onComplete={onComplete}
                />
            </div>
        </motion.div>
    );
}

export default QuestionsCard;
