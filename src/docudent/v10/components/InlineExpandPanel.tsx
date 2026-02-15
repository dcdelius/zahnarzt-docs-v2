import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import './InlineExpandPanel.css';

interface Item {
    id: string;
    label: string;
    enabled: boolean;
}

interface Props {
    /** Unique layout ID for morph animation */
    layoutId: string;
    /** Displayed count in collapsed state */
    countEnabled: number;
    /** Total count for display */
    countTotal: number;
    /** Whether panel is expanded */
    expanded: boolean;
    /** Toggle expand state */
    onToggle: () => void;
    /** Items to show in expanded list */
    items: Item[];
    /** Called when item toggled */
    onItemToggle: (id: string, enabled: boolean) => void;
    /** Enable all action */
    onEnableAll: () => void;
    /** Disable all action */
    onDisableAll: () => void;
}

export function InlineExpandPanel({
    layoutId,
    countEnabled,
    countTotal,
    expanded,
    onToggle,
    items,
    onItemToggle,
    onEnableAll,
    onDisableAll,
}: Props) {
    const panelRef = useRef<HTMLDivElement>(null);

    // ESC to collapse
    useEffect(() => {
        if (!expanded) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onToggle();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [expanded, onToggle]);

    return (
        <LayoutGroup id={layoutId}>
            <div className="v10-inline-expand" ref={panelRef}>
                {/* Trigger capsule */}
                <motion.button
                    layout
                    layoutId={`${layoutId}-trigger`}
                    type="button"
                    className={`v10-inline-expand-trigger ${expanded ? 'is-expanded' : ''}`}
                    onClick={onToggle}
                    aria-expanded={expanded}
                >
                    <motion.span layout="position" className="v10-inline-expand-count">
                        {countEnabled} von {countTotal}
                    </motion.span>
                    <motion.span
                        layout="position"
                        className="v10-inline-expand-chevron"
                        animate={{ rotate: expanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <ChevronDown size={16} />
                    </motion.span>
                </motion.button>

                {/* Expanded panel */}
                <AnimatePresence mode="wait">
                    {expanded && (
                        <motion.div
                            key="panel"
                            layoutId={`${layoutId}-panel`}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
                            className="v10-inline-expand-panel"
                        >
                            <div className="v10-inline-expand-list">
                                {items.map((item) => (
                                    <motion.button
                                        key={item.id}
                                        type="button"
                                        className={`v10-inline-expand-item ${item.enabled ? 'is-on' : 'is-off'}`}
                                        onClick={() => onItemToggle(item.id, !item.enabled)}
                                        whileTap={{ scale: 0.98 }}
                                        transition={{ duration: 0.1 }}
                                    >
                                        <span className="v10-inline-expand-label">{item.label}</span>
                                        <span className="v10-inline-expand-check">
                                            {item.enabled && <Check size={14} />}
                                        </span>
                                    </motion.button>
                                ))}
                            </div>

                            <div className="v10-inline-expand-footer">
                                <button
                                    type="button"
                                    className="v10-inline-expand-action"
                                    onClick={onEnableAll}
                                >
                                    Alle aktivieren
                                </button>
                                <button
                                    type="button"
                                    className="v10-inline-expand-action"
                                    onClick={onDisableAll}
                                >
                                    Alle deaktivieren
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </LayoutGroup>
    );
}
