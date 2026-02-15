/**
 * Endo Lab Page — DEV-only QA Harness
 *
 * ═══════════════════════════════════════════════════════════════
 * Paste dictation text, see parsed signals, questions, output.
 * For testing "not according to plan" scenarios.
 * Hidden behind DEV flag.
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Clipboard, Terminal } from 'lucide-react';
import {
    colors,
    gradients,
    typography,
    radii,
    spacing,
    motion as motionTokens,
} from '../../styles/tokens';

// Core endo imports
import { parseEndoSignals } from '../../../core/playbooks/endo/endoSignalParser';
import { endoPlaybookV2, ENDO_QUESTIONS_BY_PHASE_V2 } from '../../../core/playbooks/endo/endoPlaybookV2';

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

const styles = {
    page: {
        minHeight: '100vh',
        background: gradients.heroDeep,
        fontFamily: typography.fontFamily,
        padding: `${spacing.heroTop} ${spacing.heroPadding}`,
    },
    header: {
        marginBottom: spacing.xl,
    },
    backButton: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: spacing.sm,
        background: 'transparent',
        border: 'none',
        color: colors.textMuted,
        fontSize: typography.label,
        fontWeight: typography.medium,
        cursor: 'pointer',
        marginBottom: spacing.lg,
        padding: 0,
    },
    title: {
        fontSize: typography.headlineSmall,
        fontWeight: typography.light,
        color: colors.textPrimary,
        letterSpacing: '-0.02em',
    },
    badge: {
        display: 'inline-block',
        padding: `${spacing.xs} ${spacing.md}`,
        borderRadius: radii.pill,
        background: 'rgba(255, 193, 7, 0.2)',
        color: '#FFD54F',
        fontSize: typography.caption,
        fontWeight: typography.semibold,
        marginLeft: spacing.md,
        verticalAlign: 'middle',
    },
    inputSection: {
        marginBottom: spacing.xl,
    },
    label: {
        fontSize: typography.caption,
        fontWeight: typography.medium,
        color: colors.textMuted,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.1em',
        marginBottom: spacing.sm,
        display: 'block',
    },
    textarea: {
        width: '100%',
        minHeight: '120px',
        padding: spacing.lg,
        borderRadius: radii.cardSmall,
        border: `1px solid ${colors.lineSoft}`,
        background: colors.surfaceGlass,
        color: colors.textPrimary,
        fontSize: typography.body,
        fontFamily: typography.fontFamily,
        resize: 'vertical' as const,
        outline: 'none',
    },
    runButton: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: spacing.sm,
        padding: `${spacing.md} ${spacing.xl}`,
        borderRadius: radii.pill,
        border: 'none',
        background: gradients.button,
        color: colors.textPrimary,
        fontSize: typography.body,
        fontWeight: typography.semibold,
        cursor: 'pointer',
        marginTop: spacing.lg,
    },
    outputGrid: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: spacing.xl,
    },
    outputSection: {
        background: colors.surfaceGlass,
        borderRadius: radii.card,
        padding: spacing.lg,
        backdropFilter: 'blur(12px)',
    },
    sectionTitle: {
        display: 'flex',
        alignItems: 'center',
        gap: spacing.sm,
        fontSize: typography.label,
        fontWeight: typography.semibold,
        color: colors.textSecondary,
        marginBottom: spacing.md,
    },
    pre: {
        fontFamily: 'monospace',
        fontSize: '13px',
        lineHeight: 1.5,
        color: colors.textPrimary,
        whiteSpace: 'pre-wrap' as const,
        wordBreak: 'break-word' as const,
        margin: 0,
        maxHeight: '300px',
        overflow: 'auto',
    },
    empty: {
        color: colors.textMuted,
        fontStyle: 'italic',
    },
};

// ═══════════════════════════════════════════════════════════════
// TEST SCENARIOS
// ═══════════════════════════════════════════════════════════════

const TEST_SCENARIOS = [
    {
        label: 'T2 med change',
        text: 'Zahn 46 WB T2 Medikamenteneinlage Calciumhydroxid Arbeitslängen 20 19 18mm ISO 35 25 20 Spülung NaOCl',
    },
    {
        label: 'T2 still symptomatic',
        text: 'Zahn 36 WB T2 Patient noch symptomatisch Fistel persistiert Drainage Entscheidung abwarten',
    },
    {
        label: 'Canal not negotiable',
        text: 'Zahn 16 WB T2 mb2 nicht via apikalen bereich erreichbar Limitation dokumentiert next visit plan ApikoRes',
    },
    {
        label: 'Obturation postponed',
        text: 'Zahn 46 WB T3 geplante Obturation verschoben Patient hat Beschwerden Medikamenteneinlage erneut',
    },
];

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function EndoLabPage() {
    const navigate = useNavigate();
    const [input, setInput] = useState('');
    const [parsedSignals, setParsedSignals] = useState<object | null>(null);
    const [playbookResult, setPlaybookResult] = useState<object | null>(null);
    const [error, setError] = useState<string | null>(null);

    const runAnalysis = () => {
        if (!input.trim()) return;

        setError(null);

        try {
            // Parse signals
            const signals = parseEndoSignals(input);
            setParsedSignals(signals);

            // Determine phase and get relevant questions
            const phase = signals.phase || 't1';
            const commonQuestions = ENDO_QUESTIONS_BY_PHASE_V2['common'] || [];
            const phaseQuestions = ENDO_QUESTIONS_BY_PHASE_V2[phase] || [];

            // Filter questions based on askCondition
            const applicableQuestions = [...commonQuestions, ...phaseQuestions].filter(q => {
                if (q.askCondition) {
                    return q.askCondition(signals);
                }
                return true;
            });

            const result = {
                phase,
                signals,
                questions: applicableQuestions.map(q => ({
                    id: q.id,
                    title: q.title,
                    prompt: q.prompt,
                    severity: q.severity,
                    answerType: q.answerType,
                })),
                playbookVersion: endoPlaybookV2.version,
            };

            setPlaybookResult(result);

            // Log to console for QA
            console.group('🦷 Endo Lab Analysis');
            console.log('Input:', input);
            console.log('Signals:', signals);
            console.log('Playbook Result:', result);
            console.groupEnd();
        } catch (e: any) {
            setError(e.message);
            console.error('[EndoLab] Error:', e);
        }
    };

    const loadScenario = (text: string) => {
        setInput(text);
        setParsedSignals(null);
        setPlaybookResult(null);
    };

    return (
        <motion.div
            style={styles.page}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: motionTokens.durationLarge }}
        >
            {/* Header */}
            <div style={styles.header}>
                <motion.button
                    style={styles.backButton}
                    onClick={() => navigate('/docudent/v7')}
                    whileHover={{ color: colors.textSecondary }}
                >
                    <ArrowLeft size={16} />
                    Zurück
                </motion.button>

                <h1 style={styles.title}>
                    Endo Lab
                    <span style={styles.badge}>DEV</span>
                </h1>
            </div>

            {/* Test Scenarios */}
            <div style={{ marginBottom: spacing.lg }}>
                <span style={styles.label}>Szenarien laden</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm }}>
                    {TEST_SCENARIOS.map((s) => (
                        <motion.button
                            key={s.label}
                            onClick={() => loadScenario(s.text)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            style={{
                                padding: `${spacing.xs} ${spacing.md}`,
                                borderRadius: radii.pill,
                                border: 'none',
                                background: colors.surfaceGlass,
                                color: colors.textSecondary,
                                fontSize: typography.caption,
                                cursor: 'pointer',
                            }}
                        >
                            {s.label}
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Input */}
            <div style={styles.inputSection}>
                <label style={styles.label}>Diktat-Text</label>
                <textarea
                    style={styles.textarea}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Zahn 46 WB T2 Medikamenteneinlage Calciumhydroxid Arbeitslängen 20 19 18mm..."
                />
                <motion.button
                    style={styles.runButton}
                    onClick={runAnalysis}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <Play size={18} />
                    Analysieren
                </motion.button>
            </div>

            {/* Error */}
            {error && (
                <div style={{ color: '#FF6B6B', marginBottom: spacing.lg }}>
                    Fehler: {error}
                </div>
            )}

            {/* Output */}
            <div style={styles.outputGrid}>
                {/* Parsed Signals */}
                <div style={styles.outputSection}>
                    <div style={styles.sectionTitle}>
                        <Terminal size={16} />
                        Parsed Signals
                    </div>
                    {parsedSignals ? (
                        <pre style={styles.pre}>
                            {JSON.stringify(parsedSignals, null, 2)}
                        </pre>
                    ) : (
                        <span style={styles.empty}>Noch keine Analyse...</span>
                    )}
                </div>

                {/* Playbook Result */}
                <div style={styles.outputSection}>
                    <div style={styles.sectionTitle}>
                        <Clipboard size={16} />
                        Playbook Result (Questions + Output)
                    </div>
                    {playbookResult ? (
                        <pre style={styles.pre}>
                            {JSON.stringify(playbookResult, null, 2)}
                        </pre>
                    ) : (
                        <span style={styles.empty}>Noch keine Analyse...</span>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

export default EndoLabPage;
