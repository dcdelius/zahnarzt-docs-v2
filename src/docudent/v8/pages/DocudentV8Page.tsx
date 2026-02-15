/**
 * V8 Page — The "Jeton" Experience
 * 
 * Logic: Inherits useV7Pipeline (100% feature parity)
 * UI: Implements "Jeton Layout" (Bottom-Left, Huge Type, Floating Dock)
 *     Richness: Uses V7's HeroSculpture, Selectors, and Visual Layers.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

// LOGIC HOOK (Inherited from V7)
import { useV7Pipeline, type InsuranceType, type TextLength } from '../../v7/hooks/useV7Pipeline';

// DESIGN COMPONENTS & LAYERS
import { SoftGradientBackground } from '../../v7/components/SoftGradientBackground';
import { HeroSculpture } from '../../v7/components/HeroSculpture';

// CONTROLS (Re-using V7's rich components)
import { TreatmentSelector, getTreatmentPlaceholder, type TreatmentType } from '../../v7/components/TreatmentSelector';
import { V8TextLengthSelector } from '../components/V8TextLengthSelector';
import { V8InsuranceSelector } from '../components/V8InsuranceSelector';

export default function DocudentV8Page() {
    // 1. Logic Layer (V7 Engine)
    const {
        dictation,
        setDictation,
        isProcessing,
        currentState,
        runPipeline,
        reset,
        // State for selectors managed by hook if possible, or we wire it up
        insuranceType,
        setInsuranceType,
        textLength,
        setTextLength,
        hasMKV,
        setHasMKV
    } = useV7Pipeline();

    // 2. Local State (Treatment selection is local in V7 Page pattern)
    // We persist it to localStorage just like V7 did to be user-friendly
    const [treatment, setTreatment] = useState<TreatmentType>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('v7_treatment'); // Share same pref as V7
            if (saved && ['fuellung', 'kontrolle', 'pzr', 'endo', 'extraktion', 'par', 'ze'].includes(saved)) {
                return saved as TreatmentType;
            }
        }
        return 'fuellung';
    });

    const handleTreatmentChange = (t: TreatmentType) => {
        setTreatment(t);
        localStorage.setItem('v7_treatment', t);
    };

    const [isRecording, setIsRecording] = useState(false);

    // 3. Handlers
    const handleMicClick = () => {
        setIsRecording(!isRecording);
        // Toggle logic (simplified for V8 scaffold)
        // In real V7 this interacted with SpeechRecognition. 
        // For V8 Prototype we simulate state.
    };

    return (
        <div className="v7">
            {/* Background Layers */}
            <SoftGradientBackground />
            <div className="v7-bg" />

            {/* Hero Sculpture - The "Richness" Layer */}
            {/* Positioned ABSOLUTE in background to not block layout flow */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
                <HeroSculpture isRecording={isRecording} />
            </div>

            {/* Navigation (Jeton Style) */}
            <nav className="v7-jeton-nav">
                <Link to="/docudent/v8" className="v7-jeton-logo">DOCUDENT V8</Link>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {/* Placeholder for status or user */}
                </div>
            </nav>

            {/* ═══════════════════════════════════════════════════════════════
                TOP CENTER CONTROLS CLUSTER
                Floating Glass Bar with high Z-Index
            ═══════════════════════════════════════════════════════════════ */}
            <div style={{
                position: 'absolute',
                top: '40px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 50,
                display: 'flex',
                alignItems: 'center',
                gap: '24px',
                // Glass backdrop
                background: 'rgba(255,255,255,0.05)',
                padding: '12px 20px',
                paddingRight: '32px',
                borderRadius: '999px', // Fully pill-shaped for top placement
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                width: 'fit-content',
                border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
            }}>
                {/* 1. Treatment Dropdown (V7 Component) */}
                <TreatmentSelector value={treatment} onChange={handleTreatmentChange} />

                {/* Divider */}
                <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.15)' }} />

                {/* 2. Insurance Toggle (V8 Jeton Style) */}
                <div style={{ opacity: 1 }}>
                    <V8InsuranceSelector
                        insuranceType={insuranceType}
                        hasMKV={hasMKV}
                        onInsuranceChange={setInsuranceType}
                        onMKVChange={setHasMKV}
                    />
                </div>

                {/* Divider */}
                <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.15)' }} />

                {/* 3. Text Length Slider (V8 Jeton Style) */}
                <div style={{ opacity: 1 }}>
                    <V8TextLengthSelector value={textLength} onChange={setTextLength} />
                </div>
            </div>

            {/* MAIN LAYOUT: Jeton Bottom-Left */}
            <div className="v7-jeton-hero">
                <div className="v7-jeton-container" style={{ position: 'relative', zIndex: 10 }}>

                    {/* MOOD / KICKER */}
                    <div className="v7-jeton-kicker">
                        INTELLIGENT DOCUMENTATION
                    </div>

                    {/* HEADLINE */}
                    <h1 className="v7-jeton-h1">
                        Was wurde<br />
                        durchgeführt?
                    </h1>

                    {/* INPUT ZONE (Invisible Textarea with huge type) */}
                    <div className="v7-jeton-lead" style={{ position: 'relative' }}>
                        <textarea
                            value={dictation}
                            onChange={(e) => setDictation(e.target.value)}
                            placeholder={getTreatmentPlaceholder(treatment)}
                            style={{
                                width: '100%',
                                background: 'transparent',
                                border: 'none',
                                color: 'white',
                                fontSize: 'inherit',
                                fontFamily: 'inherit',
                                resize: 'none',
                                outline: 'none',
                                minHeight: '120px',
                                lineHeight: '1.4'
                            }}
                            rows={3}
                        />
                        {/* Focus/Recording Line Animation */}
                        <motion.div
                            animate={{
                                width: isRecording ? '100%' : '0%',
                                opacity: isRecording ? 1 : 0.3
                            }}
                            style={{
                                height: '2px',
                                background: 'white',
                                marginTop: '16px',
                                boxShadow: '0 0 20px rgba(255,255,255,0.5)'
                            }}
                        />
                    </div>

                </div>
            </div>

            {/* FLOATING ACTION DOCK */}
            <div className="v7-jeton-dock">
                <button
                    className={`v7-jeton-dock-item ${isRecording ? 'active' : ''}`}
                    onClick={handleMicClick}
                    style={{ minWidth: '120px', display: 'flex', justifyContent: 'center', gap: '8px' }}
                >
                    {isRecording && <span className="animate-pulse">●</span>}
                    {isRecording ? 'Stop' : 'Aufnahme'}
                </button>

                {dictation.length > 0 && !isRecording && (
                    <button
                        className="v7-jeton-dock-item"
                        onClick={runPipeline}
                        style={{ background: 'white', color: '#FA7366' }}
                    >
                        Dokumentieren
                    </button>
                )}

                {/* Navigation Links in Dock */}
                <Link to="/docudent/v8/cases" className="v7-jeton-dock-item">Fälle</Link>
                <Link to="/docudent/v8/settings" className="v7-jeton-dock-item">Einstellungen</Link>
            </div>

        </div>
    );
}
