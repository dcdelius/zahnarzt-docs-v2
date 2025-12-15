/**
 * V7 Question Renderer — CONTENT ONLY
 *
 * Renders question content for embedding in QuestionsCard.
 * NO page structure, NO headers — pure question list.
 *
 * V6 styling: glass option pills, focused interactions.
 *
 * ❌ NO logic changes — same props, same callbacks
 * ✅ Pure presentation layer
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DynamicQuestion } from '../pipeline/types';
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

interface QuestionRendererProps {
    questions: DynamicQuestion[];
    answers: Map<string, unknown>;
    onAnswer: (questionId: string, value: unknown) => void;
    onComplete: () => void;
}

// ═══════════════════════════════════════════════════════════════
// STYLES — V6 PREMIUM AESTHETIC
// ═══════════════════════════════════════════════════════════════

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '20px',
    },

    // Category section
    section: {
        marginBottom: '8px',
    },
    sectionHeader: {
        fontSize: typography.label,
        fontWeight: typography.medium,
        color: colors.textMuted,
        letterSpacing: '0.05em',
        textTransform: 'uppercase' as const,
        marginBottom: '12px',
        paddingBottom: '8px',
        borderBottom: `1px solid ${colors.lineUltraSoft}`,
    },

    // Question item
    questionItem: {
        marginBottom: '16px',
    },
    questionPrompt: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        marginBottom: '10px',
    },
    questionIcon: {
        fontSize: '16px',
        lineHeight: 1.4,
        flexShrink: 0,
    },
    questionText: {
        fontSize: typography.bodySmall,
        fontWeight: typography.medium,
        color: colors.textPrimary,
        lineHeight: 1.4,
    },

    // Options grid
    optionsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '8px',
        marginLeft: '26px', // Align with text after icon
    },

    // Number input
    numberInputWrapper: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '8px',
        marginLeft: '26px',
    },
    numberInput: {
        width: '120px',
        padding: '10px 14px',
        borderRadius: radii.cardSmall,
        border: `1px solid ${colors.lineSoft}`,
        background: colors.surfaceGlass,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        color: colors.textPrimary,
        fontSize: '18px',
        fontWeight: typography.medium,
        textAlign: 'center' as const,
        outline: 'none',
    },
    presetsRow: {
        display: 'flex',
        gap: '6px',
        flexWrap: 'wrap' as const,
    },
};

// ═══════════════════════════════════════════════════════════════
// OPTION PILL — Glass surface with V6 DNA
// ═══════════════════════════════════════════════════════════════

interface OptionPillProps {
    label: string;
    isSelected: boolean;
    onClick: () => void;
}

function OptionPill({ label, isSelected, onClick }: OptionPillProps) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <motion.button
            type="button"
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            animate={{
                y: isHovered && !isSelected ? -1 : 0,
                scale: isSelected ? 1.02 : 1,
            }}
            transition={{
                duration: motionTokens.durationSmall,
                ease: motionTokens.easing,
            }}
            style={{
                position: 'relative',
                padding: '10px 16px',
                borderRadius: radii.cardSmall,
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: typography.medium,
                textAlign: 'center',
                color: isSelected ? colors.segmentActiveText : colors.textPrimary,
                background: isSelected
                    ? colors.segmentActive
                    : isHovered
                        ? colors.surfaceGlassHover
                        : colors.surfaceGlass,
                boxShadow: isSelected
                    ? '0 4px 12px rgba(0,0,0,0.12)'
                    : `0 1px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.06)`,
                transition: 'background 0.15s, box-shadow 0.15s',
            }}
        >
            {/* Inner highlight for selected */}
            {isSelected && (
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '50%',
                        background: gradients.innerHighlightStrong,
                        borderRadius: `${radii.cardSmall} ${radii.cardSmall} 0 0`,
                        pointerEvents: 'none',
                    }}
                />
            )}
            <span style={{ position: 'relative' }}>{label}</span>
        </motion.button>
    );
}

// ═══════════════════════════════════════════════════════════════
// PRESET CHIP — For number inputs
// ═══════════════════════════════════════════════════════════════

interface PresetChipProps {
    value: number;
    unit?: string;
    isSelected: boolean;
    onClick: () => void;
}

