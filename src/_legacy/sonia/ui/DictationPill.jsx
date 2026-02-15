import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMic, FiSend, FiSliders } from 'react-icons/fi';
import { TypeAnimation } from 'react-type-animation';

export default function DictationPill({
    value,
    onChange,
    onExtract,
    isRecording,
    onStartRecording,
    onStopRecording,
    isTranscribing,
    extracting,
    hideExtractButton = false,
    // Configuration Props
    insuranceType,
    onInsuranceChange,
    manualMaterial,
    onMaterialChange,
    standards = [],
    inactiveStandards = [],
    onToggleStandard,
    // NEW: Text Length (replaces showBillingCodes, includeRisks)
    textLength = 'mittel',  // 'kurz' | 'mittel' | 'lang'
    onTextLengthChange,
    debugMode,
    setDebugMode
}) {
    const textareaRef = useRef(null);
    const [isInputFocused, setIsInputFocused] = useState(false);
    const [isPillExpanded, setIsPillExpanded] = useState(false);

    const handleRecordingToggle = () => {
        if (isRecording) {
            onStopRecording();
        } else {
            onStartRecording();
        }
    };

    return (
        <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
                duration: 0.5,
                ease: [0.2, 0.8, 0.2, 1]
            }}
            className="relative w-full rounded-[3.5rem] shadow-2xl ring-1 ring-black/5 bg-white"
        >
            {/* Subtle Depth Layer */}
            <div className="absolute inset-0 rounded-[3.5rem] bg-gradient-to-b from-white to-gray-50 pointer-events-none opacity-50" />

            {/* INNER CONTENT */}
            <motion.div
                className="relative rounded-[3.5rem] flex flex-col transition-all min-h-[280px] overflow-hidden h-full z-10 bg-white/90 backdrop-blur-md"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
            >
                {/* Header inside Pill */}
                <div className="flex justify-center items-center px-8 py-5 relative z-20">
                    <div className="flex flex-wrap gap-2 items-center justify-center bg-white/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/50 shadow-sm">
                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest flex items-center gap-2">
                            Zahn
                            <span className="text-gray-300">•</span>
                        </span>
                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest flex items-center gap-2">
                            Flächen
                            <span className="text-gray-300">•</span>
                        </span>
                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest flex items-center gap-2">
                            Material
                            <span className="text-gray-300">•</span>
                        </span>
                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                            Standardleistungen
                        </span>
                    </div>
                </div>

                {/* The Input */}
                <div
                    className="flex-1 relative flex items-center justify-center px-8 py-2 cursor-text"
                    onClick={() => textareaRef.current?.focus()}
                >
                    <AnimatePresence>
                        {!value && !isInputFocused && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="absolute inset-0 flex items-center justify-center pointer-events-none pb-16"
                            >
                                <TypeAnimation
                                    sequence={[
                                        'Beginnen Sie zu sprechen...',
                                        2000,
                                        'Oder tippen Sie hier...',
                                        2000,
                                        'Ich höre zu...',
                                        2000
                                    ]}
                                    wrapper="span"
                                    speed={50}
                                    className="text-2xl md:text-3xl font-medium text-gray-400/50 tracking-tight"
                                    repeat={Infinity}
                                    cursor={false}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <textarea
                        ref={textareaRef}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onKeyDown={(e) => {
                            if (onExtract && e.key === 'Enter' && !e.shiftKey && value.trim() && !extracting && !isRecording) {
                                e.preventDefault();
                                onExtract?.();
                            }
                        }}
                        onFocus={() => setIsInputFocused(true)}
                        onBlur={() => setIsInputFocused(false)}
                        className="w-full bg-transparent border-0 text-2xl md:text-3xl font-medium text-gray-800 placeholder-transparent focus:ring-0 focus:outline-none px-4 text-center resize-none outline-none ring-0 relative z-10 overflow-hidden pb-4"
                        style={{ lineHeight: '1.4', maxHeight: '35vh' }}
                        rows={1}
                        autoFocus
                    />
                </div>

                {/* Smart Toggle Bar - Standards (iOS Style) - NOW BELOW INPUT */}
                <AnimatePresence>
                    {standards.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            transition={{ duration: 0.2 }}
                            className="flex flex-wrap gap-2 justify-center px-8 pb-6 relative z-20"
                        >
                            {standards.map((std, index) => {
                                const id = std.id;
                                const label = std.then?.label || std.id;
                                const isActive = !inactiveStandards.includes(id);
                                const hasBilling = std.then?.billingRefs?.length > 0;

                                return (
                                    <motion.button
                                        key={id}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: index * 0.03 }}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.92 }}
                                        onClick={() => onToggleStandard(id)}
                                        className={`
                                            px-4 py-2 rounded-full text-sm font-semibold 
                                            transition-all duration-150 flex items-center gap-1.5
                                            ${isActive
                                                ? 'bg-emerald-500 text-white shadow-md hover:bg-emerald-600'
                                                : 'bg-gray-100/80 text-gray-400 line-through hover:bg-gray-200/80'
                                            }
                                        `}
                                    >
                                        {isActive && (
                                            <span className="w-1.5 h-1.5 bg-white/80 rounded-full" />
                                        )}
                                        {label}
                                        {hasBilling && (
                                            <span className={`text-xs ${isActive ? 'text-emerald-200' : 'text-gray-300'}`}>€</span>
                                        )}
                                    </motion.button>
                                );
                            })}
                        </motion.div>
                    )}
                </AnimatePresence>



                {/* INTEGRATED SMART CONTROL PILL */}
                <div className="flex justify-center pb-6 pt-4 px-8 relative z-30 w-full">
                    <motion.div
                        className="bg-white/95 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.06)] rounded-[2.5rem] border border-gray-100/80 overflow-hidden"
                        initial={{ y: 10, opacity: 0 }}
                        animate={{
                            y: 0,
                            opacity: 1,
                            width: isPillExpanded ? '100%' : 'auto',
                            maxWidth: isPillExpanded ? '600px' : 'auto',
                            borderRadius: isPillExpanded ? '2rem' : '3rem'
                        }}
                        transition={{
                            duration: 0.4,
                            ease: "easeOut",
                            delay: 0.1
                        }}
                    >
                        <div className="flex flex-col">
                            {/* TOP ROW: STANDARD CONTROLS */}
                            <div className="flex items-center gap-2 p-2">
                                {/* Settings Toggle (Left) */}
                                <button
                                    onClick={() => setIsPillExpanded(!isPillExpanded)}
                                    className={`h-11 w-11 flex items-center justify-center rounded-full transition-all ${isPillExpanded ? 'bg-gray-200 text-gray-900' : 'bg-gray-100/50 text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}
                                    title="Erweiterte Einstellungen"
                                >
                                    <FiSliders className="w-5 h-5" />
                                </button>

                                {/* Insurance Switcher */}
                                <div className="flex items-center bg-gray-100/80 rounded-full p-1 h-11">
                                    <button onClick={() => onInsuranceChange('GKV')} className={`px-3 h-full text-xs font-bold rounded-full transition-all ${insuranceType === 'GKV' ? 'bg-white text-[#ff9900] shadow-sm' : 'text-gray-500'}`}>GKV</button>
                                    <button onClick={() => onInsuranceChange('PKV')} className={`px-3 h-full text-xs font-bold rounded-full transition-all ${insuranceType === 'PKV' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>PKV</button>
                                </div>

                                <div className="w-px h-5 bg-gray-200 mx-1"></div>

                                {/* Status Indicator or Actions */}
                                {isTranscribing && (
                                    <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 h-11 rounded-full text-xs font-bold">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                        Transkribiere...
                                    </div>
                                )}

                                {extracting && (
                                    <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 h-11 rounded-full text-xs font-bold">
                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                        Extrahiere...
                                    </div>
                                )}

                                {!isTranscribing && !extracting && (
                                    <>
                                        <button
                                            onClick={handleRecordingToggle}
                                            className={`h-11 w-11 rounded-full flex items-center justify-center transition-all shadow-lg ${isRecording
                                                ? 'bg-red-500 text-white scale-110 ring-4 ring-red-200 animate-pulse'
                                                : 'bg-red-500 text-white hover:bg-red-600 hover:scale-105 shadow-red-200'
                                                }`}
                                            title={isRecording ? 'Aufnahme stoppen' : 'Diktat starten'}
                                        >
                                            <FiMic className="w-5 h-5" />
                                        </button>

                                        {!hideExtractButton && (
                                            <button
                                                onClick={() => onExtract?.()}
                                                disabled={!value.trim() || extracting}
                                                className={`h-11 w-11 rounded-full flex items-center justify-center transition-all shadow-md ${value.trim() && !extracting
                                                    ? 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105'
                                                    : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                                    }`}
                                                title="Daten extrahieren"
                                            >
                                                <FiSend className="w-5 h-5 ml-0.5" />
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* EXPANDED SETTINGS ROW */}
                            <AnimatePresence>
                                {isPillExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden border-t border-gray-200/50 bg-gray-50/30"
                                    >
                                        <div className="p-5 space-y-5">
                                            {/* Material Input */}
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-wider">
                                                    <span>Material</span>
                                                    <button onClick={() => onMaterialChange("")} className="text-[#ff9900] hover:underline">Reset</button>
                                                </div>
                                                <input
                                                    type="text"
                                                    value={manualMaterial}
                                                    onChange={(e) => onMaterialChange(e.target.value)}
                                                    placeholder="z.B. Admira Fusion"
                                                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-gray-200 focus:ring-2 focus:ring-[#ff9900]/20 focus:border-[#ff9900] transition-all text-sm font-medium text-gray-800 placeholder-gray-400 outline-none shadow-sm"
                                                />
                                            </div>

                                            {/* Text Length Selector */}
                                            <div className="space-y-2">
                                                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Textlänge</div>
                                                <div className="flex bg-gray-100/80 rounded-full p-1 gap-1">
                                                    {[
                                                        { id: 'kurz', label: '⚡ Kompakt', desc: 'Minimum' },
                                                        { id: 'mittel', label: '📄 Standard', desc: 'Balanciert' },
                                                        { id: 'lang', label: '📜 Ausführlich', desc: 'Maximum' }
                                                    ].map(len => (
                                                        <button
                                                            key={len.id}
                                                            onClick={() => onTextLengthChange?.(len.id)}
                                                            className={`flex-1 px-3 py-2 text-xs font-bold rounded-full transition-all
                                                                ${textLength === len.id
                                                                    ? 'bg-white shadow-sm text-blue-600'
                                                                    : 'text-gray-500 hover:text-gray-700'}`}
                                                        >
                                                            {len.label}
                                                        </button>
                                                    ))}
                                                </div>
                                                <p className="text-[10px] text-gray-400 text-center">
                                                    {textLength === 'kurz' && 'Minimale Dokumentation, forensisch korrekt'}
                                                    {textLength === 'mittel' && 'Standard-Dokumentation, balanciert'}
                                                    {textLength === 'lang' && 'Ausführliche Dokumentation mit allen Details'}
                                                </p>
                                            </div>

                                            {/* Debug Toggle */}
                                            <div className="pt-2 border-t border-gray-200/50">
                                                <label className="flex items-center gap-3 cursor-pointer group">
                                                    <input
                                                        type="checkbox"
                                                        checked={debugMode}
                                                        onChange={e => setDebugMode(e.target.checked)}
                                                        className="w-4 h-4 rounded border-gray-300 text-purple-500 focus:ring-purple-200"
                                                    />
                                                    <span className="text-xs font-bold text-gray-500 group-hover:text-purple-600 transition-colors">🐛 Debug-Modus aktivieren</span>
                                                </label>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        </motion.div>
    );
}
