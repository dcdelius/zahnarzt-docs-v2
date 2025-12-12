import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * StandardsChips - iOS-style dynamic chip display
 * Modern, clean design with smooth animations
 */
export default function StandardsChips({
    availableChips = [],
    activeStandards = [],
    inactiveStandards = [],
    onToggle
}) {
    const allChips = availableChips;

    if (allChips.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/80 backdrop-blur-xl p-5 rounded-2xl shadow-sm border border-gray-100"
            >
                <p className="text-sm text-gray-400 text-center">
                    Wähle eine Behandlung
                </p>
            </motion.div>
        );
    }

    // Animation variants
    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.03,
                delayChildren: 0.1
            }
        }
    };

    const chipVariant = {
        hidden: { opacity: 0, scale: 0.8, y: 10 },
        show: { opacity: 1, scale: 1, y: 0 }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white/80 backdrop-blur-xl p-4 rounded-2xl shadow-sm border border-gray-100"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Standards
                </span>
                <span className="text-[10px] text-gray-300">
                    {activeStandards.filter(id => !inactiveStandards.includes(id)).length} aktiv
                </span>
            </div>

            {/* Chips Grid */}
            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="flex flex-wrap gap-2"
            >
                {allChips.map(chip => {
                    const chipId = chip.id;
                    const label = chip.then?.label || chipId;
                    const isActive = activeStandards.includes(chipId) && !inactiveStandards.includes(chipId);
                    const isInactive = inactiveStandards.includes(chipId);
                    const hasBilling = chip.then?.billingRefs?.length > 0;

                    return (
                        <motion.button
                            key={chipId}
                            variants={chipVariant}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onToggle(chipId)}
                            title={chip.then?.description || ''}
                            className={`
                                relative px-3 py-1.5 rounded-full text-[12px] font-medium
                                transition-colors duration-200 ease-out
                                flex items-center gap-1
                                ${isActive
                                    ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200'
                                    : isInactive
                                        ? 'bg-gray-100 text-gray-300 line-through'
                                        : 'bg-gray-100 text-gray-500 hover:bg-gray-150'
                                }
                            `}
                        >
                            {/* Active indicator dot */}
                            {isActive && (
                                <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="w-1.5 h-1.5 bg-white rounded-full"
                                />
                            )}

                            <span className={isInactive ? 'opacity-50' : ''}>
                                {label}
                            </span>

                            {/* Euro indicator for billable */}
                            {hasBilling && (
                                <span className={`
                                    text-[9px] font-bold ml-0.5
                                    ${isActive ? 'text-emerald-200' : 'text-gray-300'}
                                `}>
                                    €
                                </span>
                            )}
                        </motion.button>
                    );
                })}
            </motion.div>
        </motion.div>
    );
}
