import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    Command,
    CommandInput,
    CommandList,
    CommandEmpty,
    CommandItem,
} from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import './ChipDefaultsSpotlightDialog.css';

interface Item {
    id: string;
    label: string;
    enabled: boolean;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    items: Item[];
    onToggle: (id: string, enabled: boolean) => void;
    onEnableAll: () => void;
    onDisableAll: () => void;
}

export function ChipDefaultsSpotlightDialog({
    open,
    onOpenChange,
    items,
    onToggle,
    onEnableAll,
    onDisableAll,
}: Props) {
    const [search, setSearch] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open) {
            setSearch('');
            requestAnimationFrame(() => inputRef.current?.focus());
        }
    }, [open]);

    const filteredItems = useMemo(() => {
        if (!search.trim()) return items;
        const lower = search.toLowerCase();
        return items.filter(item => item.label.toLowerCase().includes(lower));
    }, [items, search]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="chip-defaults-dialog">
                <AnimatePresence mode="wait">
                    {open ? (
                        <motion.div
                            key="chip-defaults-dialog"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                        >
                            <DialogHeader className="chip-defaults-header">
                                <DialogTitle>Standard-Textbausteine</DialogTitle>
                                <DialogDescription>
                                    Werden im Control Center automatisch vorgeschlagen.
                                </DialogDescription>
                            </DialogHeader>

                            <Command shouldFilter={false} className="chip-defaults-command">
                                <CommandInput
                                    ref={inputRef}
                                    placeholder="Suchen…"
                                    value={search}
                                    onValueChange={setSearch}
                                />
                                <ScrollArea className="chip-defaults-scroll">
                                    <CommandList>
                                        <CommandEmpty>Keine Treffer</CommandEmpty>
                                        {filteredItems.map(item => (
                                            <motion.div
                                                key={item.id}
                                                initial={{ opacity: 0, y: -4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 4 }}
                                                transition={{ duration: 0.14 }}
                                            >
                                                <CommandItem
                                                    value={item.id}
                                                    onSelect={() => onToggle(item.id, !item.enabled)}
                                                    className={`chip-defaults-item ${item.enabled ? 'is-on' : 'is-off'}`}
                                                >
                                                    <span className="chip-defaults-item-label">{item.label}</span>
                                                    <motion.span
                                                        className="chip-defaults-item-state"
                                                        animate={{ opacity: item.enabled ? 1 : 0.7 }}
                                                        transition={{ duration: 0.12 }}
                                                    >
                                                        {item.enabled ? 'An' : 'Aus'}
                                                    </motion.span>
                                                </CommandItem>
                                            </motion.div>
                                        ))}
                                    </CommandList>
                                </ScrollArea>

                                <Separator className="chip-defaults-separator" />

                                <div className="chip-defaults-footer">
                                    <div className="chip-defaults-footer-actions">
                                        <button
                                            type="button"
                                            className="chip-defaults-footer-btn"
                                            onClick={onEnableAll}
                                        >
                                            Alle aktivieren
                                        </button>
                                        <button
                                            type="button"
                                            className="chip-defaults-footer-btn"
                                            onClick={onDisableAll}
                                        >
                                            Alle deaktivieren
                                        </button>
                                    </div>
                                    <button
                                        type="button"
                                        className="chip-defaults-footer-done"
                                        onClick={() => onOpenChange(false)}
                                    >
                                        Fertig
                                    </button>
                                </div>
                            </Command>
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </DialogContent>
        </Dialog>
    );
}
