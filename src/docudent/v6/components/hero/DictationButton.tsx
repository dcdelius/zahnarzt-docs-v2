/**
 * DictationButton — 3-State Recording Button
 * 
 * States: idle | recording | processing
 * Typography-first, Jeton-style with coral animations.
 */

import React from 'react';
import { motion } from 'framer-motion';
import type { DictationState } from '../../hooks/useDocudentV6';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface DictationButtonProps {
    state: DictationState;
    onClick: () => void;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function DictationButton({ state, onClick }: DictationButtonProps) {
    const isDisabled = state === 'processing';

    const getLabel = () => {
        switch (state) {
            case 'idle': return 'Diktat starten';
            case 'recording': return '● Aufnahme...';
            case 'processing': return 'Verarbeiten...';
        }
    };

    const getBackground = () => {
        switch (state) {
            case 'idle': return 'rgba(255,255,255,0.08)';
            case 'recording': return 'linear-gradient(135deg, #FF6B4A 0%, #F87A7A 100%)';
            case 'processing': return 'linear-gradient(90deg, #FF6B4A 0%, #FFB199 50%, #FF6B4A 100%)';
        }
    };

    return (
        <motion.button
            onClick={onClick}
            disabled={isDisabled}
            whileHover={!isDisabled ? { scale: 1.02 } : {}}
            whileTap={!isDisabled ? { scale: 0.98 } : {}}
            className="relative overflow-hidden"
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '16px 28px',
                borderRadius: '999px',
                fontSize: '16px',
                fontWeight: 500,
                border: 'none',
                cursor: isDisabled ? 'wait' : 'pointer',
                background: getBackground(),
                backgroundSize: state === 'processing' ? '200% 100%' : '100% 100%',
                color: '#FFFFFF',
                boxShadow: '0 6px 16px -8px rgba(0,0,0,0.35)',
                animation: state === 'processing' ? 'shimmer 1.5s infinite linear' : 'none',
            }}
        >
            {/* Recording pulse overlay */}
            {state === 'recording' && (
                <motion.div
                    className="absolute inset-0"
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                    style={{
                        background: 'linear-gradient(135deg, #FF6B4A 0%, #F87A7A 100%)',
                        borderRadius: '999px',
                    }}
                />
            )}

            <span className="relative z-10">{getLabel()}</span>

            <style>{`
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
            `}</style>
        </motion.button>
    );
}

export default DictationButton;
