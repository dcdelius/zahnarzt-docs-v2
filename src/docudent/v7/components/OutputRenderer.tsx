/**
 * V7 Output Renderer — PURE PRESENTATIONAL COMPONENT
 *
 * This component ONLY renders ComposedOutput from the backend.
 *
 * ❌ Does NOT modify sections
 * ❌ Does NOT filter billing codes
 * ❌ Does NOT add text
 *
 * ✅ Renders sections verbatim
 * ✅ Displays billing codes as provided
 * ✅ Shows warnings without interpretation
 */

import React from 'react';
import { motion } from 'framer-motion';
import type { ComposedOutput, ComposedSection, ValidationWarning } from '../pipeline/types';
import {
    colors,
    radii,
    shadows,
    motion as motionTokens,
} from '../styles/tokens';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface OutputRendererProps {
    output: ComposedOutput;
}

// ═══════════════════════════════════════════════════════════════
// EXTENDED COLORS (output-specific)
// ═══════════════════════════════════════════════════════════════

const outputColors = {
    greenAccent: '#4ADE80',
    amberAccent: '#FBBF24',
    redAccent: '#EF4444',
};

// ═══════════════════════════════════════════════════════════════
// STYLES — Enhanced materiality
// ═══════════════════════════════════════════════════════════════

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '24px',
        maxWidth: '720px',
    },
    label: {
        fontSize: '12px',
        fontWeight: 500,
        letterSpacing: '0.15em',
        color: colors.textMuted,
        textTransform: 'uppercase' as const,
        marginBottom: '16px',
    },
    headline: {
        fontSize: 'clamp(36px, 6vw, 64px)',
        fontWeight: 300,
        color: colors.textPrimary,
        letterSpacing: '-0.02em',
        lineHeight: 1.1,
        marginBottom: '32px',
    },
    sectionCard: {
        position: 'relative' as const,
        background: colors.surfaceGlass,
        borderRadius: radii.card,
        padding: '28px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(12px)',
        boxShadow: shadows.cardSoft,
    },
    sectionTitle: {
        fontSize: '12px',
        fontWeight: 600,
        color: colors.textMuted,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.1em',
        marginBottom: '12px',
    },
    sectionContent: {
        fontSize: '16px',
        fontWeight: 400,
        color: colors.textPrimary,
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap' as const,
    },
    codesContainer: {
        marginTop: '20px',
        display: 'flex',
        flexWrap: 'wrap' as const,
        gap: '10px',
    },
    codeTag: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        background: 'rgba(74, 222, 128, 0.15)',
        border: '1px solid rgba(74, 222, 128, 0.3)',
        borderRadius: '8px',
        padding: '8px 14px',
        fontSize: '13px',
        fontWeight: 500,
    },
    codeLabel: {
        color: outputColors.greenAccent,
        fontFamily: 'monospace',
    },
    warningCard: {
        background: 'rgba(251, 191, 36, 0.12)',
        border: '1px solid rgba(251, 191, 36, 0.3)',
        borderRadius: radii.cardSmall,
        padding: '16px 20px',
        fontSize: '14px',
        color: colors.textPrimary,
        boxShadow: shadows.cardSoft,
    },
    copyButton: {
        padding: '10px 20px',
        borderRadius: radii.pill,
        border: '1px solid rgba(255, 255, 255, 0.2)',
        background: 'rgba(255, 255, 255, 0.08)',
        color: colors.textPrimary,
        fontSize: '14px',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
    },
};

// ═══════════════════════════════════════════════════════════════
// ANIMATION VARIANTS
// ═══════════════════════════════════════════════════════════════

const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: {
            delay: i * 0.08,
            duration: 0.3,
            ease: motionTokens.easing,
        },
    }),
};

// ═══════════════════════════════════════════════════════════════
// SECTION COMPONENT
// ═══════════════════════════════════════════════════════════════

interface SectionCardProps {
    section: ComposedSection;
    index: number;
}

const SectionCard: React.FC<SectionCardProps> = ({ section, index }) => {
    return (
        <motion.div
            style={styles.sectionCard}
            custom={index}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
        >
            <div style={styles.sectionTitle}>{section.label}</div>
            <div style={styles.sectionContent}>{section.content}</div>
        </motion.div>
    );
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export const OutputRenderer: React.FC<OutputRendererProps> = ({ output }) => {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = async () => {
        const text = output.sections.map((s) => `${s.label}:\n${s.content}`).join('\n\n');
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div style={styles.container}>
            {/* Render sections verbatim */}
            {output.sections.map((section, index) => (
                <SectionCard key={section.id || `section-${index}`} section={section} index={index} />
            ))}

            {/* Billing codes — render as provided */}
            {output.billingCodes && output.billingCodes.length > 0 && (
                <motion.div
                    style={styles.sectionCard}
                    custom={output.sections.length}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                >
                    <div style={styles.sectionTitle}>Abrechnungsziffern</div>
                    <div style={styles.codesContainer}>
                        {output.billingCodes.map((code) => (
                            <div key={code} style={styles.codeTag}>
                                <span style={styles.codeLabel}>{code}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Render warnings VERBATIM - use properties, not object */}
            {output.warnings.length > 0 && (
                <div data-testid="warning-list">
                    {output.warnings.map((warning, index) => (
                        <motion.div
                            key={warning.id || index}
                            style={styles.warningCard}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 + index * 0.1 }}
                        >
                            ⚠️ <strong>{warning.title}</strong>: {warning.description}
                        </motion.div>
                    ))}
                </div>
            )}

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}
            >
                <button style={styles.copyButton} onClick={handleCopy} data-testid="copy-button">
                    {copied ? '✓ Kopiert' : '📋 Kopieren'}
                </button>
            </motion.div>
        </div>
    );
};

export default OutputRenderer;
