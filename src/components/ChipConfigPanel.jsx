/**
 * ChipConfigPanel - Visual Chip Drag & Drop
 * 
 * 4 columns with chips styled like in DictationPill (rounded pills).
 * Drag chips between columns to change their visibility state.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheck, FiX, FiEyeOff, FiLock } from 'react-icons/fi';
import { SettingsManager } from '../sonia/settings/settingsManager';
import { getTreatment } from '../sonia/behandlungen';

const ITEM_TYPE = 'CHIP';

// Column config
const COLUMNS = [
    {
        id: 'locked_on',
        title: 'Immer aktiv',
        icon: '🟢',
        color: 'bg-emerald-50',
        borderColor: 'border-emerald-200',
        hoverColor: 'bg-emerald-100',
        chipActive: true,
        chipStyle: 'bg-emerald-500 text-white'
    },
    {
        id: 'visible',
        title: 'QuickView',
        icon: '⚪',
        color: 'bg-white',
        borderColor: 'border-gray-200',
        hoverColor: 'bg-blue-50',
        chipActive: true,
        chipStyle: 'bg-blue-500 text-white'
    },
    {
        id: 'locked_off',
        title: 'Immer negativ',
        icon: '🔴',
        color: 'bg-red-50',
        borderColor: 'border-red-200',
        hoverColor: 'bg-red-100',
        chipActive: false,
        chipStyle: 'bg-gray-100 text-gray-400 line-through'
    },
    {
        id: 'hidden',
        title: 'Nicht verwendet',
        icon: '⚫',
        color: 'bg-gray-50',
        borderColor: 'border-gray-200',
        hoverColor: 'bg-gray-100',
        chipActive: false,
        chipStyle: 'bg-gray-200 text-gray-400'
    }
];

// ═══════════════════════════════════════════════════════════════════════════
// Draggable Chip (styled like DictationPill chips)
// ═══════════════════════════════════════════════════════════════════════════

function DraggableChip({ chip, columnId, isDefaultActive, onToggleDefault, onCycleColumn }) {
    const column = COLUMNS.find(c => c.id === columnId);

    const [{ isDragging }, drag] = useDrag({
        type: ITEM_TYPE,
        item: { id: chip.id, fromColumn: columnId },
        collect: (monitor) => ({
            isDragging: monitor.isDragging()
        })
    });

    const showToggle = columnId === 'visible';

    // Column cycle order: hidden → locked_on → visible → locked_off → hidden
    const CYCLE_ORDER = ['hidden', 'locked_on', 'visible', 'locked_off'];

    const handleDoubleClick = (e) => {
        e.preventDefault();
        const currentIndex = CYCLE_ORDER.indexOf(columnId);
        const nextIndex = (currentIndex + 1) % CYCLE_ORDER.length;
        const nextColumn = CYCLE_ORDER[nextIndex];
        if (onCycleColumn) {
            onCycleColumn(chip.id, nextColumn);
        }
    };

    return (
        <motion.div
            ref={drag}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
                opacity: isDragging ? 0.5 : 1,
                scale: isDragging ? 1.1 : 1
            }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.05 }}
            onDoubleClick={handleDoubleClick}
            title="Doppelklick: Spalte wechseln"
            className={`
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                cursor-grab active:cursor-grabbing transition-all select-none
                ${isDragging ? 'ring-2 ring-blue-400 shadow-lg' : 'shadow-sm'}
                ${showToggle
                    ? (isDefaultActive
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-100 text-gray-400 line-through')
                    : column.chipStyle
                }
            `}
        >
            {/* Active indicator dot */}
            {column.chipActive && !showToggle && (
                <span className="w-1.5 h-1.5 bg-white/80 rounded-full" />
            )}

            {/* Toggle indicator for visible column */}
            {showToggle && isDefaultActive && (
                <span className="w-1.5 h-1.5 bg-white/80 rounded-full" />
            )}

            {chip.label}

            {/* Billing indicator */}
            {chip.billingRefs?.length > 0 && (
                <span className={`text-[9px] ${column.chipActive ? 'opacity-60' : 'opacity-40'}`}>€</span>
            )}

            {/* Click to toggle default state in visible column */}
            {showToggle && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleDefault(chip.id);
                    }}
                    className="ml-0.5 hover:scale-110 transition-transform"
                >
                    {isDefaultActive
                        ? <FiCheck className="w-3 h-3" />
                        : <FiX className="w-3 h-3" />
                    }
                </button>
            )}
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Drop Column
// ═══════════════════════════════════════════════════════════════════════════

