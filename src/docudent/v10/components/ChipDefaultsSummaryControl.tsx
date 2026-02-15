import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Command,
    CommandInput,
    CommandList,
    CommandEmpty,
    CommandItem,
    CommandSeparator,
} from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import './ChipDefaultsSummaryControl.css';

export interface ChipItem {
    id: string;
    label: string;
    enabled: boolean;
}

interface ChipDefaultsSummaryControlProps {
    items: ChipItem[];
    onToggle: (id: string, enabled: boolean) => void;
    onEnableAll: () => void;
    onDisableAll: () => void;
}

export function ChipDefaultsSummaryControl({
    items,
    onToggle,
    onEnableAll,
    onDisableAll,
}: ChipDefaultsSummaryControlProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');

    const enabledCount = useMemo(() => items.filter(i => i.enabled).length, [items]);

    const filteredItems = useMemo(() => {
        if (!search) return items;
        const lower = search.toLowerCase();
        return items.filter(i => i.label.toLowerCase().includes(lower));
    }, [items, search]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className="chip-summary-trigger"
                    aria-label="Standard-Textbausteine bearbeiten"
                >
                    <motion.span
                        key={enabledCount}
                        initial={{ scale: 1.05 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.12 }}
                        className="chip-summary-count"
                    >
                        {enabledCount} aktiv
                    </motion.span>
                    <span className="chip-summary-edit">
                        Bearbeiten
                        <ChevronDown className="chip-summary-chevron" />
                    </span>
                </button>
            </PopoverTrigger>

            <PopoverContent
                align="end"
                sideOffset={8}
                className="chip-popover"
            >
                <div className="chip-popover-header">
                    <h3 className="chip-popover-title">Standard-Textbausteine</h3>
                    <p className="chip-popover-subtitle">
                        Werden im Control Center automatisch vorgeschlagen.
                    </p>
                </div>

                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder="Suchen..."
                        value={search}
                        onValueChange={setSearch}
                    />
                    <CommandList>
                        <ScrollArea className="chip-popover-scroll">
                            <CommandEmpty>Keine Treffer</CommandEmpty>
                            <AnimatePresence mode="popLayout">
                                {filteredItems.map((item) => (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 4 }}
                                        transition={{ duration: 0.12 }}
                                    >
                                        <CommandItem
                                            value={item.id}
                                            onSelect={() => onToggle(item.id, !item.enabled)}
                                            className="chip-toggle-item"
                                        >
                                            <span className="chip-toggle-label">{item.label}</span>
                                            <motion.div
                                                className={`chip-toggle-switch ${item.enabled ? 'chip-toggle-on' : 'chip-toggle-off'}`}
                                                animate={{ backgroundColor: item.enabled ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.08)' }}
                                                transition={{ duration: 0.12 }}
                                            >
                                                <AnimatePresence mode="wait">
                                                    {item.enabled && (
                                                        <motion.div
                                                            initial={{ scale: 0.8, opacity: 0 }}
                                                            animate={{ scale: 1, opacity: 1 }}
                                                            exit={{ scale: 0.8, opacity: 0 }}
                                                            transition={{ duration: 0.1 }}
                                                        >
                                                            <Check className="chip-toggle-check" />
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                                <span className="chip-toggle-text">
                                                    {item.enabled ? 'An' : 'Aus'}
                                                </span>
                                            </motion.div>
                                        </CommandItem>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </ScrollArea>
                    </CommandList>

                    <CommandSeparator />

                    <div className="chip-popover-actions">
                        <button
                            type="button"
                            className="chip-action-btn"
                            onClick={onEnableAll}
                        >
                            Alle aktivieren
                        </button>
                        <button
                            type="button"
                            className="chip-action-btn"
                            onClick={onDisableAll}
                        >
                            Alle deaktivieren
                        </button>
                    </div>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
