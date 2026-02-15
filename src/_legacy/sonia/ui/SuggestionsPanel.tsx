import React from 'react';
import { createPortal } from 'react-dom';
import { SmartSuggestion } from '../suggestions/generateSmartSuggestions';

interface SuggestionsPanelProps {
    suggestions: SmartSuggestion[];
    acceptedSuggestions: string[];
    onAccept: (id: string) => void;
    onReject: (id: string) => void;
    onClose: () => void;
    onAcceptAll: () => void;
}

export default function SuggestionsPanel({
    suggestions,
    acceptedSuggestions,
    onAccept,
    onReject,
    onClose,
    onAcceptAll
}: SuggestionsPanelProps) {
    if (suggestions.length === 0) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/20"
            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif' }}
            onClick={onClose}
        >
            {/* Modal with Transparency - Animations removed for stability */}
            <div
                className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl ring-1 ring-black/5 max-w-xl w-full mx-4 max-h-[85vh] overflow-hidden pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
            >

                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">💡</span>
                        <div>
                            <h2 className="text-base font-bold text-gray-800">Smart-Vorschläge</h2>
                            <p className="text-gray-500 text-xs mt-0.5">Abrechnungsoptimierung</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all cursor-pointer"
                        type="button"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Suggestions List */}
                <div className="px-5 py-4 space-y-2.5 overflow-y-auto max-h-[calc(85vh-200px)]">
                    {suggestions.map((suggestion) => {
                        const isAccepted = acceptedSuggestions.includes(suggestion.id);

                        return (
                            <button
                                key={suggestion.id}
                                type="button"
                                className={`
                                    w-full text-left group p-4 rounded-2xl border-2 transition-all cursor-pointer relative
                                    ${isAccepted
                                        ? 'bg-emerald-50 border-emerald-200 shadow-sm'
                                        : 'bg-white border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-sm'
                                    }
                                `}
                                onClick={(e) => {
                                    e.stopPropagation(); // Ensure click doesn't bubble weirdly
                                    isAccepted ? onReject(suggestion.id) : onAccept(suggestion.id);
                                }}
                            >
                                <div className="flex items-start gap-3.5">
                                    {/* Custom Rounded Checkbox */}
                                    <div className={`
                                        mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all
                                        ${isAccepted
                                            ? 'bg-emerald-500 border-emerald-500 scale-110 shadow-sm'
                                            : 'border-gray-300 bg-white group-hover:border-blue-300'
                                        }
                                    `}>
                                        {isAccepted && (
                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2 mb-1.5">
                                            <h3 className={`font-bold text-sm leading-tight ${isAccepted ? 'text-emerald-900' : 'text-gray-800'}`}>
                                                {suggestion.label}
                                            </h3>
                                            {suggestion.billingCode && (
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold border whitespace-nowrap shadow-sm
                                                    ${isAccepted
                                                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                                        : 'bg-amber-50 text-amber-600 border-amber-100'
                                                    }
                                                `}>
                                                    {suggestion.billingCode}
                                                </span>
                                            )}
                                        </div>
                                        <p className={`text-xs leading-relaxed ${isAccepted ? 'text-emerald-700' : 'text-gray-600'}`}>
                                            {suggestion.description}
                                        </p>
                                        <p className={`text-xs mt-1.5 leading-relaxed font-medium ${isAccepted ? 'text-emerald-600' : 'text-gray-400'}`}>
                                            💰 {suggestion.reasoning}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Footer with Pill Buttons */}
                <div className="px-5 py-4 flex items-center justify-center gap-2 border-t border-gray-100 bg-gray-50/50">
                    <div className="bg-white shadow-lg rounded-full border border-gray-100 p-1.5 flex items-center gap-2">
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onClose(); }}
                            className="px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 text-xs font-bold transition-all"
                        >
                            Später
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                acceptedSuggestions.forEach(onReject);
                                onClose();
                            }}
                            className="px-4 py-2 rounded-full bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 text-xs font-bold transition-all"
                        >
                            Ablehnen
                        </button>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onAcceptAll(); }}
                            className="px-5 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all hover:scale-105"
                        >
                            ✓ Alle akzeptieren
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
