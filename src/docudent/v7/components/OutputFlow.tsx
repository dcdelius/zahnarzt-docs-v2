/**
 * OutputFlow — Renders REAL pipeline output (NOT mock data)
 * 
 * Contract:
 * - Receives `output: ComposedOutput` from pipeline
 * - Renders sections, billing codes, and full text
 * - NO hardcoded demo content
 * - Date is current, no invented patient/doctor names
 * 
 * P12.7: Copy uses copyText (if available) for billing-referenced SSOT.
 * Combinability verdict shown as banner if WARN/BLOCK.
 * 
 * Hardening (P0):
 * - Edit button disabled if onEdit undefined (never silently fails)
 * - Type-safe warnings rendering (no `as any`)
 * - Billing diagnostics when codes blocked
 * - pre-wrap for content formatting
 */

import React, { useState } from 'react';
import type { ComposedOutput, ComposedSection, BillingDetail } from '../../contracts/output';
import type { ValidationWarning } from '../../contracts/warnings';
import type { CombinabilityResult } from '../../contracts/compose';

// ═══════════════════════════════════════════════════════════════
// TYPE GUARDS
// ═══════════════════════════════════════════════════════════════

/** Type guard for ValidationWarning objects */
function isValidationWarning(warning: unknown): warning is ValidationWarning {
    return (
        typeof warning === 'object' &&
        warning !== null &&
        'title' in warning &&
        typeof (warning as ValidationWarning).title === 'string'
    );
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

interface OutputFlowProps {
    output: ComposedOutput;
    onReset: () => void;
    onEdit?: () => void;  // Returns to Questions step
    /** P12.7: SSOT copy text from ComposedDocumentV1 (preferred) */
    copyText?: string;
    /** P12.7: Combinability result for banner */
    combinability?: CombinabilityResult;
}

export function OutputFlow({ output, onReset, onEdit, copyText, combinability }: OutputFlowProps) {
    const [billingOpen, setBillingOpen] = useState(false);
    const [blockedOpen, setBlockedOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    // Format current date
    const today = new Date().toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

    // P12.7: Copy uses SSOT copyText if provided, else fallback to fullText
    const textToCopy = copyText ?? output.fullText;

    // Copy full text to clipboard
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(textToCopy);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Copy failed:', err);
        }
    };

    // Handle Edit button
    const handleEdit = () => {
        if (onEdit) {
            onEdit();
        }
    };

    // Edit button state
    const editDisabled = !onEdit;

    // Billing state
    const hasBillingCodes = output.billingCodes && output.billingCodes.length > 0;
    const hasBlockedCodes = output.billingBlocked && output.billingBlocked.length > 0;
    const hasBillingDetails = output.billingDetails && output.billingDetails.length > 0;

    // Render warnings safely (type-safe, no `as any`)
    const renderWarning = (warning: ValidationWarning | string, index: number): React.ReactNode => {
        // String warning (legacy)
        if (typeof warning === 'string') {
            return (
                <li key={`warn-str-${index}`} style={{ fontSize: 14, marginBottom: 4 }}>
                    {warning}
                </li>
            );
        }

        // Object warning (current)
        if (isValidationWarning(warning)) {
            return (
                <li key={warning.id || `warn-obj-${index}`} style={{ fontSize: 14, marginBottom: 8 }}>
                    <strong style={{
                        color: warning.type === 'regress' ? 'var(--v7-red, #c00)' : 'var(--v7-orange)'
                    }}>
                        {warning.title}
                    </strong>
                    {warning.description && (
                        <div style={{ marginTop: 2, fontSize: 13, color: 'var(--v7-ink-soft)' }}>
                            {warning.description}
                        </div>
                    )}
                </li>
            );
        }

        // Unknown type - render as JSON for debugging
        console.warn('[OutputFlow] Unknown warning type:', warning);
        return (
            <li key={`warn-unknown-${index}`} style={{ fontSize: 14, marginBottom: 4, color: 'var(--v7-ink-soft)' }}>
                {JSON.stringify(warning)}
            </li>
        );
    };

    // Render billing detail row
    const renderBillingDetail = (detail: BillingDetail, index: number) => (
        <li
            key={detail.code || index}
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 14,
                borderBottom: '1px solid var(--v7-hairline)',
                paddingBottom: 8
            }}
        >
            <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{detail.code}</span>
            {detail.label && (
                <span style={{ color: 'var(--v7-ink-soft)', marginLeft: 12 }}>{detail.label}</span>
            )}
            {detail.amount !== undefined && (
                <span style={{ fontWeight: 500 }}>{detail.amount.toFixed(2)} €</span>
            )}
        </li>
    );

    return (
        <div className="v7">
            <div className="v7-bg" />

            <div className="v7-container" style={{ maxWidth: 880 }}>

                {/* Top Action Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: 40 }}>
                    <div className="v7-kicker">FERTIGGESTELLT</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            className="v7-pill"
                            onClick={handleCopy}
                            data-testid="copy-button"
                        >
                            {copied ? '✓ Kopiert' : 'Kopieren'}
                        </button>
                        <button
                            className="v7-pill"
                            onClick={handleEdit}
                            disabled={editDisabled}
                            data-testid="edit-button"
                            style={{
                                opacity: editDisabled ? 0.5 : 1,
                                cursor: editDisabled ? 'not-allowed' : 'pointer'
                            }}
                            title={editDisabled ? 'Bearbeiten nicht verfügbar' : 'Zurück zu Fragen'}
                        >
                            Bearbeiten
                        </button>
                        <button className="v7-pill" onClick={onReset} data-testid="reset-button">
                            Neuer Fall
                        </button>
                    </div>
                </div>

                {/* Paper Sheet */}
                <div
                    style={{
                        background: 'var(--v7-cream-2)',
                        padding: '44px 50px',
                        borderRadius: 'var(--v7-r-xl)',
                        border: '1px solid rgba(20,12,10,0.06)',
                        boxShadow: 'var(--v7-shadow-soft)',
                        position: 'relative'
                    }}
                    data-testid="output-paper"
                >
                    {/* Header — treatment documentation, NO patient identifiers */}
                    <header style={{ marginBottom: 40, paddingBottom: 24, borderBottom: '1px solid var(--v7-hairline)' }} data-testid="output-header">
                        <h1 className="v7-h1" style={{ fontSize: 32, marginBottom: 8, color: 'var(--v7-ink)', textShadow: 'none' }}>
                            Dokumentation
                        </h1>
                        <div style={{ fontSize: 14, color: 'var(--v7-ink-soft)' }}>
                            <span data-testid="header-date">{today}</span>
                        </div>
                    </header>

                    {/* P12.8a: Combinability Banner - WARN or BLOCK verdict */}
                    {combinability && combinability.verdict !== 'PASS' && (
                        <div
                            data-testid={`combinability-banner-${combinability.verdict.toLowerCase()}`}
                            style={{
                                padding: 16,
                                marginBottom: 24,
                                borderRadius: 'var(--v7-r-md)',
                                background: combinability.verdict === 'BLOCK'
                                    ? 'rgba(180, 50, 50, 0.12)'
                                    : 'rgba(255, 180, 0, 0.15)',
                                border: `1px solid ${combinability.verdict === 'BLOCK'
                                    ? 'rgba(180, 50, 50, 0.3)'
                                    : 'rgba(255, 180, 0, 0.4)'}`,
                            }}
                        >
                            <div style={{ fontWeight: 600, marginBottom: 8, color: combinability.verdict === 'BLOCK' ? 'var(--v7-red, #b43232)' : 'var(--v7-orange)' }}>
                                {combinability.verdict === 'BLOCK' ? '⛔ Kombinationskonflikt' : '⚠️ Abrechnungswarnung'}
                            </div>
                            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14 }}>
                                {combinability.conflicts.map((conflict, i) => (
                                    <li
                                        key={conflict.ruleId || i}
                                        data-testid="combinability-conflict-row"
                                        style={{ marginBottom: 4 }}
                                    >
                                        <strong>{conflict.codeA}</strong> + <strong>{conflict.codeB}</strong>: {conflict.reason}
                                    </li>
                                ))}
                            </ul>
                            {combinability.requiredJustifications.length > 0 && (
                                <div style={{ marginTop: 12, fontSize: 13, color: 'var(--v7-ink-soft)' }}>
                                    <strong>Erforderliche Begründung:</strong> {combinability.requiredJustifications.join(', ')}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Dynamic Content Sections from Pipeline */}
                    {output.sections && output.sections.length > 0 ? (
                        output.sections.map((section: ComposedSection) => (
                            <section
                                key={section.id}
                                style={{ marginBottom: 32 }}
                                data-testid={`section-${section.id}`}
                            >
                                <div className="v7-kicker" style={{ marginBottom: 8 }}>
                                    {section.label.toUpperCase()}
                                </div>
                                <div style={{
                                    fontSize: 16,
                                    lineHeight: 1.6,
                                    color: 'var(--v7-ink)',
                                    whiteSpace: 'pre-wrap'
                                }}>
                                    {section.content}
                                </div>
                            </section>
                        ))
                    ) : (
                        // Fallback: render fullText if no sections
                        <section style={{ marginBottom: 32 }}>
                            <div className="v7-kicker" style={{ marginBottom: 8 }}>DOKUMENTATION</div>
                            <div
                                style={{
                                    fontSize: 16,
                                    lineHeight: 1.6,
                                    color: 'var(--v7-ink)',
                                    whiteSpace: 'pre-wrap'
                                }}
                                data-testid="output-fulltext"
                            >
                                {output.fullText}
                            </div>
                        </section>
                    )}

                    {/* Billing Section */}
                    <section style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid var(--v7-hairline)' }}>
                        {hasBillingCodes || hasBillingDetails ? (
                            <>
                                <button
                                    onClick={() => setBillingOpen(!billingOpen)}
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: 0
                                    }}
                                    data-testid="billing-toggle"
                                >
                                    <div className="v7-kicker" style={{ color: 'var(--v7-orange)' }}>
                                        {billingOpen ? 'ABRECHNUNG VERBERGEN' : 'ABRECHNUNG ANZEIGEN'}
                                    </div>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--v7-ink-soft)' }}>
                                        {(output.billingDetails?.length || output.billingCodes?.length || 0)} Position{(output.billingDetails?.length || output.billingCodes?.length || 0) !== 1 ? 'en' : ''}
                                    </div>
                                </button>

                                {billingOpen && (
                                    <div style={{ marginTop: 20 }} data-testid="billing-list">
                                        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 12 }}>
                                            {/* Prefer billingDetails if available */}
                                            {hasBillingDetails ? (
                                                output.billingDetails!.map(renderBillingDetail)
                                            ) : (
                                                output.billingCodes.map((code, i) => (
                                                    <li
                                                        key={i}
                                                        style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            fontSize: 14,
                                                            borderBottom: '1px solid var(--v7-hairline)',
                                                            paddingBottom: 8
                                                        }}
                                                    >
                                                        <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{code}</span>
                                                    </li>
                                                ))
                                            )}
                                        </ul>
                                    </div>
                                )}
                            </>
                        ) : (
                            // No billing codes - show calm message with diagnostics
                            <div data-testid="no-billing-message">
                                <div className="v7-kicker" style={{ color: 'var(--v7-ink-soft)', marginBottom: 8 }}>
                                    ABRECHNUNG
                                </div>
                                <p style={{ fontSize: 14, color: 'var(--v7-ink-soft)', margin: 0 }}>
                                    Keine abrechnungsrelevanten Positionen ermittelt.
                                </p>

                                {/* Show reason if available */}
                                {output.billingReason && (
                                    <p style={{ fontSize: 12, color: 'var(--v7-ink-muted)', marginTop: 4 }}>
                                        Grund: {output.billingReason}
                                    </p>
                                )}

                                {/* Show blocked codes if available */}
                                {hasBlockedCodes && (
                                    <div style={{ marginTop: 12 }}>
                                        <button
                                            onClick={() => setBlockedOpen(!blockedOpen)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: 0,
                                                fontSize: 12,
                                                color: 'var(--v7-orange)',
                                                textDecoration: 'underline'
                                            }}
                                            data-testid="blocked-toggle"
                                        >
                                            {blockedOpen ? 'Geblockte Codes verbergen' : `${output.billingBlocked!.length} geblockte Position(en) anzeigen`}
                                        </button>

                                        {blockedOpen && (
                                            <ul
                                                style={{
                                                    marginTop: 8,
                                                    paddingLeft: 16,
                                                    fontSize: 12,
                                                    color: 'var(--v7-ink-muted)'
                                                }}
                                                data-testid="blocked-list"
                                            >
                                                {output.billingBlocked!.map((code, i) => (
                                                    <li key={i} style={{ fontFamily: 'monospace' }}>{code}</li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                )}

                                <p style={{ fontSize: 12, color: 'var(--v7-ink-muted)', marginTop: 8 }}>
                                    Falls Angaben fehlen, bitte über "Bearbeiten" ergänzen.
                                </p>
                            </div>
                        )}
                    </section>

                    {/* Warnings section */}
                    {output.warnings && output.warnings.length > 0 && (
                        <section
                            style={{ marginTop: 32, padding: 16, background: 'rgba(255,180,0,0.1)', borderRadius: 12 }}
                            data-testid="warnings-section"
                        >
                            <div className="v7-kicker" style={{ marginBottom: 8, color: 'var(--v7-orange)' }}>
                                HINWEISE
                            </div>
                            <ul style={{ margin: 0, paddingLeft: 20 }}>
                                {output.warnings.map((warning, i) => renderWarning(warning, i))}
                            </ul>
                        </section>
                    )}

                </div>

            </div>
        </div>
    );
}
