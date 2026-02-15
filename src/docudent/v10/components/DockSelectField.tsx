import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { ChevronDown, Check, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import './DockSelectField.css';

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

export function DockSelectField({
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
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Auto-enable search for long lists
    const showSearch = searchable ?? options.length > SEARCH_THRESHOLD;

    // Filter options by query
    const filteredOptions = useMemo(() => {
        if (!query.trim()) return options;
        const q = query.toLowerCase();
        return options.filter(opt => opt.label.toLowerCase().includes(q));
    }, [options, query]);

    // Unique layout ID for morph
    const layoutId = useMemo(() => `dock-select-${label.replace(/\s+/g, '-').toLowerCase()}`, [label]);

    // Focus search input when opening
    useEffect(() => {
        if (isOpen && showSearch && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen, showSearch]);

    // Clear query when closing
    useEffect(() => {
        if (!isOpen) setQuery('');
    }, [isOpen]);

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return;
        const handleClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [isOpen]);

    // Close on ESC
    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isOpen]);

    // Hover handlers with delay
    const handlePointerEnter = () => {
        if (disabled) return;
        if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        }
        setIsOpen(true);
    };

    const handlePointerLeave = () => {
        closeTimeoutRef.current = setTimeout(() => {
            setIsOpen(false);
        }, 160);
    };

    const handleSelect = (id: string) => {
        onSelect(id);
        setIsOpen(false);
    };

    return (
        <div className="dock-select-row">
            {/* Label column */}
            <div className="dock-select-label-col">
                <div className="dock-select-label">{label}</div>
                {helper && <div className="dock-select-helper">{helper}</div>}
            </div>

            {/* Control column */}
            <div
                ref={containerRef}
                className="dock-select-control-col"
                onPointerEnter={handlePointerEnter}
                onPointerLeave={handlePointerLeave}
            >
                <LayoutGroup id={layoutId}>
                    {/* Trigger pill */}
                    <motion.button
                        layout
                        layoutId={`${layoutId}-surface`}
                        type="button"
                        className={`dock-select-trigger ${isOpen ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''}`}
                        onClick={() => !disabled && setIsOpen(!isOpen)}
                        disabled={disabled}
                    >
                        <motion.span layout="position" className="dock-select-value">
                            {value || 'Auswählen...'}
                        </motion.span>
                        <motion.span
                            layout="position"
                            className="dock-select-chevron"
                            animate={{ rotate: isOpen ? 180 : 0 }}
                            transition={{ duration: 0.18 }}
                        >
                            <ChevronDown size={14} />
                        </motion.span>
                    </motion.button>

                    {/* Drop-up panel */}
                    <AnimatePresence>
                        {isOpen && (
                            <motion.div
                                key="panel"
                                layoutId={`${layoutId}-surface`}
                                className="dock-select-panel"
                                initial={{ opacity: 0, scaleY: 0.92, y: 8 }}
                                animate={{ opacity: 1, scaleY: 1, y: 0 }}
                                exit={{ opacity: 0, scaleY: 0.95, y: 4 }}
                                transition={{
                                    duration: 0.22,
                                    ease: [0.32, 0.72, 0, 1],
                                }}
                                style={{ originY: 1 }}
                            >
                                {/* Panel header */}
                                <div className="dock-select-panel-header">
                                    <span className="dock-select-panel-title">{value || 'Auswählen'}</span>
                                    <button
                                        type="button"
                                        className="dock-select-panel-close"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <ChevronDown size={14} style={{ transform: 'rotate(180deg)' }} />
                                    </button>
                                </div>

                                {/* Search input */}
                                {showSearch && (
                                    <div className="dock-select-search">
                                        <Search size={14} className="dock-select-search-icon" />
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={query}
                                            onChange={e => setQuery(e.target.value)}
                                            placeholder="Suchen..."
                                            className="dock-select-search-input"
                                        />
                                    </div>
                                )}

                                {/* Options list */}
                                <ScrollArea className="dock-select-list">
                                    {filteredOptions.length === 0 ? (
                                        <div className="dock-select-empty">Keine Ergebnisse</div>
                                    ) : (
                                        filteredOptions.map(opt => (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                className={`dock-select-option ${opt.id === selectedId ? 'is-selected' : ''}`}
                                                onClick={() => handleSelect(opt.id)}
                                            >
                                                <span className="dock-select-option-label">{opt.label}</span>
                                                {opt.id === selectedId && (
                                                    <Check size={14} className="dock-select-option-check" />
                                                )}
                                            </button>
                                        ))
                                    )}
                                </ScrollArea>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </LayoutGroup>
            </div>
        </div>
    );
}
