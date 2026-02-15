import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
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
import './ControlPalette.css';

interface Item {
    id: string;
    label: string;
    enabled: boolean;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    subtitle?: string;
    items: Item[];
    onToggle: (id: string, enabled: boolean) => void;
    onEnableAll: () => void;
    onDisableAll: () => void;
}

export function ControlPalette({
    open,
    onOpenChange,
    title,
    subtitle,
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
            <DialogContent className="v10-control-palette">
                <AnimatePresence mode="wait">
                    {open ? (
                        <motion.div
                            key="control-palette"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                        >
                            <DialogHeader className="v10-control-palette-header">
                                <DialogTitle>{title}</DialogTitle>
                                {subtitle ? (
                                    <DialogDescription>{subtitle}</DialogDescription>
                                ) : null}
                            </DialogHeader>

                            <Command shouldFilter={false} className="v10-control-palette-command">
                                <CommandInput
                                    ref={inputRef}
                                    placeholder="Suchen…"
                                    value={search}
                                    onValueChange={setSearch}
                                />
                                <ScrollArea className="v10-control-palette-scroll">
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
                                                    className={`v10-control-palette-item ${item.enabled ? 'is-on' : 'is-off'}`}
                                                >
                                                    <span className="v10-control-palette-label">{item.label}</span>
                                                    {item.enabled ? (
                                                        <span className="v10-control-palette-check">
                                                            <Check size={14} />
                                                        </span>
                                                    ) : null}
                                                </CommandItem>
                                            </motion.div>
                                        ))}
                                    </CommandList>
                                </ScrollArea>

                                <Separator className="v10-control-palette-separator" />

                                <div className="v10-control-palette-footer">
                                    <div className="v10-control-palette-actions">
                                        <button
                                            type="button"
                                            className="v10-control-palette-btn"
                                            onClick={onEnableAll}
                                        >
                                            Alle aktivieren
                                        </button>
                                        <button
                                            type="button"
                                            className="v10-control-palette-btn"
                                            onClick={onDisableAll}
                                        >
                                            Alle deaktivieren
                                        </button>
                                    </div>
                                    <button
                                        type="button"
                                        className="v10-control-palette-done"
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
