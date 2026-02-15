import React from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { BLOCK_REGISTRY } from '../../knowledge/blocks/blockRegistry';
import { MdDragIndicator } from 'react-icons/md';

const Item = ({ item, onRemove }) => {
    const controls = useDragControls();

    return (
        <Reorder.Item
            value={item}
            id={item}
            dragListener={false}
            dragControls={controls}
            className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg mb-2 select-none group hover:border-blue-500/50 transition-colors"
        >
            <div
                className="cursor-grab active:cursor-grabbing p-1 text-white/40 hover:text-white"
                onPointerDown={(e) => controls.start(e)}
            >
                <MdDragIndicator size={20} />
            </div>
            <div className="flex-1">
                <div className="text-sm font-medium text-white">
                    {BLOCK_REGISTRY[item]?.label || item}
                </div>
                <div className="text-xs text-white/40">
                    {BLOCK_REGISTRY[item]?.id || item}
                </div>
            </div>
        </Reorder.Item>
    );
};

export const StructureEditor = ({ groups, setGroups }) => {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-white/70 uppercase tracking-wider">
                    Struktur & Ablauf
                </h3>
                <span className="text-xs text-white/40">
                    Drag & Drop zum Sortieren
                </span>
            </div>

            <Reorder.Group axis="y" values={groups} onReorder={setGroups}>
                {groups.map((item) => (
                    <Item key={item} item={item} />
                ))}
            </Reorder.Group>
        </div>
    );
};
