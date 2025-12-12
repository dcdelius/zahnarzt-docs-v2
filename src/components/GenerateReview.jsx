import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiAlertTriangle, FiCheckCircle, FiEdit2, FiAlertCircle } from 'react-icons/fi';
import { validateData } from '../engine/validate';
import { renderTemplate } from '../engine/render';
import { toast } from 'sonner';

export default function GenerateReview({ template, extractionResult, onFinalize, onBack }) {
    const [localData, setLocalData] = useState(extractionResult.data);
    const [editedFields, setEditedFields] = useState({});
    const [showRaw, setShowRaw] = useState(false);

    const handleFieldChange = (fieldId, newValue) => {
        setLocalData(prev => ({
            ...prev,
            [fieldId]: newValue
        }));

        setEditedFields(prev => ({
            ...prev,
            [fieldId]: true
        }));
    };

    // Validation
    const validation = useMemo(() => {
        if (!template || !localData) return { issues: [], blockingIssues: [], isValid: false };

        // Map extraction warnings to issues
        const extractionWarnings = extractionResult?.meta?.warnings || [];
        const externalIssues = extractionWarnings.map(w => {
            // Support both string (legacy) and object (new)
            const message = typeof w === 'string' ? w : w.message;
            const code = typeof w === 'string' ? undefined : w.code;
            const isMultiTooth = code === 'MULTI_TOOTH_DETECTED' || message.includes("MULTI_TOOTH_DETECTED");

            return {
                type: isMultiTooth ? 'error' : 'warning',
                message: message,
                code: code || (isMultiTooth ? 'MULTI_TOOTH_DETECTED' : undefined),
                blocking: isMultiTooth
            };
        });

        return validateData(template, localData, externalIssues);
    }, [template, localData, extractionResult]);

    const handleFinalize = () => {
        if (validation.blockingIssues.length > 0) {
            toast.error("Bitte beheben Sie alle blockierenden Fehler.");
            return;
        }
        // Generate final text
        const finalText = renderTemplate(template, validation.normalizedData);

        onFinalize({
            data: validation.normalizedData,
            issues: validation.issues,
            finalText
        });
    };

    const getConfidenceColor = (fieldId) => {
        const conf = extractionResult.meta.confidenceByField[fieldId];
        if (conf === undefined || conf === null) return 'text-gray-500'; // Edited or unknown
        if (conf > 0.8) return 'text-green-500';
        if (conf > 0.5) return 'text-yellow-500';
        return 'text-red-500';
    };

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-10">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Überprüfung</h2>
                    <p className="text-sm text-gray-500">Bitte kontrollieren Sie die extrahierten Daten.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setShowRaw(!showRaw)} className="text-xs text-gray-400 hover:text-gray-600">
                        {showRaw ? "Hide Debug" : "Show Debug"}
                    </button>
                    <button onClick={onBack} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                        Zurück
                    </button>
                    <button
                        onClick={handleFinalize}
                        disabled={validation.blockingIssues.length > 0}
                        className={`px-6 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${validation.blockingIssues.length > 0
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-green-600 text-white hover:bg-green-700 shadow-lg'
                            }`}
                    >
                        {validation.blockingIssues.length > 0 ? (
                            <><FiAlertTriangle /> {validation.blockingIssues.length} Fehler beheben</>
                        ) : (
                            <><FiCheckCircle /> Finalisieren</>
                        )}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
                <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* LEFT: Form */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-xl shadow-sm border p-6">
                            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <FiEdit2 /> Behandlungsdaten
                            </h3>

                            <div className="space-y-4">
                                {template.fields.map(field => {
                                    const issue = validation.issues.find(i => i.fieldId === field.id);
                                    const isBlocking = issue?.blocking;
                                    const isEdited = !!editedFields[field.id];
                                    const confidence = isEdited ? undefined : extractionResult.meta.confidenceByField[field.id];
                                    const evidence = isEdited ? undefined : extractionResult.meta.evidenceByField[field.id];

                                    return (
                                        <div key={field.id} className={`p-4 rounded-lg border transition-colors ${isBlocking ? 'bg-red-50 border-red-200' :
                                            issue ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-100'
                                            }`}>
                                            <div className="flex justify-between mb-2">
                                                <label className="block text-sm font-medium text-gray-700">
                                                    {field.label} {field.required && <span className="text-red-500">*</span>}
                                                </label>
                                                {isEdited ? (
                                                    <span className="text-xs text-gray-500 italic">manuell bearbeitet</span>
                                                ) : confidence !== undefined && (
                                                    <div className="group relative">
                                                        <span className={`text-xs font-mono ${getConfidenceColor(field.id)} cursor-help`}>
                                                            {(confidence * 100).toFixed(0)}%
                                                        </span>
                                                        {evidence && (
                                                            <div className="absolute right-0 bottom-full mb-2 w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none z-50">
                                                                "{evidence}"
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Input Rendering based on Type */}
                                            {field.type === 'boolean' ? (
                                                <div className="flex gap-4">
                                                    <button
                                                        onClick={() => handleFieldChange(field.id, true)}
                                                        className={`px-4 py-2 rounded-md text-sm font-medium border ${localData[field.id] === true ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-white border-gray-300'}`}
                                                    >
                                                        Ja
                                                    </button>
                                                    <button
                                                        onClick={() => handleFieldChange(field.id, false)}
                                                        className={`px-4 py-2 rounded-md text-sm font-medium border ${localData[field.id] === false ? 'bg-gray-200 border-gray-400 text-gray-800' : 'bg-white border-gray-300'}`}
                                                    >
                                                        Nein
                                                    </button>
                                                    <button
                                                        onClick={() => handleFieldChange(field.id, null)}
                                                        className={`px-3 py-2 rounded-md text-sm text-gray-400 hover:text-gray-600`}
                                                    >
                                                        Reset
                                                    </button>
                                                </div>
                                            ) : field.type === 'multiselect' ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {field.options?.map(opt => (
                                                        <button
                                                            key={opt}
                                                            onClick={() => {
                                                                const current = Array.isArray(localData[field.id]) ? localData[field.id] : [];
                                                                const exists = current.includes(opt);
                                                                const newValue = exists ? current.filter(v => v !== opt) : [...current, opt];
                                                                handleFieldChange(field.id, newValue);
                                                            }}
                                                            className={`px-3 py-1 rounded-full text-sm border ${(localData[field.id] || []).includes(opt)
                                                                ? 'bg-blue-100 border-blue-500 text-blue-700'
                                                                : 'bg-white border-gray-300 text-gray-600'
                                                                }`}
                                                        >
                                                            {opt}
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : field.type === 'enum' ? (
                                                <select
                                                    value={localData[field.id] || ""}
                                                    onChange={(e) => handleFieldChange(field.id, e.target.value || null)}
                                                    className="w-full p-2 border rounded-md bg-white"
                                                >
                                                    <option value="">- Bitte wählen -</option>
                                                    {field.options?.map(opt => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <input
                                                    type={field.type === 'number' ? 'number' : 'text'}
                                                    value={localData[field.id] || ""}
                                                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                                                    className="w-full p-2 border rounded-md"
                                                    placeholder={field.placeholder}
                                                />
                                            )}

                                            {/* Issue Message */}
                                            {issue && (
                                                <div className={`mt-2 text-sm flex items-center gap-1 ${isBlocking ? 'text-red-600 font-bold' : 'text-yellow-600'}`}>
                                                    {isBlocking ? <FiAlertTriangle /> : <FiAlertCircle />}
                                                    {issue.message}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Preview & Issues */}
                    <div className="space-y-6">
                        {/* Issues Summary */}
                        <div className="bg-white rounded-xl shadow-sm border p-6">
                            <h3 className="font-bold text-gray-800 mb-4">Status</h3>
                            {validation.issues.length === 0 ? (
                                <div className="text-green-600 flex items-center gap-2 bg-green-50 p-3 rounded-lg">
                                    <FiCheckCircle /> Alles in Ordnung
                                </div>
                            ) : (
                                <ul className="space-y-2">
                                    {validation.issues.map((issue, idx) => (
                                        <li key={idx} className={`text-sm p-2 rounded flex items-start gap-2 ${issue.blocking ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'}`}>
                                            <span className="mt-0.5">{issue.blocking ? <FiAlertTriangle /> : <FiAlertCircle />}</span>
                                            {issue.message}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* Live Preview */}
                        <div className="bg-gray-800 text-gray-100 rounded-xl shadow-sm p-6">
                            <h3 className="font-bold text-gray-300 mb-4 text-xs uppercase tracking-wider">Vorschau (Live)</h3>
                            <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap font-mono text-sm">
                                {renderTemplate(template, validation.normalizedData)}
                            </div>
                        </div>

                        {/* Debug Info */}
                        {showRaw && (
                            <div className="bg-gray-100 p-4 rounded text-xs font-mono overflow-auto max-h-60">
                                <pre>{JSON.stringify(localData, null, 2)}</pre>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
