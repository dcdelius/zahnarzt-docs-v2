import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { seedMVPTemplate } from './utils/seedTemplate';
import { toast } from 'sonner';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { extractStructuredData } from './engine/extractStructuredData';
import GenerateReview from './components/GenerateReview';
import { saveNote } from './utils/noteService';
import { FiMic, FiCpu, FiCheck } from 'react-icons/fi';

export default function TemplateBuilderV2() {
    // State
    const [mode, setMode] = useState('input'); // 'input' | 'processing' | 'review' | 'success'
    const [dictation, setDictation] = useState("");
    const [template, setTemplate] = useState(null);
    const [extractionResult, setExtractionResult] = useState(null);
    const [finalNoteId, setFinalNoteId] = useState(null);

    // Load MVP Template on Mount
    useEffect(() => {
        const loadTemplate = async () => {
            try {
                const docRef = doc(db, "Praxen", "1", "TemplatesV3", "mvp_komposit");
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    setTemplate(snap.data());
                } else {
                    // Auto-seed if missing for convenience
                    await seedMVPTemplate();
                    const snap2 = await getDoc(docRef);
                    if (snap2.exists()) setTemplate(snap2.data());
                }
            } catch (e) {
                console.error("Failed to load template", e);
                toast.error("Template konnte nicht geladen werden.");
            }
        };
        loadTemplate();
    }, []);

    const handleExtract = async () => {
        if (!dictation.trim()) return;
        setMode('processing');
        try {
            const result = await extractStructuredData(template, dictation);
            setExtractionResult(result);
            setMode('review');
        } catch (e) {
            console.error(e);
            toast.error("Fehler bei der Extraktion: " + e.message);
            setMode('input');
        }
    };

    const handleFinalize = async ({ data, issues, finalText }) => {
        try {
            const noteId = await saveNote("1", {
                templateId: template.id,
                templateVersion: template.version,
                rawDictation: dictation,
                extractedData: extractionResult,
                validationIssues: issues,
                finalText: finalText,
                finalData: data,
                authorId: "current_user" // TODO: Get from Auth
            });
            setFinalNoteId(noteId);
            setMode('success');
            toast.success("Dokumentation gespeichert!");
        } catch (e) {
            toast.error("Speichern fehlgeschlagen.");
        }
    };

    const handleReset = () => {
        setDictation("");
        setExtractionResult(null);
        setMode('input');
    };

    if (!template) return <div className="p-10 text-center">Lade Template...</div>;

    if (mode === 'review') {
        return (
            <GenerateReview
                template={template}
                extractionResult={extractionResult}
                onFinalize={handleFinalize}
                onBack={() => setMode('input')}
            />
        );
    }

    if (mode === 'success') {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-green-50">
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
                        <FiCheck className="w-12 h-12" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Gespeichert!</h2>
                    <p className="text-gray-600 mb-8">Note ID: {finalNoteId}</p>
                    <button onClick={handleReset} className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-green-700">
                        Neue Dokumentation
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="flex-1 relative overflow-hidden flex flex-col font-sans h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto w-full px-6 py-12 flex flex-col h-full">
                <header className="mb-8 text-center">
                    <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tighter">
                        Dokumentation <span className="text-blue-600">V3</span>
                    </h1>
                    <p className="text-gray-500">Template: {template.title}</p>
                </header>

                <div className="flex-1 bg-white rounded-2xl shadow-xl border overflow-hidden flex flex-col">
                    <div className="flex-1 p-6">
                        <textarea
                            value={dictation}
                            onChange={(e) => setDictation(e.target.value)}
                            placeholder="Diktieren Sie hier... (z.B. 'Füllung 16 mod, Leitungsanästhesie')"
                            className="w-full h-full resize-none outline-none text-lg text-gray-700 placeholder-gray-300"
                            disabled={mode === 'processing'}
                        />
                    </div>
                    <div className="p-6 bg-gray-50 border-t flex justify-between items-center">
                        <div className="text-sm text-gray-400">
                            {dictation.length} Zeichen
                        </div>
                        <button
                            onClick={handleExtract}
                            disabled={!dictation.trim() || mode === 'processing'}
                            className={`px-8 py-4 rounded-xl font-bold text-lg shadow-lg flex items-center gap-3 transition-all ${mode === 'processing'
                                    ? 'bg-gray-400 cursor-wait'
                                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
                                }`}
                        >
                            {mode === 'processing' ? (
                                <><FiCpu className="animate-spin" /> Verarbeite...</>
                            ) : (
                                <><FiMic /> Generieren</>
                            )}
                        </button>
                    </div>
                </div>

                {/* Seed Button for Debugging */}
                <div className="mt-8 text-center">
                    <button onClick={seedMVPTemplate} className="text-xs text-gray-400 hover:text-gray-600 underline">
                        Reset Template (Seed)
                    </button>
                </div>
            </div>
        </div>
    );
}
