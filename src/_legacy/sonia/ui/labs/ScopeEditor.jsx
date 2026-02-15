import React from 'react';
import { motion } from 'framer-motion';
import { FiCheck, FiPlus, FiX } from 'react-icons/fi';
import { BLOCK_REGISTRY } from '../../knowledge/blocks/blockRegistry';

export const ScopeEditor = ({ selectedGroups, allGroups, onToggle }) => {
    // We use 'allGroups' (the master list) to render the options in the correct order
    // 'selectedGroups' is the list of currently active IDs

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-white/70 uppercase tracking-wider">
                    Inhalt & Umfang
                </h3>
                <span className="text-xs text-white/40">
                    {selectedGroups.length} Module aktiv
                </span>
            </div>

            <div className="grid grid-cols-1 gap-2">
                {allGroups.map(groupId => {
                    const isSelected = selectedGroups.includes(groupId);
                    const def = BLOCK_REGISTRY[groupId] || { label: groupId };

                    return (
                        <motion.button
                            key={groupId}
                            layout
                            onClick={() => onToggle(groupId)}
                            className={`group flex items-center justify-between p-3 rounded-lg border text-left transition-all ${isSelected
                                    ? 'bg-blue-500/10 border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.1)]'
                                    : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/30'
                                    }`}>
                                    {isSelected ? <FiCheck size={12} /> : <FiPlus size={12} />}
                                </div>
                                <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-white/50'}`}>
                                    {def.label}
                                </span>
                            </div>

                            {/* Optional: Add an indicator if it's a "Core" module vs "Optional" */}
                        </motion.button>
                    );
                })}
            </div>

            <p className="text-xs text-white/30 italic mt-4">
                Hinweis: Die Reihenfolge wird automatisch nach medizinischer Logik sortiert.
            </p>
        </div>
    );
};
