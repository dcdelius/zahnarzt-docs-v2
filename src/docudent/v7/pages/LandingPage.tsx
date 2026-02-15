import React from 'react';
import { Link } from 'react-router-dom';
import { SoftGradientBackground } from '../components/SoftGradientBackground';

/**
 * LandingPage - Strictly Jeton Layout with DocuDent Content
 */
export default function LandingPage() {
    return (
        <div className="v7">
            {/* Soft Gradient Background */}
            <SoftGradientBackground />

            {/* Noise/Grain Overlay */}
            <div className="v7-bg" />

            {/* 1. Jeton Top Nav (Logo Left, V10/Login Right) */}
            <nav className="v7-jeton-nav">
                <Link to="/docudent/v7" className="v7-jeton-logo">DOCUDENT</Link>

                <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                    <Link to="/docudent/v10" style={{
                        color: 'var(--v7-ink)',
                        textDecoration: 'none',
                        fontWeight: 600,
                        fontSize: '15px',
                        fontFamily: 'var(--v7-font-body)',
                        opacity: 0.6
                    }}>
                        V10
                    </Link>
                    <Link to="/docudent/v7/lab">
                        <button className="v7-jeton-btn-white">Login</button>
                    </Link>
                </div>
            </nav>

            {/* 2. Main Hero (Centered, Clean) */}
            <div className="v7-jeton-hero">
                <div className="v7-jeton-container">

                    {/* Kicker */}
                    <div className="v7-jeton-kicker">
                        INTELLIGENT DENTAL AI
                    </div>

                    {/* Headline: Huge & Bold */}
                    <h1 className="v7-jeton-h1">
                        Intelligent<br />
                        Documentation
                    </h1>

                    {/* Lead Text */}
                    <p className="v7-jeton-lead">
                        Transforms specialized dental dictation into compliant,<br />
                        billing-ready documentation instantly.
                    </p>

                    {/* Primary CTA - Big White Pill Style */}
                    <div className="v7-jeton-actions">
                        <Link to="/docudent/v7">
                            <button className="v7-jeton-btn-white" style={{
                                height: '56px',
                                padding: '0 40px',
                                fontSize: '17px',
                                boxShadow: '0 8px 24px rgba(235, 77, 102, 0.25)'
                            }}>
                                Zur Dokumentation
                            </button>
                        </Link>
                    </div>



                </div>
            </div>

            {/* 3. Bottom Floating Dock (Navigation) */}
            <div className="v7-jeton-dock">
                <Link to="/docudent/v7" className="v7-jeton-dock-item active">Dokumentation</Link>
                <Link to="/docudent/v7/cases" className="v7-jeton-dock-item">Fälle</Link>
                <Link to="/docudent/v7/settings" className="v7-jeton-dock-item">Einstellungen</Link>
                <Link to="/docudent/v7/team" className="v7-jeton-dock-item">Team</Link>
            </div>
        </div>
    );
}