function DropColumn({ column, chips, allChips, inactiveChips, onDrop, onToggleDefault, onCycleColumn }) {
    const [{ isOver, canDrop }, drop] = useDrop({
        accept: ITEM_TYPE,
        drop: (item) => {
            if (item.fromColumn !== column.id) {
                onDrop(item.id, column.id);
            }
        },
        collect: (monitor) => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop()
        })
    });

    const columnChips = chips.map(id => allChips.find(c => c.id === id)).filter(Boolean);

    return (
        <div
            ref={drop}
            className={`
                flex-1 min-w-0 rounded-2xl p-4 transition-all border-2 border-dashed
                ${isOver && canDrop ? column.hoverColor + ' border-blue-400' : column.color + ' ' + column.borderColor}
            `}
        >
            {/* Column Header */}
            <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">{column.icon}</span>
                <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide">{column.title}</h3>
                <span className="ml-auto text-xs font-medium text-gray-400">{columnChips.length}</span>
            </div>

            {/* Chips */}
            <div className="flex flex-wrap gap-2 min-h-[80px]">
                <AnimatePresence mode="popLayout">
                    {columnChips.map(chip => (
                        <DraggableChip
                            key={chip.id}
                            chip={chip}
                            columnId={column.id}
                            isDefaultActive={!inactiveChips.includes(chip.id)}
                            onToggleDefault={onToggleDefault}
                            onCycleColumn={onCycleColumn}
                        />
                    ))}
                </AnimatePresence>

                {columnChips.length === 0 && (
                    <div className="w-full h-16 flex items-center justify-center">
                        <span className="text-xs text-gray-400">Chips hierher ziehen</span>
                    </div>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Panel
// ═══════════════════════════════════════════════════════════════════════════

export default function ChipConfigPanel({ treatmentId }) {
    const [visibility, setVisibility] = useState({});
    const [inactiveChips, setInactiveChips] = useState([]);
    const [allChips, setAllChips] = useState([]);

    // Load treatment chips and settings
    useEffect(() => {
        const treatment = getTreatment(treatmentId);
        if (treatment) {
            setAllChips(treatment.chips || []);
        }

        // Load visibility settings
        const vis = SettingsManager.getAllChipVisibility(treatmentId);
        setVisibility(vis);

        // Load inactive chips
        const inactive = SettingsManager.getInactiveChips(treatmentId);
        setInactiveChips(inactive);
    }, [treatmentId]);

    // Get chips for a column
    const getColumnChips = useCallback((columnId) => {
        return allChips
            .filter(chip => {
                const v = visibility[chip.id] || 'hidden';
                return v === columnId;
            })
            .map(c => c.id);
    }, [allChips, visibility]);

    // Handle drop
    const handleDrop = useCallback((chipId, newColumn) => {
        SettingsManager.setChipVisibility(treatmentId, chipId, newColumn);
        setVisibility(prev => ({ ...prev, [chipId]: newColumn }));
    }, [treatmentId]);

    // Toggle default active state
    const handleToggleDefault = useCallback((chipId) => {
        const isCurrentlyInactive = inactiveChips.includes(chipId);

        if (isCurrentlyInactive) {
            const updated = inactiveChips.filter(id => id !== chipId);
            SettingsManager.setInactiveChips(treatmentId, updated);
            setInactiveChips(updated);
        } else {
            const updated = [...inactiveChips, chipId];
            SettingsManager.setInactiveChips(treatmentId, updated);
            setInactiveChips(updated);
        }
    }, [treatmentId, inactiveChips]);

    return (
        <DndProvider backend={HTML5Backend}>
            {/* Hint */}
            <div className="mb-4 text-center">
                <p className="text-sm text-gray-500">
                    Chips zwischen Spalten ziehen um ihren Status zu ändern
                </p>
            </div>

            {/* 4 Column Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {COLUMNS.map(column => (
                    <DropColumn
                        key={column.id}
                        column={column}
                        chips={getColumnChips(column.id)}
                        allChips={allChips}
                        inactiveChips={inactiveChips}
                        onDrop={handleDrop}
                        onToggleDefault={handleToggleDefault}
                        onCycleColumn={handleDrop}
                    />
                ))}
            </div>

            {/* Legend */}
            <div className="mt-6 flex flex-wrap gap-4 justify-center text-xs text-gray-500">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Immer dokumentiert als durchgeführt</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>In QuickView, per Klick umschaltbar</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-400" />
                    <span>Immer "nicht durchgeführt"</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gray-400" />
                    <span>Komplett ignoriert</span>
                </div>
            </div>
        </DndProvider>
    );
}
