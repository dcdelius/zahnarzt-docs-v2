/**
 * EditableSummaryChip — Clickable chip with dropdown selection
 * 
 * V6-style glass pill that opens a dropdown for editing settings.
 * Uses settingsRegistry for SSOT-safe option loading.
 * 
 * Props:
 * - label: Display label (e.g., "Trockenlegung")
 * - groupKey: Key into settingsRegistry (e.g., "trockenlegung")
 * - currentOptionId: Currently selected option ID
 * - options: Array of SettingOptionDef from registry
 * - onSelect: Callback when user selects an option
 * - source: Where the current value came from ('default' | 'manual')
 * - testId: data-testid for E2E testing
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    colors,
    radii,
    typography,
    motion as motionTokens,
} from '../styles/tokens';
import type { SettingOptionUI } from '../settings/settingOptions';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

type ChipSource = 'default' | 'manual';

interface EditableSummaryChipProps {
    label: string;
    groupKey: string;
    currentOptionId: string;
    options: SettingOptionUI[];
    onSelect: (optionId: string) => void;
    source: ChipSource;
    testId: string;
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

const styles = {
    wrapper: {
        position: 'relative' as const,
        display: 'inline-block',
    },
    chip: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 14px',
        borderRadius: radii.pill,
        background: 'rgba(255, 255, 255, 0.12)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        fontSize: '13px',
        fontWeight: typography.medium,
        color: colors.textPrimary,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
    },
    chipHover: {
        background: 'rgba(255, 255, 255, 0.18)',
        borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    chipLabel: {
        color: colors.textSecondary,
        fontWeight: typography.regular,
    },
    chipValue: {
        fontWeight: typography.semibold,
    },
    chipSource: {
        fontSize: '10px',
        fontWeight: typography.regular,
        marginLeft: '4px',
        opacity: 0.8,
    },
    chipSourceDefault: {
        color: 'rgba(100, 200, 150, 0.9)',
    },
    chipSourceManual: {
        color: 'rgba(150, 180, 255, 0.9)',
    },
    editIcon: {
        marginLeft: '4px',
        opacity: 0.6,
        fontSize: '11px',
    },
    dropdown: {
        position: 'absolute' as const,
        top: 'calc(100% + 8px)',
        left: '0',
        minWidth: '180px',
        background: 'rgba(30, 30, 35, 0.98)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: radii.medium,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        overflow: 'hidden',
        zIndex: 1000,
    },
    dropdownItem: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        fontSize: '14px',
        color: colors.textPrimary,
        cursor: 'pointer',
        transition: 'background 0.1s ease',
    },
    dropdownItemHover: {
        background: 'rgba(255, 255, 255, 0.08)',
    },
    dropdownItemSelected: {
        background: 'rgba(100, 180, 255, 0.15)',
    },
    checkmark: {
        color: colors.accent,
        fontWeight: typography.bold,
    },
};

const SOURCE_LABELS: Record<ChipSource, string> = {
    default: '(Praxis-Standard)',
    manual: '(Geändert)',
};

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function EditableSummaryChip({
    label,
    groupKey,
    currentOptionId,
    options,
    onSelect,
    source,
    testId,
}: EditableSummaryChipProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [hoveredOptionId, setHoveredOptionId] = useState<string | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Get current option label
    const currentOption = options.find(o => o.id === currentOptionId);
    const displayValue = currentOption?.label ?? currentOptionId;

    // Filter out 'fragen' option - it's for settings UI, not inline editing
    const selectableOptions = options.filter(o => o.id !== 'fragen');

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    // Close on Escape
    useEffect(() => {
        function handleEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            return () => document.removeEventListener('keydown', handleEscape);
        }
    }, [isOpen]);

    const handleSelect = (optionId: string) => {
        onSelect(optionId);
        setIsOpen(false);
    };

    return (
        <div ref={wrapperRef} style={styles.wrapper}>
            {/* Chip Button */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: motionTokens.durationSmall }}
                style={{
                    ...styles.chip,
                    ...(isHovered || isOpen ? styles.chipHover : {}),
                }}
                onClick={() => setIsOpen(!isOpen)}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                data-testid={testId}
                role="button"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <span style={styles.chipLabel}>{label}</span>
                <span style={styles.chipValue}>{displayValue}</span>
                <span
                    style={{
                        ...styles.chipSource,
                        ...(source === 'default' ? styles.chipSourceDefault : styles.chipSourceManual),
                    }}
                >
                    {SOURCE_LABELS[source]}
                </span>
                <span style={styles.editIcon}>▼</span>
            </motion.div>

            {/* Dropdown */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        transition={{ duration: 0.15 }}
                        style={styles.dropdown}
                        data-testid={`${testId}-dropdown`}
                        role="listbox"
                    >
                        {selectableOptions.map((option) => (
                            <div
                                key={option.id}
                                style={{
                                    ...styles.dropdownItem,
                                    ...(hoveredOptionId === option.id ? styles.dropdownItemHover : {}),
                                    ...(option.id === currentOptionId ? styles.dropdownItemSelected : {}),
                                }}
                                onClick={() => handleSelect(option.id)}
                                onMouseEnter={() => setHoveredOptionId(option.id)}
                                onMouseLeave={() => setHoveredOptionId(null)}
                                data-testid={`${testId}-option-${option.id}`}
                                role="option"
                                aria-selected={option.id === currentOptionId}
                            >
                                <span>{option.label}</span>
                                {option.id === currentOptionId && (
                                    <span style={styles.checkmark}>✓</span>
                                )}
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default EditableSummaryChip;
