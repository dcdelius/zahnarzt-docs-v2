/**
 * QuestionsLayout — V6-style Two-Column Grid
 *
 * Left column (55%): Hero summary (step label, tooth, chips, CTA)
 * Right column (45%): Glass card with questions
 *
 * Mobile: stacked layout
 *
 * ❌ NO logic — pure layout wrapper
 */

import React from 'react';
import { motion } from 'framer-motion';
import type { DynamicQuestion } from '../pipeline/types';
import { SummaryChips } from './SummaryChips';
import { QuestionsCard } from './QuestionsCard';
import { PrimaryCTAButton } from './PrimaryCTAButton';
import {
    colors,
    radii,
    motion as motionTokens,
    typography,
    spacing,
} from '../styles/tokens';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface QuestionsLayoutProps {
    questions: DynamicQuestion[];
    answers: Map<string, unknown>;
    onAnswer: (questionId: string, value: unknown) => void;
    onComplete: () => void;
    extracted?: {
        tooth: string | null;
        surfaces: string[];
        diagnosis: string | null;
    };
    insuranceType: 'GKV' | 'PKV';
    hasMKV: boolean;
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

const styles = {
    container: {
        display: 'grid',
        gridTemplateColumns: '55% 45%',
        gap: '48px',
        alignItems: 'start',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 24px',
    },
    containerMobile: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '32px',
        padding: '0 16px',
    },
    leftColumn: {
        display: 'flex',
        flexDirection: 'column' as const,
        paddingTop: '8px',
    },
    stepLabel: {
        fontSize: typography.label,
        fontWeight: typography.medium,
        letterSpacing: '0.08em',
        color: colors.textMuted,
        textTransform: 'uppercase' as const,
        marginBottom: '12px',
    },
    heroTooth: {
        fontSize: 'clamp(48px, 8vw, 72px)',
        fontWeight: typography.bold,
        color: colors.textPrimary,
        lineHeight: 1,
        marginBottom: '8px',
    },
    heroToothNumber: {
        fontWeight: typography.light,
    },
    ctaArea: {
        marginTop: '40px',
    },
    rightColumn: {
        // Glass card lives here
    },
};

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function QuestionsLayout({
    questions,
    answers,
    onAnswer,
    onComplete,
    extracted,
    insuranceType,
    hasMKV,
}: QuestionsLayoutProps) {
    // Check if all questions are answered
    const allAnswered = questions.every(q => answers.has(q.id));

    // Use CSS media query via window check (simple approach)
    const [isMobile, setIsMobile] = React.useState(false);

    React.useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const toothDisplay = extracted?.tooth || '—';

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: motionTokens.durationLarge }}
            style={isMobile ? styles.containerMobile : styles.container}
        >
            {/* Left Column: Summary + CTA */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                    duration: motionTokens.durationLarge,
                    ease: motionTokens.easing,
                }}
                style={styles.leftColumn}
            >
                {/* Step Label */}
                <div style={styles.stepLabel}>Schritt 2 von 3</div>

                {/* Hero Tooth */}
                <div style={styles.heroTooth}>
                    Zahn{' '}
                    <span style={styles.heroToothNumber}>{toothDisplay}</span>
                </div>

                {/* Summary Chips */}
                <SummaryChips
                    extracted={extracted}
                    insuranceType={insuranceType}
                    hasMKV={hasMKV}
                    answers={answers}
                />

                {/* Primary CTA */}
                <div style={styles.ctaArea}>
                    <PrimaryCTAButton
                        onClick={onComplete}
                        disabled={!allAnswered}
                    >
                        {allAnswered ? 'Fertigstellen' : 'Bitte alle Fragen beantworten'}
                    </PrimaryCTAButton>
                </div>
            </motion.div>

            {/* Right Column: Questions Card */}
            <div style={styles.rightColumn}>
                <QuestionsCard
                    questions={questions}
                    answers={answers}
                    onAnswer={onAnswer}
                    onComplete={onComplete}
                />
            </div>
        </motion.div>
    );
}

export default QuestionsLayout;
