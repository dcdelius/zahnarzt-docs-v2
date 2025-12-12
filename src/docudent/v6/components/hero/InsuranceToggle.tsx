/**
 * InsuranceToggle — Simple GKV / PKV Pills
 * 
 * Just the two pills for quick toggle.
 * The InsuranceMorphPill handles detail selection.
 */

import React from 'react';
import { motion } from 'framer-motion';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type InsuranceType = 'GKV' | 'PKV';

interface InsuranceToggleProps {
    insuranceType: InsuranceType;
    hasMKV: boolean;
    onInsuranceChange: (type: InsuranceType) => void;
    onMKVChange: (hasMKV: boolean) => void;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function InsuranceToggle({
    insuranceType,
    hasMKV,
    onInsuranceChange,
    onMKVChange,
}: InsuranceToggleProps) {
    const isGKV = insuranceType === 'GKV';
    const isPKV = insuranceType === 'PKV';

    // ─── Handlers ───
    const handleGKVClick = () => {
        onInsuranceChange('GKV');
        // Don't change MKV flag
    };

    const handlePKVClick = () => {
        onInsuranceChange('PKV');
        onMKVChange(false);
    };

    // ─── Pill Styles ───
    const pillBase: React.CSSProperties = {
        height: 32,
        borderRadius: 999,
        padding: '0 18px',
        fontSize: 13,
        fontWeight: 500,
        letterSpacing: '0.04em',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        border: 'none',
        cursor: 'pointer',
        transition: 'background 0.18s ease-out, color 0.18s ease-out, transform 0.12s ease-out, box-shadow 0.18s ease-out',
    };

    const getGKVStyle = (): React.CSSProperties => {
        if (!isGKV) {
            return { ...pillBase, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.80)' };
        }
        if (hasMKV) {
            return { ...pillBase, background: 'linear-gradient(135deg, #FF6B4A, #FFB199)', color: '#FFFFFF' };
        }
        return { ...pillBase, background: 'rgba(255,255,255,0.18)', color: '#FFFFFF' };
    };

    const getPKVStyle = (): React.CSSProperties => {
        if (!isPKV) {
            return { ...pillBase, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.80)' };
        }
        return { ...pillBase, background: 'linear-gradient(135deg, #FFB199, #FFD8B5)', color: '#FFFFFF' };
    };

    return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <motion.button
                onClick={handleGKVClick}
                whileHover={{ y: -1, boxShadow: '0 8px 18px rgba(0,0,0,0.18)' }}
                style={getGKVStyle()}
            >
                GKV
                {isGKV && hasMKV && (
                    <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: '#FFFFFF', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 8px rgba(255,107,74,0.75)',
                    }}>
                        <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#FF6B4A' }} />
                    </span>
                )}
            </motion.button>

            <motion.button
                onClick={handlePKVClick}
                whileHover={{ y: -1, boxShadow: '0 8px 18px rgba(0,0,0,0.18)' }}
                style={getPKVStyle()}
            >
                PKV
            </motion.button>
        </div>
    );
}

export default InsuranceToggle;
