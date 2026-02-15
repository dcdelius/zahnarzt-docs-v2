import React from 'react';
import { Link } from 'react-router-dom';
import { PillButton } from '../components/PillButton';

export default function TemplateSettings() {
    // Mock Data
    const TEMPLATES = [
        { id: 't1', name: 'Wurzelbehandlung (Kasse)', type: 'billing', active: true, desc: 'Standard BEMA sequence for endo.' },
        { id: 't2', name: 'Wurzelbehandlung (Privat)', type: 'billing', active: true, desc: 'GOZ comprehensive workflow.' },
        { id: 't3', name: 'Füllungstherapie', type: 'doc', active: false, desc: 'Simple documentation text blocks.' },
    ];

    return (
        <div className="v7">
            <div className="v7-bg" />

            <div className="v7-container" style={{ maxWidth: 880 }}>

                {/* Header */}
                <div style={{ marginBottom: 40, marginTop: 40 }}>
                    <Link to="/docudent" style={{ textDecoration: 'none' }}>
                        <div className="v7-kicker" style={{ marginBottom: 12, cursor: 'pointer' }}>← ZURÜCK</div>
                    </Link>
                    <h1 className="v7-h1" style={{ fontSize: 48, color: 'var(--v7-ink)', textShadow: 'none' }}>Vorlagen</h1>
                    <p className="v7-lead" style={{ marginTop: 16, color: 'var(--v7-ink-soft)' }}>
                        Verwalten Sie Ihre Standard-Abläufe für Dokumentation und Abrechnung.
                    </p>
                </div>

                {/* Editorial List */}
                <div style={{ borderTop: '1px solid var(--v7-hairline)' }}>
                    {TEMPLATES.map((t, i) => (
                        <div
                            key={t.id}
                            style={{
                                display: 'grid', gridTemplateColumns: '1fr auto', gap: 18,
                                padding: '24px 0', borderBottom: '1px solid var(--v7-hairline)',
                                alignItems: 'center'
                            }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <h3 style={{ margin: 0, fontSize: 17, fontFamily: 'var(--v7-font-body)' }}>{t.name}</h3>
                                    <span
                                        style={{
                                            borderRadius: '999px', padding: '4px 8px', fontSize: 10, fontWeight: 700,
                                            border: '1px solid var(--v7-hairline)', background: 'rgba(255,255,255,0.6)'
                                        }}
                                    >
                                        {t.type === 'billing' ? 'ABRECHNUNG' : 'DOKUMENTATION'}
                                    </span>
                                </div>
                                <p style={{ margin: 0, fontSize: 13, color: 'var(--v7-ink-soft)' }}>{t.desc}</p>
                            </div>

                            <div style={{ display: 'flex', gap: 6 }}>
                                <button className="v7-pill" style={{ background: t.active ? 'var(--v7-ink)' : '', color: t.active ? 'white' : '' }}>
                                    {t.active ? 'Aktiv' : 'Inaktiv'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Floating Action */}
                <div style={{ marginTop: 40, display: 'flex', justifyContent: 'center' }}>
                    <PillButton variant="cta">Neue Vorlage erstellen</PillButton>
                </div>

            </div>
        </div>
    );
}
