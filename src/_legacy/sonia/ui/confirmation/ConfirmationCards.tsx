/**
 * CONFIRMATION CARDS
 * 
 * Quick confirmation UI for uncertain findings.
 * Shows when chips have needsConfirmation: true (low confidence).
 * 
 * Design: iOS-style cards with quick-tap buttons.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { ConfirmationItem, ConfirmationOption } from './types';

interface ConfirmationCardsProps {
    items: ConfirmationItem[];
    onConfirm: (itemId: string, option: ConfirmationOption) => void;
    onDismiss?: (itemId: string) => void;
}

export default function ConfirmationCards({
    items,
    onConfirm,
    onDismiss
}: ConfirmationCardsProps) {
    if (items.length === 0) return null;

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center gap-2 text-amber-600">
                <ExclamationTriangleIcon className="w-5 h-5" />
                <span className="text-sm font-semibold">Bitte bestätigen</span>
                <span className="text-xs text-gray-400">({items.length} offen)</span>
            </div>

            {/* Cards */}
            <AnimatePresence mode="popLayout">
                {items.map((item, index) => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-gradient-to-r from-amber-50 to-orange-50 
                                   border border-amber-200 rounded-xl p-4 shadow-sm"
                    >
                        {/* Question */}
                        <div className="flex items-center justify-between mb-3">
                            <span className="font-semibold text-gray-800">
                                {item.question}
                            </span>
                            {item.confidence < 0.5 && (
                                <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                                    Standard
                                </span>
                            )}
                        </div>

                        {/* Evidence if any */}
                        {item.evidence && item.evidence.length > 0 && (
                            <p className="text-xs text-gray-500 mb-3 italic">
                                "{item.evidence.join(', ')}"
                            </p>
                        )}

                        {/* Option Buttons */}
                        <div className="flex flex-wrap gap-2">
                            {item.options.map(option => (
                                <motion.button
                                    key={option.id}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => onConfirm(item.id, option)}
                                    className={`
                                        px-4 py-2 rounded-lg text-sm font-medium
                                        transition-all duration-150
                                        ${option.value === null
                                            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            : 'bg-white border border-gray-200 text-gray-800 hover:border-emerald-400 hover:bg-emerald-50'
                                        }
                                        shadow-sm hover:shadow
                                    `}
                                >
                                    {option.label}
                                </motion.button>
                            ))}
                        </div>

                        {/* Dismiss option */}
                        {onDismiss && (
                            <button
                                onClick={() => onDismiss(item.id)}
                                className="text-xs text-gray-400 hover:text-gray-600 mt-2"
                            >
                                Überspringen
                            </button>
                        )}
                    </motion.div>
                ))}
            </AnimatePresence>

            {/* All confirmed indicator */}
            {items.length === 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 text-emerald-600 py-2"
                >
                    <CheckCircleIcon className="w-5 h-5" />
                    <span className="text-sm font-medium">Alle Befunde bestätigt</span>
                </motion.div>
            )}
        </div>
    );
}
