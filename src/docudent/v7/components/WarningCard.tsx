/**
 * V7 Warning Card — PURE PRESENTATIONAL COMPONENT
 * 
 * Renders ValidationWarning OBJECTS, not strings.
 * 
 * ❌ Does NOT interpret warning type
 * ❌ Does NOT filter warnings
 * ❌ Does NOT generate text
 * 
 * ✅ Renders title, description, affectedCodes verbatim
 */

import React from 'react';
import { motion } from 'framer-motion';
import type { ValidationWarning } from '../pipeline/types';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface WarningCardProps {
    warning: ValidationWarning;
    index: number;
}

// ═══════════════════════════════════════════════════════════════
// STYLES (from V6 design)
// ═══════════════════════════════════════════════════════════════

const getWarningStyles = (type: ValidationWarning['type']) => {
    const baseStyles = {
        borderRadius: '12px',
        padding: '1rem 1.25rem',
        marginBottom: '0.75rem',
        border: '1px solid'
    };

    switch (type) {
        case 'regress':
            return {
                ...baseStyles,
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(185, 28, 28, 0.08))',
                borderColor: 'rgba(239, 68, 68, 0.4)'
            };
        case 'warning':
            return {
                ...baseStyles,
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.08))',
                borderColor: 'rgba(245, 158, 11, 0.4)'
            };
        case 'info':
        default:
            return {
                ...baseStyles,
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(37, 99, 235, 0.08))',
                borderColor: 'rgba(59, 130, 246, 0.4)'
            };
    }
};

const getIconForType = (type: ValidationWarning['type']) => {
    switch (type) {
        case 'regress': return '🚨';
        case 'warning': return '⚠️';
        case 'info': return 'ℹ️';
        default: return '⚠️';
    }
};

const styles = {
    header: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '0.5rem'
    },
    title: {
        fontSize: '0.9375rem',
        fontWeight: 600,
        color: '#fff'
    },
    description: {
        fontSize: '0.875rem',
        color: 'rgba(255, 255, 255, 0.75)',
        lineHeight: 1.5
    },
    codes: {
        marginTop: '0.5rem',
        fontSize: '0.8125rem',
        color: 'rgba(255, 255, 255, 0.5)',
        fontFamily: 'monospace'
    }
};

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export const WarningCard: React.FC<WarningCardProps> = ({ warning, index }) => {
    return (
        <motion.div
            style={getWarningStyles(warning.type)}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1, duration: 0.2 }}
        >
            <div style={styles.header}>
                <span>{getIconForType(warning.type)}</span>
                <span style={styles.title}>{warning.title}</span>
            </div>

            <div style={styles.description}>
                {warning.description}
            </div>

            {warning.affectedCodes && warning.affectedCodes.length > 0 && (
                <div style={styles.codes}>
                    Betrifft: {warning.affectedCodes.join(', ')}
                </div>
            )}
        </motion.div>
    );
};

export default WarningCard;
