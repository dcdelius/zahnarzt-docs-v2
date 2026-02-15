/**
 * OverlayMultiSelectField — Jeton Multi-Select (same pattern as OverlaySelectField)
 * ==================================================================================
 * 
 * - Uses Radix Popover Portal (no layout shift)
 * - Height-reveal animation (280ms open, 220ms close)
 * - Multiple selection with checkmarks
 * - Enable all / Disable all actions
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import './OverlayMultiSelectField.css';

interface Item {
    id: string;
    label: string;
    enabled: boolean;
}

interface Props {
    /** Field label shown in row */
    label: string;
    /** Helper text below label */
    helper?: string;
    /** Items with toggle state */
    items: Item[];
    /** Toggle item callback */
    onItemToggle: (id: string, enabled: boolean) => void;
    /** Enable all items */
    onEnableAll: () => void;
    /** Disable all items */
    onDisableAll: () => void;
    /** Disabled state */
    disabled?: boolean;
}

// Motion config: same as OverlaySelectField
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

export function OverlayMultiSelectField({
    label,
    helper,
    items,
    onItemToggle,
    onEnableAll,
    onDisableAll,
    disabled = false,
}: Props) {
    const [isOpen, setIsOpen] = useState(false);

    const countEnabled = useMemo(() => items.filter(i => i.enabled).length, [items]);
    const countTotal = items.length;

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
                                {countEnabled} von {countTotal}
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
                                    className="overlay-select-panel overlay-multi-panel"
                                    {...panelMotion}
                                >
                                    {/* Items list */}
                                    <ScrollArea className="overlay-select-list">
                                        {items.map(item => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                className={`overlay-select-option ${item.enabled ? 'is-selected' : ''}`}
                                                onClick={() => onItemToggle(item.id, !item.enabled)}
                                            >
                                                <span className="overlay-select-option-label">
                                                    {item.label}
                                                </span>
                                                {item.enabled && (
                                                    <Check size={14} className="overlay-select-option-check" />
                                                )}
                                            </button>
                                        ))}
                                    </ScrollArea>

                                    {/* Footer actions */}
                                    <div className="overlay-multi-footer">
                                        <button
                                            type="button"
                                            className="overlay-multi-action"
                                            onClick={onEnableAll}
                                        >
                                            Alle aktivieren
                                        </button>
                                        <button
                                            type="button"
                                            className="overlay-multi-action"
                                            onClick={onDisableAll}
                                        >
                                            Alle deaktivieren
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    );
}
