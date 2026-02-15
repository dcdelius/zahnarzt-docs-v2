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
 * - Type-safe warnings rendering (no `as any`)
 * - Billing diagnostics when codes blocked
 * - pre-wrap for content formatting
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { ComposedOutput, ComposedSection, BillingDetail } from '../../contracts/output';
import type { CombinabilityResult } from '../../contracts/compose';
import { colors, gradients, radii, shadows, spacing, typography, motion as motionTokens } from '../styles/tokens';
import { V10StageHeader } from './V10StageHeader';

// ═══════════════════════════════════════════════════════════════
// BILLING GROUPING (Gigaprompt 6)
// ═══════════════════════════════════════════════════════════════

interface GroupedBillingCode {
    code: string;
    count: number;
    system: 'BEMA' | 'GOZ' | 'OTHER';
}

/**
 * Group billing codes by code and count duplicates.
 * BEMA codes sorted before GOZ codes.
 */
function groupBillingCodes(billingCodes: string[]): GroupedBillingCode[] {
    const countMap = new Map<string, number>();

    for (const code of billingCodes) {
        countMap.set(code, (countMap.get(code) || 0) + 1);
    }

    const grouped: GroupedBillingCode[] = [];
    for (const [code, count] of countMap.entries()) {
        const system = code.startsWith('BEMA_') ? 'BEMA'
            : code.startsWith('GOZ_') ? 'GOZ'
                : 'OTHER';
        grouped.push({ code, count, system });
    }

    // Sort: BEMA first, then GOZ, then by code
    grouped.sort((a, b) => {
        if (a.system !== b.system) {
            const order = { 'BEMA': 0, 'GOZ': 1, 'OTHER': 2 };
            return order[a.system] - order[b.system];
        }
        return a.code.localeCompare(b.code);
    });

    return grouped;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

interface OutputFlowProps {
    output: ComposedOutput;
    onReset: () => void;
    onEdit?: () => void;  // Returns to review step
    /** P12.7: SSOT copy text from ComposedDocumentV1 (preferred) */
    copyText?: string;
    /** P12.7: Combinability result for banner */
    combinability?: CombinabilityResult;
}

export function OutputFlow({ output, onReset, onEdit, copyText, combinability }: OutputFlowProps) {
    const [billingOpen, setBillingOpen] = useState(false);
    const [blockedOpen, setBlockedOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const hasEdit = Boolean(onEdit);

    // Format current date
    const today = new Date().toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

    // P12.7: Copy uses SSOT copyText if provided, else fallback to output.copyText/fullText
    const textToCopy = copyText ?? output.copyText ?? output.fullText;

    const handleEdit = () => {
        if (onEdit) onEdit();
    };

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

    // Billing state
    const hasBillingCodes = output.billingCodes && output.billingCodes.length > 0;
    const hasBlockedCodes = output.billingBlocked && output.billingBlocked.length > 0;
    const hasBillingDetails = output.billingDetails && output.billingDetails.length > 0;

    const billingSourceCodes = hasBillingDetails
        ? output.billingDetails!.map(d => d.code)
        : output.billingCodes;

    const billingPreview = (() => {
        const bema = billingSourceCodes.filter(c => c.startsWith('BEMA_')).length;
        const goz = billingSourceCodes.filter(c => c.startsWith('GOZ_')).length;
        return { total: billingSourceCodes.length, bema, goz };
    })();

    // Render billing detail row
	    const renderBillingDetail = (detail: BillingDetail, index: number) => (
	        <li
	            key={detail.code || index}
	            style={{
	                display: 'flex',
	                justifyContent: 'space-between',
	                fontSize: 14,
	                borderBottom: `1px solid ${colors.lineDivider}`,
	                paddingBottom: 10,
	                gap: 12,
	            }}
	        >
	            <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{detail.code}</span>
	            {detail.label && (
	                <span style={{ color: colors.textSecondary, flex: 1 }}>{detail.label}</span>
	            )}
	            {detail.amount !== undefined && (
	                <span style={{ fontWeight: 600 }}>{detail.amount.toFixed(2)} €</span>
	            )}
	        </li>
	    );

    const cardStyle: React.CSSProperties = {
        padding: spacing.xxl,
        borderRadius: radii.card,
        background: colors.surfaceGlass,
        boxShadow: shadows.barDefault,
        backdropFilter: 'blur(16px)',
    };

    const sectionTitleStyle: React.CSSProperties = {
        fontSize: typography.label,
        fontWeight: typography.semibold,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: colors.textSecondary,
        marginBottom: spacing.sm,
    };

    const sectionBodyStyle: React.CSSProperties = {
        fontSize: 18,
        lineHeight: 1.75,
        color: colors.textPrimary,
        whiteSpace: 'pre-wrap',
    };

    const softRuleStyle: React.CSSProperties = {
        height: 1,
        width: '100%',
        background: `linear-gradient(90deg, transparent, ${colors.lineDivider}, transparent)`,
        margin: `${spacing.xl} 0`,
    };

    const primaryButtonStyle: React.CSSProperties = {
        padding: '12px 20px',
        borderRadius: radii.pill,
        border: 'none',
        background: gradients.button,
        color: colors.textPrimary,
        fontSize: '14px',
        fontWeight: typography.semibold,
        cursor: 'pointer',
        boxShadow: shadows.buttonDefault,
        backdropFilter: 'blur(16px)',
    };

    const ghostButtonStyle: React.CSSProperties = {
        padding: '12px 20px',
        borderRadius: radii.pill,
        border: `1px solid ${colors.lineSoft}`,
        background: 'transparent',
        color: colors.textSecondary,
        fontSize: '14px',
        fontWeight: typography.semibold,
        cursor: 'pointer',
        backdropFilter: 'blur(16px)',
    };

    return (
        <div className="v7-container" style={{ maxWidth: 980, paddingTop: spacing.xxxl }} data-testid="output-root">
            <header style={{ marginBottom: spacing.xxl }} data-testid="output-header">
                <V10StageHeader
                    kicker="Output"
                    title="Behandlungsdokumentation"
                    subtitle={(
                        <>
                            <span data-testid="header-date">{today}</span>
                            <span style={{ margin: `0 ${spacing.sm}` }}>·</span>
                            <strong>BEMA {billingPreview.bema}</strong> · <strong>GOZ {billingPreview.goz}</strong>
                            {billingPreview.total > 0 ? ` · ${billingPreview.total} Codes` : ''}
                        </>
                    )}
                    right={(
                        <>
                            <motion.button
                                whileHover={{ y: -1 }}
                                whileTap={{ scale: 0.98 }}
                                style={primaryButtonStyle}
                                onClick={handleCopy}
                                data-testid="copy-button"
                            >
                                {copied ? 'Kopiert' : 'Kopieren'}
                            </motion.button>
                            <motion.button
                                whileHover={{ y: -1 }}
                                whileTap={{ scale: 0.98 }}
                                style={{
                                    ...ghostButtonStyle,
                                    cursor: hasEdit ? 'pointer' : 'not-allowed',
                                    opacity: hasEdit ? 1 : 0.55,
                                }}
                                onClick={handleEdit}
                                disabled={!hasEdit}
                                data-testid="edit-button"
                            >
                                Bearbeiten
                            </motion.button>
                            <motion.button
                                whileHover={{ y: -1 }}
                                whileTap={{ scale: 0.98 }}
                                style={ghostButtonStyle}
                                onClick={onReset}
                                data-testid="reset-button"
                            >
                                Neuer Fall
                            </motion.button>
                        </>
                    )}
                />
            </header>

            {/* P12.8a: Combinability Banner - WARN or BLOCK verdict */}
            {combinability && combinability.verdict !== 'PASS' && (
                <div
                    data-testid={`combinability-banner-${combinability.verdict.toLowerCase()}`}
                    style={{
                        ...cardStyle,
                        padding: spacing.lg,
                        borderRadius: radii.cardSmall,
                        marginBottom: spacing.xxl,
                        border: `1px solid ${combinability.verdict === 'BLOCK'
                            ? 'rgba(239, 68, 68, 0.35)'
                            : 'rgba(249, 115, 22, 0.35)'}`,
                    }}
                >
                    <div style={{ fontWeight: typography.semibold, color: combinability.verdict === 'BLOCK' ? '#fecaca' : '#ffedd5' }}>
                        {combinability.verdict === 'BLOCK' ? 'Kombinationskonflikt' : 'Abrechnungswarnung'}
                    </div>
                    <div style={{ marginTop: spacing.xs, color: colors.textSecondary, fontSize: typography.bodySmall }}>
                        {combinability.conflicts.length > 0
                            ? combinability.conflicts.map((conflict, i) => (
                                <span key={conflict.ruleId || i} data-testid="combinability-conflict-row">
                                    {conflict.codeA} + {conflict.codeB} ({conflict.reason}){i < combinability.conflicts.length - 1 ? ', ' : ''}
                                </span>
                            ))
                            : (combinability.warnings && combinability.warnings.length > 0
                                ? combinability.warnings.join(' ')
                                : 'Bitte prüfen.')}
                    </div>
                </div>
            )}

            <div style={cardStyle} data-testid="output-sections-card">
                <div data-testid="v10-output-text">
                    {/* Dynamic Content Sections from Pipeline */}
                    {output.sections && output.sections.length > 0 ? (
                        output.sections.map((section: ComposedSection, index: number) => (
                            <motion.section
                                key={section.id}
                                style={{ marginBottom: 0 }}
                                data-testid={`section-${section.id}`}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: motionTokens.durationSmall, ease: motionTokens.easing }}
                            >
                                <div style={sectionTitleStyle}>
                                    {section.label.toUpperCase()}
                                </div>
                                <div style={sectionBodyStyle}>
                                    {section.content}
                                </div>
                                {index < output.sections.length - 1 && <div style={softRuleStyle} />}
                            </motion.section>
                        ))
                    ) : (
                        <section>
                            <div style={sectionTitleStyle}>DOKUMENTATION</div>
                            <div style={sectionBodyStyle} data-testid="output-fulltext">
                                {output.fullText}
                            </div>
                        </section>
                    )}
                </div>
            </div>

            {/* Billing Section */}
            <section style={{ marginTop: spacing.xxl }}>
                <div style={cardStyle} data-testid="billing-card">
                    {hasBillingCodes || hasBillingDetails ? (
                        <>
                            <button
                                type="button"
                                onClick={() => setBillingOpen(!billingOpen)}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: 0,
                                }}
                                data-testid="billing-toggle"
                            >
                                <div>
                                    <div style={sectionTitleStyle}>Abrechnung</div>
                                    <div style={{ fontSize: typography.bodySmall, color: colors.textSecondary }}>
                                        {billingPreview.total} Position{billingPreview.total !== 1 ? 'en' : ''} · BEMA {billingPreview.bema} · GOZ {billingPreview.goz}
                                    </div>
                                </div>
                                <div
                                    style={{
                                        padding: '8px 14px',
                                        borderRadius: radii.pill,
                                        background: colors.surfaceGlassActive,
                                        color: colors.textSecondary,
                                        fontWeight: typography.semibold,
                                        boxShadow: shadows.cardSoft,
                                        backdropFilter: 'blur(14px)',
                                    }}
                                >
                                    {billingOpen ? 'Verbergen' : 'Anzeigen'}
                                </div>
                            </button>

                            <div style={{ marginTop: spacing.lg }} data-testid="v10-billing-codes">
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm }}>
                                    {groupBillingCodes(billingSourceCodes).map(grouped => (
                                        <span
                                            key={`${grouped.system}:${grouped.code}`}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                padding: '6px 10px',
                                                borderRadius: radii.pill,
                                                background: colors.surfaceGlassActive,
                                                color: colors.textSecondary,
                                                fontSize: typography.caption,
                                                fontWeight: typography.semibold,
                                                letterSpacing: '0.02em',
                                            }}
                                        >
                                            <span style={{ fontFamily: 'monospace', color: colors.textPrimary }}>
                                                {grouped.count > 1 ? `${grouped.count}× ` : ''}{grouped.code}
                                            </span>
                                            <span style={{ fontSize: 11, color: grouped.system === 'BEMA' ? colors.textSecondary : colors.coralAccent }}>
                                                {grouped.system}
                                            </span>
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {billingOpen ? (
                                <div style={{ marginTop: spacing.xl }} data-testid="billing-list">
                                    <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: spacing.md }} data-testid="v10-billing-grouped">
                                        {hasBillingDetails ? (
                                            output.billingDetails!.map(renderBillingDetail)
                                        ) : (
                                            groupBillingCodes(output.billingCodes).map(grouped => (
                                                <li
                                                    key={`${grouped.system}:${grouped.code}`}
                                                    style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        fontSize: 14,
                                                        borderBottom: `1px solid ${colors.lineDivider}`,
                                                        paddingBottom: 10,
                                                        color: colors.textPrimary,
                                                    }}
                                                >
                                                    <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                                                        {grouped.count > 1 ? `${grouped.count}× ` : ''}{grouped.code}
                                                    </span>
                                                    <span style={{
                                                        fontSize: 11,
                                                        color: grouped.system === 'BEMA' ? colors.textSecondary : colors.coralAccent,
                                                        fontWeight: 500,
                                                    }}>
                                                        {grouped.system}
                                                    </span>
                                                </li>
                                            ))
                                        )}
                                    </ul>
                                </div>
                            ) : null}
                        </>
                    ) : (
                        <div data-testid="no-billing-message">
                            <div style={sectionTitleStyle}>Abrechnung</div>
                            <p style={{ fontSize: typography.bodySmall, color: colors.textSecondary, margin: 0 }}>
                                Keine abrechnungsrelevanten Positionen ermittelt.
                            </p>

                            {output.billingReason ? (
                                <p style={{ fontSize: typography.caption, color: colors.textSubtle, marginTop: spacing.xs }}>
                                    Grund: {output.billingReason}
                                </p>
                            ) : null}

                            {hasBlockedCodes ? (
                                <div style={{ marginTop: spacing.lg }}>
                                    <button
                                        type="button"
                                        onClick={() => setBlockedOpen(!blockedOpen)}
                                        style={{
                                            padding: 0,
                                            border: 'none',
                                            background: 'transparent',
                                            cursor: 'pointer',
                                            fontSize: typography.caption,
                                            color: colors.coralAccent,
                                            fontWeight: typography.semibold,
                                            textDecoration: 'underline',
                                        }}
                                        data-testid="blocked-toggle"
                                    >
                                        {blockedOpen ? 'Geblockte Codes verbergen' : `${output.billingBlocked!.length} geblockte Position(en) anzeigen`}
                                    </button>

                                    {blockedOpen ? (
                                        <ul
                                            style={{
                                                marginTop: spacing.sm,
                                                paddingLeft: 16,
                                                fontSize: typography.caption,
                                                color: colors.textSecondary,
                                            }}
                                            data-testid="blocked-list"
                                        >
                                            {output.billingBlocked!.map((code) => (
                                                <li key={code} style={{ fontFamily: 'monospace' }}>{code}</li>
                                            ))}
                                        </ul>
                                    ) : null}
                                </div>
                            ) : null}

                            <p style={{ fontSize: typography.caption, color: colors.textSubtle, marginTop: spacing.md }}>
                                Ergänzungen bitte im Prüfen‑Step vornehmen.
                            </p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
