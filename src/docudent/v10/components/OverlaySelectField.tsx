/**
 * OverlaySelectField — Jeton Solid Sheet Style
 * =============================================
 * 
 * AUDIT NOTES:
 * - Reflow: NO (uses Radix Popover Portal)
 * - Portal: YES (content renders outside DOM hierarchy)
 * - Motion: 280ms open, 220ms close (height reveal)
 * - Style: SOLID OPAQUE (no transparency, no blur)
 * - Direction: Dropdown (opens DOWN by default)
 * 
 * Replaces DockSelectField for all "pick one option" controls.
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Search } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import './OverlaySelectField.css';

interface Option {
    id: string;
    label: string;
}

interface Props {
    /** Field label shown in row */
    label: string;
    /** Helper text below label */
    helper?: string;
    /** Current selected value (for display) */
    value: string;
    /** Available options */
    options: Option[];
    /** Currently selected option ID */
    selectedId: string;
    /** Selection callback */
    onSelect: (id: string) => void;
    /** Force searchable (auto-enabled if options > 8) */
    searchable?: boolean;
    /** Disabled state */
    disabled?: boolean;
}

const SEARCH_THRESHOLD = 8;

// Motion config: height-based reveal for one-body effect
const panelMotion = {
    initial: { height: 0, opacity: 0 },
    animate: {
        height: 'auto',
        opacity: 1,
        transition: {
            height: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
            opacity: { duration: 0.15, ease: 'easeOut' },
        }
    },
    exit: {
        height: 0,
        opacity: 0,
        transition: {
            height: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
            opacity: { duration: 0.12, ease: 'easeIn' },
        }
    },
};

export function OverlaySelectField({
    label,
    helper,
    value,
    options,
    selectedId,
    onSelect,
    searchable,
    disabled = false,
}: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-enable search for long lists
    const showSearch = searchable ?? options.length > SEARCH_THRESHOLD;

    // Filter options by query
    const filteredOptions = useMemo(() => {
        if (!query.trim()) return options;
        const q = query.toLowerCase();
        return options.filter(opt => opt.label.toLowerCase().includes(q));
    }, [options, query]);

    // Focus search input when opening
    useEffect(() => {
        if (isOpen && showSearch && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 60);
        }
    }, [isOpen, showSearch]);

    // Clear query when closing
    useEffect(() => {
        if (!isOpen) setQuery('');
    }, [isOpen]);

    const handleSelect = (id: string) => {
        onSelect(id);
        setIsOpen(false);
    };

    return (
        <div className="overlay-select-row">
            {/* Label column */}
            <div className="overlay-select-label-col">
                <div className="overlay-select-label">{label}</div>
                {helper && <div className="overlay-select-helper">{helper}</div>}
            </div>

            {/* Control column */}
            <div className="overlay-select-control-col">
                <Popover open={isOpen} onOpenChange={setIsOpen}>
                    <PopoverTrigger asChild>
                        <button
                            type="button"
                            className="overlay-select-trigger"
                            disabled={disabled}
                            data-state={isOpen ? 'open' : 'closed'}
                        >
                            <span className="overlay-select-value">
                                {value || 'Auswählen...'}
                            </span>
                            <span className="overlay-select-chevron">
                                <ChevronDown size={14} />
                            </span>
                        </button>
                    </PopoverTrigger>

                    <PopoverContent
                        align="start"
                        sideOffset={0}
                        className="overlay-select-panel-wrapper"
                        style={{ padding: 0, background: 'transparent', border: 'none', boxShadow: 'none' }}
                    >
                        <AnimatePresence mode="wait">
                            {isOpen && (
                                <motion.div
                                    key="panel"
                                    className="overlay-select-panel"
                                    {...panelMotion}
                                >
                                    {/* Search input */}
                                    {showSearch && (
                                        <div className="overlay-select-search">
                                            <Search size={14} className="overlay-select-search-icon" />
                                            <input
                                                ref={inputRef}
                                                type="text"
                                                value={query}
                                                onChange={e => setQuery(e.target.value)}
                                                placeholder="Suchen..."
                                                className="overlay-select-search-input"
                                            />
                                        </div>
                                    )}

                                    {/* Options list */}
                                    <ScrollArea className="overlay-select-list">
                                        {filteredOptions.length === 0 ? (
                                            <div className="overlay-select-empty">
                                                Keine Ergebnisse
                                            </div>
                                        ) : (
                                            filteredOptions.map(opt => (
                                                <button
                                                    key={opt.id}
                                                    type="button"
                                                    className={`overlay-select-option ${opt.id === selectedId ? 'is-selected' : ''}`}
                                                    onClick={() => handleSelect(opt.id)}
                                                >
                                                    <span className="overlay-select-option-label">
                                                        {opt.label}
                                                    </span>
                                                    {opt.id === selectedId && (
                                                        <Check size={14} className="overlay-select-option-check" />
                                                    )}
                                                </button>
                                            ))
                                        )}
                                    </ScrollArea>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    );
}
