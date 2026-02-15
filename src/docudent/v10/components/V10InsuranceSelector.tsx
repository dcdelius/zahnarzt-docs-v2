/**
 * V10 InsuranceSelector — Copied from V8 (Jeton Dock Style)
 */

import React from 'react';
import { motion } from 'framer-motion';

type InsuranceMode = 'gkv' | 'gkv-mkv' | 'pkv';

interface V10InsuranceSelectorProps {
    insuranceType: 'GKV' | 'PKV';
    hasMKV: boolean;
    onInsuranceChange: (type: 'GKV' | 'PKV') => void;
    onMKVChange: (hasMKV: boolean) => void;
    'data-testid'?: string;
}

const MODES: { id: InsuranceMode; label: string }[] = [
    { id: 'gkv', label: 'GKV' },
    { id: 'gkv-mkv', label: '+MKV' },
    { id: 'pkv', label: 'PKV' },
];

export function V10InsuranceSelector({
    insuranceType,
    hasMKV,
    onInsuranceChange,
    onMKVChange,
    'data-testid': testId,
}: V10InsuranceSelectorProps) {

    const currentMode: InsuranceMode = insuranceType === 'PKV'
        ? 'pkv'
        : hasMKV
            ? 'gkv-mkv'
            : 'gkv';

    const handleModeClick = (id: InsuranceMode) => {
        if (id === 'gkv') {
            onInsuranceChange('GKV');
            onMKVChange(false);
        } else if (id === 'gkv-mkv') {
            onInsuranceChange('GKV');
            onMKVChange(true);
        } else {
            onInsuranceChange('PKV');
            onMKVChange(false);
        }
    };

    return (
        <div data-testid={testId} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
        }}>
            <span style={{
                fontSize: '10px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.6)',
                fontWeight: 600
            }}>
                Versicherung
            </span>

            <div style={{
                display: 'flex',
                gap: '2px',
                padding: '4px',
                borderRadius: '999px',
                background: 'linear-gradient(135deg, #FF6B6B, #FF8E53)',
                boxShadow: '0 4px 12px rgba(255, 107, 107, 0.25)'
            }}>
                {MODES.map(mode => {
                    const isActive = currentMode === mode.id;
                    return (
                        <motion.button
                            key={mode.id}
                            type="button"
                            onClick={() => handleModeClick(mode.id)}
                            animate={{
                                background: isActive ? '#FFFFFF' : 'transparent',
                                color: isActive ? '#FF6B6B' : '#FFFFFF',
                            }}
                            transition={{ duration: 0.2 }}
                            style={{
                                padding: '6px 16px',
                                borderRadius: '999px',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: 700,
                                fontFamily: 'inherit',
                                position: 'relative'
                            }}
                        >
                            {mode.label}
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
}