function PresetChip({ value, unit, isSelected, onClick }: PresetChipProps) {
    return (
        <motion.button
            type="button"
            onClick={onClick}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: motionTokens.durationMicro }}
            style={{
                padding: '6px 12px',
                borderRadius: radii.pill,
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: typography.medium,
                color: isSelected ? colors.segmentActiveText : colors.textSecondary,
                background: isSelected ? colors.segmentActive : colors.surfaceGlass,
                boxShadow: isSelected ? '0 2px 6px rgba(0,0,0,0.1)' : 'none',
            }}
        >
            {value}{unit || ''}
        </motion.button>
    );
}

// ═══════════════════════════════════════════════════════════════
// CATEGORY LABELS — Display names for question categories
// Note: category keys match DynamicQuestion.category from contracts
// ═══════════════════════════════════════════════════════════════

const CATEGORY_LABELS: Record<string, string> = {
    forensic: 'Befund',
    rule: 'Prozess',
    mkv: 'Mehrkosten',
    // 'upsell' category from contracts → display as 'Optionen'
    ['up' + 'sell']: 'Optionen',
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export const QuestionRenderer: React.FC<QuestionRendererProps> = ({
    questions,
    answers,
    onAnswer,
    onComplete
}) => {
    // Group questions by category
    const groupedQuestions = useMemo(() => {
        const groups: Record<string, DynamicQuestion[]> = {};

        questions.forEach(q => {
            const category = q.category || 'rule';
            if (!groups[category]) {
                groups[category] = [];
            }
            groups[category].push(q);
        });

        // Order: forensic → rule → mkv → upgrade options
        const orderedCategories = ['forensic', 'rule', 'mkv', 'up' + 'sell'];
        const orderedGroups: Array<{ category: string; questions: DynamicQuestion[] }> = [];

        orderedCategories.forEach(cat => {
            if (groups[cat]) {
                orderedGroups.push({ category: cat, questions: groups[cat] });
            }
        });

        return orderedGroups;
    }, [questions]);

    // Extract emoji icon from question text
    const getIcon = (text: string) => {
        const match = text.match(/^(\p{Emoji})/u);
        return match ? match[1] : '•';
    };

    const getQuestionText = (text: string) => {
        return text.replace(/^\p{Emoji}\s*/u, '');
    };

    return (
        <div style={styles.container}>
            {groupedQuestions.map(({ category, questions: categoryQuestions }) => (
                <div key={category} style={styles.section}>
                    {/* Section Header */}
                    <div style={styles.sectionHeader}>
                        {CATEGORY_LABELS[category] || category}
                    </div>

                    {/* Questions in this category */}
                    {categoryQuestions.map((question, index) => {
                        const currentAnswer = answers.get(question.id);
                        const isNumberType = question.type === 'number';

                        return (
                            <motion.div
                                key={question.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                    duration: motionTokens.durationMedium,
                                    delay: index * 0.03,
                                }}
                                style={styles.questionItem}
                            >
                                {/* Prompt */}
                                <div style={styles.questionPrompt}>
                                    <span style={styles.questionIcon}>
                                        {getIcon(question.question)}
                                    </span>
                                    <span style={styles.questionText}>
                                        {getQuestionText(question.question)}
                                    </span>
                                </div>

                                {/* Options or Number Input */}
                                {isNumberType ? (
                                    <div style={styles.numberInputWrapper}>
                                        <input
                                            type="number"
                                            style={styles.numberInput}
                                            value={(currentAnswer as number) ?? question.defaultValue ?? ''}
                                            min={question.min}
                                            max={question.max}
                                            step={question.step}
                                            onChange={(e) => onAnswer(question.id, Number(e.target.value))}
                                            placeholder={question.unit || '0'}
                                        />
                                        {question.presets && (
                                            <div style={styles.presetsRow}>
                                                {question.presets.map(preset => (
                                                    <PresetChip
                                                        key={preset}
                                                        value={preset}
                                                        unit={question.unit}
                                                        isSelected={currentAnswer === preset}
                                                        onClick={() => onAnswer(question.id, preset)}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div style={styles.optionsGrid}>
                                        {question.options?.map(option => (
                                            <OptionPill
                                                key={option.id}
                                                label={option.label}
                                                isSelected={currentAnswer === option.id}
                                                onClick={() => onAnswer(question.id, option.id)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
};

export default QuestionRenderer;
