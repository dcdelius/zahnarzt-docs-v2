import React from 'react';
import { motion } from 'framer-motion';
import './ChipDefaultsSummaryCapsule.css';

interface Props {
    countEnabled: number;
    onOpen: () => void;
    shortcutHint?: string;
    disabled?: boolean;
}

export function ChipDefaultsSummaryCapsule({
    countEnabled,
    onOpen,
    shortcutHint = '⌘K',
    disabled = false,
}: Props) {
    return (
        <button
            type="button"
            className="chip-defaults-summary"
            onClick={onOpen}
            disabled={disabled}
            aria-label="Standard-Textbausteine bearbeiten"
        >
            <motion.span
                key={countEnabled}
                initial={{ scale: 1.02 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.12 }}
                className="chip-defaults-summary-text"
            >
                {countEnabled} aktiv <span className="chip-defaults-summary-sep">·</span> Bearbeiten
            </motion.span>
            <span className="chip-defaults-summary-hint">{shortcutHint}</span>
        </button>
    );
}
