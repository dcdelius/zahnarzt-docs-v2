/**
 * AnalogJustificationRow Component
 * 
 * Inline component for entering analog billing justification.
 * Rendered under each analog suggestion chip.
 * 
 * SAFETY: Never displays imported snippets. Only user-entered text and codes.
 */

import React, { useState, useCallback } from 'react';
import { AlertCircle, Check, ChevronDown, Save, FileText } from 'lucide-react';
import type { AnalogJustification } from '../../core/billing/knowledgeBase/logic/analogJustificationService';
import {
    JUSTIFICATION_MIN_LENGTH,
    JUSTIFICATION_MAX_LENGTH,
    isValidJustification
} from '../../core/billing/knowledgeBase/logic/analogJustificationService';

// ═══════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════

export interface AnalogJustificationRowProps {
    /** The analog code (e.g., "ANALOG_Kons_04") */
    analogCode: string;

    /** Label to display (e.g., "Kariesinfiltration") */
    analogLabel?: string;

    /** Suggested comparison codes from the resolver */
    suggestedComparisonCodes: string[];

    /** Existing justification if already saved */
    existingJustification?: AnalogJustification;

    /** Callback when user saves justification */
    onSave: (
        analogCode: string,
        justificationText: string,
        selectedComparisonCode?: string
    ) => void;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function AnalogJustificationRow({
    analogCode,
    analogLabel,
    suggestedComparisonCodes,
    existingJustification,
    onSave
}: AnalogJustificationRowProps) {
    // Local state
    const [text, setText] = useState(existingJustification?.justificationText || '');
    const [selectedCode, setSelectedCode] = useState<string>(
        existingJustification?.selectedComparisonCode ||
        suggestedComparisonCodes[0] ||
        ''
    );
    const [customCode, setCustomCode] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(!!existingJustification);

    // Derived state
    const charCount = text.length;
    const isValid = isValidJustification(text);
    const canSave = isValid && !isSaving;
    const status = isSaved ? 'saved' : 'missing';

    // Combine suggested + custom code
    const effectiveCode = customCode || selectedCode;

    // ─── Handlers ─────────────────────────────────────────────

    const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value.slice(0, JUSTIFICATION_MAX_LENGTH);
        setText(value);
        setIsSaved(false); // Mark as unsaved when editing
    }, []);

    const handleCodeSelect = useCallback((code: string) => {
        setSelectedCode(code);
        setCustomCode('');
        setShowDropdown(false);
        setIsSaved(false);
    }, []);

    const handleCustomCodeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setCustomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''));
        setSelectedCode('');
        setIsSaved(false);
    }, []);

    const handleSave = useCallback(async () => {
        if (!canSave) return;

        setIsSaving(true);
        try {
            await onSave(analogCode, text, effectiveCode || undefined);
            setIsSaved(true);
        } finally {
            setIsSaving(false);
        }
    }, [canSave, analogCode, text, effectiveCode, onSave]);

    // ─── Render ───────────────────────────────────────────────

    return (
        <div className="mt-3 p-4 rounded-xl bg-amber-50/50 border border-amber-200/50 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-semibold text-amber-800">
                        §6 Analogbegründung
                    </span>
                    <span className="text-[10px] text-amber-600 font-mono">
                        {analogCode}
                    </span>
                </div>

                {/* Status Badge */}
                <div className={`
                    flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium
                    ${status === 'saved'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'}
                `}>
                    {status === 'saved' ? (
                        <>
                            <Check className="w-3 h-3" />
                            Gespeichert
                        </>
                    ) : (
                        <>
                            <AlertCircle className="w-3 h-3" />
                            Begründung fehlt
                        </>
                    )}
                </div>
            </div>

            {/* Comparison Code Selector */}
            <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-amber-700 uppercase tracking-wider">
                    Vergleichsposition GOZ
                </label>
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-amber-200 text-sm text-gray-700 hover:border-amber-300 transition-colors"
                    >
                        <span>{effectiveCode || 'Auswählen...'}</span>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {showDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-amber-200 rounded-lg shadow-lg overflow-hidden">
                            {/* Suggested codes */}
                            {suggestedComparisonCodes.map(code => (
                                <button
                                    key={code}
                                    onClick={() => handleCodeSelect(code)}
                                    className={`
                                        w-full px-3 py-2 text-left text-sm hover:bg-amber-50 transition-colors
                                        ${selectedCode === code ? 'bg-amber-100 font-medium' : ''}
                                    `}
                                >
                                    {code}
                                </button>
                            ))}

                            {/* Custom code input */}
                            <div className="border-t border-amber-100 p-2">
                                <input
                                    type="text"
                                    value={customCode}
                                    onChange={handleCustomCodeChange}
                                    placeholder="Andere Position eingeben..."
                                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-amber-300"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Justification Textarea */}
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <label className="text-[10px] font-medium text-amber-700 uppercase tracking-wider">
                        Begründungstext
                    </label>
                    <span className={`text-[10px] font-mono ${charCount < JUSTIFICATION_MIN_LENGTH
                            ? 'text-amber-600'
                            : charCount > JUSTIFICATION_MAX_LENGTH - 50
                                ? 'text-orange-600'
                                : 'text-gray-400'
                        }`}>
                        {charCount}/{JUSTIFICATION_MAX_LENGTH}
                    </span>
                </div>

                <textarea
                    value={text}
                    onChange={handleTextChange}
                    placeholder={`Begründung für Analogabrechnung gemäß §6 GOZ (mind. ${JUSTIFICATION_MIN_LENGTH} Zeichen)...`}
                    rows={3}
                    className={`
                        w-full px-3 py-2 text-sm rounded-lg border resize-none
                        focus:outline-none focus:ring-2 transition-colors
                        ${charCount < JUSTIFICATION_MIN_LENGTH
                            ? 'border-amber-300 focus:ring-amber-200'
                            : 'border-gray-200 focus:ring-emerald-200'}
                    `}
                />

                {charCount > 0 && charCount < JUSTIFICATION_MIN_LENGTH && (
                    <p className="text-[10px] text-amber-600">
                        Noch {JUSTIFICATION_MIN_LENGTH - charCount} Zeichen benötigt
                    </p>
                )}
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={!canSave}
                    className={`
                        flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium
                        transition-all duration-200
                        ${canSave
                            ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'}
                    `}
                >
                    {isSaving ? (
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <Save className="w-3 h-3" />
                    )}
                    {isSaved ? 'Aktualisieren' : 'Speichern'}
                </button>
            </div>
        </div>
    );
}

export default AnalogJustificationRow;
