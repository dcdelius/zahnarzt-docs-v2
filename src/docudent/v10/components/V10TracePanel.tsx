import React, { useMemo, useState } from 'react';

import type { V10PipelineMeta } from '../types';
import { getChipFromKb } from '../renderer/renderFromKbChips';
import { colors, radii, spacing, typography } from '../styles/tokens';

type PerInstanceOutput = Record<string, {
    instanceId: string;
    teeth: string[];
    chips: string[];
    billingRefs: string[];
    chipEmitters?: Record<string, string>;
}>;

type Props = {
    treatmentId: string;
    meta?: V10PipelineMeta;
    perInstance?: PerInstanceOutput;
};

function toShortHash(hash: string | undefined): string {
    if (!hash) return 'N/A';
    return hash.length > 12 ? `${hash.slice(0, 12)}…` : hash;
}

function formatFactSources(list: string[] | undefined): string {
    if (!list || list.length === 0) return 'unknown';
    return list.join(', ');
}

export function V10TracePanel({ treatmentId, meta, perInstance }: Props) {
    const [open, setOpen] = useState(false);
    const [openBilling, setOpenBilling] = useState(false);
    const [openAskbacks, setOpenAskbacks] = useState(false);

    const perToothChipProv = useMemo(() => {
        const prov = meta?.provenance?.chips ?? [];
        const map = new Map<string, Map<string, (typeof prov)[number]>>();
        for (const item of prov) {
            const toothKey = item.toothScope ?? 'session';
            if (!map.has(toothKey)) map.set(toothKey, new Map());
            const byChip = map.get(toothKey)!;
            if (!byChip.has(item.chipId)) byChip.set(item.chipId, item);
        }
        return map;
    }, [meta]);

    const perToothAskbackProv = useMemo(() => {
        const prov = meta?.provenance?.askbacks ?? [];
        const map = new Map<string, (typeof prov)>();
        for (const item of prov) {
            const toothKey = item.toothScope ?? 'session';
            const list = map.get(toothKey) ?? [];
            list.push(item);
            map.set(toothKey, list);
        }
        for (const list of map.values()) {
            list.sort((a, b) => a.askbackId.localeCompare(b.askbackId));
        }
        return map;
    }, [meta]);

    const kbTreatmentMeta = meta?.kb?.treatments?.[treatmentId];

    return (
        <div
            style={{
                borderRadius: radii.card,
                border: `1px solid ${colors.lineDivider}`,
                background: colors.surfaceGlass,
                padding: spacing.lg,
            }}
            data-testid="v10-trace-panel"
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
                <div style={{ fontSize: typography.subtitle, color: colors.textPrimary, fontWeight: typography.semibold }}>
                    Trace & Herkunft
                </div>
                <button
                    onClick={() => setOpen(prev => !prev)}
                    style={{
                        padding: '8px 14px',
                        borderRadius: radii.pill,
                        border: `1px solid ${colors.lineDivider}`,
                        background: 'transparent',
                        color: colors.textSecondary,
                        fontWeight: typography.semibold,
                        cursor: 'pointer',
                    }}
                    data-testid="v10-trace-toggle"
                >
                    {open ? 'Ausblenden' : 'Anzeigen'}
                </button>
            </div>

            {!open && (
                <div style={{ marginTop: spacing.sm, color: colors.textSecondary, fontSize: typography.bodySmall }}>
                    Zeigt, warum Chips aktiv sind (Emitter), welche Quellen die Fakten hatten (Diktat/Settings/Antwort) und wie BillingRefs entstanden.
                </div>
            )}

            {open && (
                <div style={{ marginTop: spacing.lg, display: 'grid', gap: spacing.lg }}>
                    {/* KB Meta */}
                    <div style={{ display: 'grid', gap: spacing.sm }}>
                        <div style={{ fontSize: typography.label, color: colors.textSecondary, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                            Knowledge Base
                        </div>
                        <div style={{ fontSize: typography.bodySmall, color: colors.textPrimary }}>
                            <div>KB Release: {meta?.kbReleaseId ?? 'N/A'}</div>
                            <div>Medical: v{meta?.kb?.medical?.version ?? 'N/A'} ({toShortHash(meta?.kb?.medical?.hash)})</div>
                            <div>Treatment: v{kbTreatmentMeta?.version ?? 'N/A'} ({toShortHash(kbTreatmentMeta?.hash)})</div>
                            <div>Combinability: v{meta?.kb?.combinability?.version ?? 'N/A'} ({toShortHash(meta?.kb?.combinability?.hash)})</div>
                        </div>
                    </div>

                    {/* Chips */}
                    <div style={{ display: 'grid', gap: spacing.sm }}>
                        <div style={{ fontSize: typography.label, color: colors.textSecondary, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                            Chips (pro Instanz)
                        </div>
                        {!perInstance || Object.keys(perInstance).length === 0 ? (
                            <div style={{ color: colors.textSecondary, fontSize: typography.bodySmall }}>Keine perInstance Daten.</div>
                        ) : (
                            <div style={{ display: 'grid', gap: spacing.md }}>
                                {Object.values(perInstance).map(inst => {
                                    const tooth = inst.teeth?.[0];
                                    const toothKey = tooth ?? 'session';
                                    const provMap = perToothChipProv.get(toothKey) ?? new Map();
                                    const emitters = inst.chipEmitters ?? {};
                                    const sorted = [...new Set(inst.chips ?? [])].sort((a, b) => a.localeCompare(b));

                                    return (
                                        <div
                                            key={inst.instanceId}
                                            style={{
                                                padding: spacing.md,
                                                borderRadius: radii.card,
                                                border: `1px solid ${colors.lineSoft}`,
                                                background: colors.surfaceCard,
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: spacing.md }}>
                                                <div style={{ color: colors.textPrimary, fontWeight: typography.semibold }}>
                                                    {inst.instanceId}{tooth ? ` · Zahn ${tooth}` : ''}
                                                </div>
                                                <div style={{ color: colors.textSecondary, fontSize: typography.bodySmall }}>
                                                    {sorted.length} Chips · {inst.billingRefs?.length ?? 0} BillingRefs
                                                </div>
                                            </div>

                                            <div style={{ marginTop: spacing.sm, display: 'grid', gap: 6 }}>
                                                {sorted.map(chipId => {
                                                    const prov = provMap.get(chipId);
                                                    const emitter = emitters[chipId] ?? 'unknown';
                                                    const chipLabel = getChipFromKb(treatmentId, chipId)?.label ?? chipId;
                                                    const billingEligible = prov?.billingEligible;
                                                    const factSources = formatFactSources(prov?.factSources as unknown as string[] | undefined);
                                                    const sourceRefCount = (prov?.sourceRefs ?? []).length;

                                                    return (
                                                        <div
                                                            key={chipId}
                                                            style={{
                                                                display: 'grid',
                                                                gridTemplateColumns: '1.4fr 1.2fr 1fr',
                                                                gap: spacing.sm,
                                                                padding: '8px 10px',
                                                                borderRadius: 12,
                                                                border: `1px solid ${colors.lineDivider}`,
                                                                background: 'rgba(255,255,255,0.04)',
                                                            }}
                                                        >
                                                            <div style={{ color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: typography.semibold }}>
                                                                {chipLabel}
                                                                <div style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>
                                                                    {chipId}
                                                                </div>
                                                            </div>
                                                            <div style={{ color: colors.textSecondary, fontSize: typography.bodySmall }}>
                                                                <div>Emitter: <code>{emitter}</code></div>
                                                                <div>Facts: <code>{factSources}</code></div>
                                                            </div>
                                                            <div style={{ color: colors.textSecondary, fontSize: typography.bodySmall }}>
                                                                <div>Billable: <code>{billingEligible === undefined ? 'N/A' : String(billingEligible)}</code></div>
                                                                <div>Refs: <code>{sourceRefCount}</code></div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Billing origins */}
                    <div style={{ display: 'grid', gap: spacing.sm }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
                            <div style={{ fontSize: typography.label, color: colors.textSecondary, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                                Billing Origins (GP4/GP8)
                            </div>
                            <button
                                onClick={() => setOpenBilling(prev => !prev)}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: radii.pill,
                                    border: `1px solid ${colors.lineDivider}`,
                                    background: 'transparent',
                                    color: colors.textSecondary,
                                    fontWeight: typography.semibold,
                                    cursor: 'pointer',
                                }}
                                data-testid="v10-trace-billing-toggle"
                            >
                                {openBilling ? 'Weniger' : 'Mehr'}
                            </button>
                        </div>

                        <div style={{ color: colors.textSecondary, fontSize: typography.bodySmall }}>
                            Completeness: <code>{String(meta?.billingCompleteness?.isComplete ?? 'N/A')}</code>{' '}
                            (missing: <code>{String(meta?.billingCompleteness?.missing?.length ?? 0)}</code>)
                        </div>

                        {openBilling && (
                            <div style={{ display: 'grid', gap: 6 }}>
                                {(meta?.billingCompleteness?.origins ?? [])
                                    .slice()
                                    .sort((a, b) => a.code.localeCompare(b.code))
                                    .map((o, idx) => (
                                        <div
                                            key={`${o.code}-${idx}`}
                                            style={{
                                                padding: '8px 10px',
                                                borderRadius: 12,
                                                border: `1px solid ${colors.lineDivider}`,
                                                background: 'rgba(255,255,255,0.04)',
                                                color: colors.textSecondary,
                                                fontSize: typography.bodySmall,
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                gap: spacing.md,
                                            }}
                                        >
                                            <div>
                                                <code>{o.code}</code>
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <code>{o.origin}</code>
                                            </div>
                                            <div style={{ flex: 2 }}>
                                                <code>{o.ref}</code>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>

                    {/* Askbacks provenance */}
                    <div style={{ display: 'grid', gap: spacing.sm }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
                            <div style={{ fontSize: typography.label, color: colors.textSecondary, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                                Askbacks (Warum gefragt?)
                            </div>
                            <button
                                onClick={() => setOpenAskbacks(prev => !prev)}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: radii.pill,
                                    border: `1px solid ${colors.lineDivider}`,
                                    background: 'transparent',
                                    color: colors.textSecondary,
                                    fontWeight: typography.semibold,
                                    cursor: 'pointer',
                                }}
                                data-testid="v10-trace-askbacks-toggle"
                            >
                                {openAskbacks ? 'Weniger' : 'Mehr'}
                            </button>
                        </div>
                        {!openAskbacks ? (
                            <div style={{ color: colors.textSecondary, fontSize: typography.bodySmall }}>
                                {meta?.provenance?.askbacks?.length ?? 0} Askback‑Trigger registriert.
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gap: spacing.md }}>
                                {Array.from(perToothAskbackProv.entries()).map(([toothKey, list]) => (
                                    <div
                                        key={toothKey}
                                        style={{
                                            padding: spacing.md,
                                            borderRadius: radii.card,
                                            border: `1px solid ${colors.lineSoft}`,
                                            background: colors.surfaceCard,
                                        }}
                                    >
                                        <div style={{ color: colors.textPrimary, fontWeight: typography.semibold, marginBottom: spacing.sm }}>
                                            {toothKey === 'session' ? 'Session' : `Zahn ${toothKey}`}
                                        </div>
                                        <div style={{ display: 'grid', gap: 6 }}>
                                            {list.map((a, idx) => (
                                                <div
                                                    key={`${a.askbackId}-${idx}`}
                                                    style={{
                                                        padding: '8px 10px',
                                                        borderRadius: 12,
                                                        border: `1px solid ${colors.lineDivider}`,
                                                        background: 'rgba(255,255,255,0.04)',
                                                        color: colors.textSecondary,
                                                        fontSize: typography.bodySmall,
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        gap: spacing.md,
                                                    }}
                                                >
                                                    <div style={{ flex: 2 }}>
                                                        <code>{a.askbackId}</code>
                                                    </div>
                                                    <div style={{ flex: 2 }}>
                                                        <code>{a.ruleId}</code>
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        refs: <code>{(a.sourceRefs ?? []).length}</code>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Rule checks */}
                    {(meta?.regelPruefungen?.length ?? 0) > 0 && (
                        <div style={{ display: 'grid', gap: spacing.sm }}>
                            <div style={{ fontSize: typography.label, color: colors.textSecondary, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                                Regel‑Prüfungen
                            </div>
                            <div style={{ display: 'grid', gap: 6 }}>
                                {meta!.regelPruefungen!.map((r) => (
                                    <div
                                        key={r.regelId}
                                        style={{
                                            padding: '10px 12px',
                                            borderRadius: 12,
                                            border: `1px solid ${colors.lineDivider}`,
                                            background: 'rgba(255,255,255,0.04)',
                                            color: colors.textSecondary,
                                            fontSize: typography.bodySmall,
                                        }}
                                    >
                                        <div style={{ color: colors.textPrimary, fontWeight: typography.semibold }}>
                                            {r.titel} <span style={{ color: colors.textSecondary, fontWeight: typography.normal }}>({r.severity})</span>
                                        </div>
                                        <div style={{ marginTop: 4 }}>{r.message}</div>
                                        {(r.betroffeneCodes?.length ?? 0) > 0 && (
                                            <div style={{ marginTop: 6 }}>
                                                Codes: <code>{r.betroffeneCodes.join(', ')}</code>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

