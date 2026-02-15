import React from 'react';
import { motion } from 'framer-motion';

import type { V10ReviewContext } from '../types';
import { getPack } from '../packs';
import { colors, radii, shadows, spacing, typography, motion as motionTokens } from '../styles/tokens';

type ExtractedFallback = {
    tooth?: string | null;
    surfaces?: string[];
    diagnosis?: string | null;
};

type ReviewFactSource = NonNullable<V10ReviewContext['instances'][number]['factSources']>[string];
type ReviewPill = { label: string; source: ReviewFactSource };

interface V10ReviewSummaryCardProps {
    review?: V10ReviewContext;
    extractedFallback?: ExtractedFallback;
    title?: string;
    maxPills?: number;
    maxStandards?: number;
}

function formatSurfaces(surfaces: string[]) {
    return surfaces.join('').toUpperCase();
}

function resolveChipLabel(treatmentId: string, chipId: string): string | null {
    const pack = getPack(treatmentId);
    if (!pack) return null;
    try {
        const contract = pack.getUiContract();
        for (const control of contract?.chipControls ?? []) {
            if (control.chipId === chipId) return control.label;
            if (control.chipMapping) {
                for (const [value, mappedId] of Object.entries(control.chipMapping)) {
                    if (mappedId !== chipId) continue;
                    const optionLabel = control.options?.find(opt => opt.value === value)?.label;
                    return optionLabel ? `${control.label}: ${optionLabel}` : control.label;
                }
            }
        }
    } catch {
        return null;
    }
    return null;
}

function resolveAnesthesiaLabel(value?: string) {
    if (!value || value === 'unknown' || value === 'none') return null;
    if (value === 'leitung') return 'Anästhesie: Leitung';
    if (value === 'infiltr' || value === 'infiltration') return 'Anästhesie: Infiltration';
    if (value === 'ila') return 'Anästhesie: ILA';
    return `Anästhesie: ${value}`;
}

function resolveCariesDepthLabel(depth?: string) {
    if (!depth || depth === 'unknown') return null;
    if (depth === 'profunda') return 'Tiefe: profunda';
    if (depth === 'pulp_near') return 'Tiefe: pulpanah';
    if (depth === 'normal') return 'Tiefe: media';
    return `Tiefe: ${depth}`;
}

function resolveCappingLabel(facts: V10ReviewContext['instances'][number]['facts']) {
    const performed = (facts.capping as any)?.performed;
    if (facts.pulpaOpened === true) return 'Überkappung: direkt';
    if (facts.pulpaOpened === false || performed === 'yes') return 'Überkappung: indirekt';
    return null;
}

function resolveWlLabel(method?: string) {
    if (!method) return null;
    if (method === 'electronic') return 'Arbeitslänge: elektronisch';
    if (method === 'xray') return 'Arbeitslänge: Röntgen';
    return `Arbeitslänge: ${method}`;
}

function resolveWfLabel(technique?: string) {
    if (!technique) return null;
    if (technique === 'warm') return 'Wurzelfüllung: warm';
    if (technique === 'kalt') return 'Wurzelfüllung: kalt';
    if (technique === 'einzel') return 'Wurzelfüllung: Einzelstift';
    return `Wurzelfüllung: ${technique}`;
}

function resolveSourceLabel(source: ReviewFactSource): string {
    if (source === 'settings') return 'Einstellung';
    if (source === 'askback') return 'Rückfrage';
    if (source === 'manual') return 'Manuell';
    return 'Diktat';
}

function buildFallbackInstance(extractedFallback: ExtractedFallback): V10ReviewContext['instances'][number] {
    const tooth = extractedFallback.tooth ? String(extractedFallback.tooth) : undefined;
    return {
        instanceId: 'single',
        treatmentId: 'unknown',
        teeth: tooth ? [tooth] : [],
        tooth,
        standardChipIds: [],
        extractedSummary: {
            tooth: extractedFallback.tooth ?? null,
            surfaces: extractedFallback.surfaces ?? [],
            diagnosis: extractedFallback.diagnosis ?? null,
        },
        facts: {},
    };
}

export function V10ReviewSummaryCard({
    review,
    extractedFallback,
    title = 'Erkannt',
    maxPills = 6,
    maxStandards = 6,
}: V10ReviewSummaryCardProps) {
    const instances = (review?.instances?.length ?? 0) > 0
        ? review!.instances
        : (extractedFallback ? [buildFallbackInstance(extractedFallback)] : []);

    if (instances.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: motionTokens.durationSmall, ease: motionTokens.easing }}
            style={{
                padding: spacing.xxl,
                borderRadius: radii.card,
                background: colors.surfaceGlass,
                boxShadow: shadows.barDefault,
                backdropFilter: 'blur(16px)',
            }}
            data-testid="v10-review-summary-card"
        >
            <div style={{
                fontSize: typography.label,
                color: colors.textSecondary,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                marginBottom: spacing.md,
            }}>
                {title}
            </div>

            <div style={{ display: 'grid', gap: spacing.md }}>
                {instances.map(inst => {
                    const toothLabel = inst.tooth
                        ? `Zahn ${inst.tooth}`
                        : (inst.teeth?.length ? `Zähne ${inst.teeth.join(', ')}` : 'Zahn (unbekannt)');

                    const surfaces = inst.extractedSummary.surfaces ?? [];
                    const surfacesLabel = surfaces.length > 0 ? formatSurfaces(surfaces) : null;

                    const facts = inst.facts ?? {};
                    const sources = inst.factSources ?? {};
                    const pills: ReviewPill[] = [];
                    const pushPill = (sourceKey: string, label: string | null) => {
                        if (!label) return;
                        pills.push({ label, source: sources[sourceKey] ?? 'dictation' });
                    };

                    const anesthesiaLabel = resolveAnesthesiaLabel(facts.anesthesia as any);
                    pushPill('anesthesia', anesthesiaLabel);

                    if (facts.kofferdamUsed === true || (facts.endo as any)?.kofferdam === true) {
                        pushPill('kofferdam', 'Kofferdam');
                    }

                    const depthLabel = resolveCariesDepthLabel(facts.cariesDepth as any);
                    pushPill('cariesDepth', depthLabel);

                    const cappingLabel = resolveCappingLabel(facts);
                    pushPill('capping', cappingLabel);

                    const wlLabel = resolveWlLabel((facts.endo as any)?.workingLengthMethod);
                    pushPill('workingLengthMethod', wlLabel);

                    const wfLabel = resolveWfLabel((facts.endo as any)?.wfTechnique);
                    pushPill('wfTechnique', wfLabel);

                    const visiblePills = pills.slice(0, maxPills);
                    const standardLabels = (inst.standardChipIds ?? [])
                        .map(id => resolveChipLabel(inst.treatmentId, id))
                        .filter((label): label is string => Boolean(label));

                    return (
                        <div
                            key={inst.instanceId}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: spacing.sm,
                            }}
                        >
                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm }}>
                                <span style={{ fontSize: typography.body, color: colors.textPrimary, fontWeight: typography.semibold }}>
                                    {toothLabel}
                                </span>
                                {surfacesLabel ? (
                                    <span style={{ fontSize: typography.caption, color: colors.textSecondary }}>
                                        · {surfacesLabel}
                                    </span>
                                ) : null}
                            </div>

                            {visiblePills.length > 0 ? (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm }}>
                                    {visiblePills.map((pill) => (
                                        <span
                                            key={`${inst.instanceId}:pill:${pill.label}`}
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
                                                letterSpacing: '0.03em',
                                            }}
                                        >
                                            <span>{pill.label}</span>
                                            <span
                                                style={{
                                                    padding: '2px 6px',
                                                    borderRadius: radii.pill,
                                                    background: colors.surfaceGlassHover,
                                                    color: colors.textSubtle,
                                                    fontSize: 10,
                                                    fontWeight: typography.semibold,
                                                    letterSpacing: '0.08em',
                                                    textTransform: 'uppercase',
                                                }}
                                            >
                                                {resolveSourceLabel(pill.source)}
                                            </span>
                                        </span>
                                    ))}
                                </div>
                            ) : null}

                            {standardLabels.length > 0 ? (
                                <div style={{ marginTop: spacing.xs }}>
                                    <div style={{ fontSize: typography.caption, color: colors.textSubtle, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                                        Standard
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm }}>
                                        {standardLabels.slice(0, maxStandards).map((label) => (
                                            <span
                                                key={`${inst.instanceId}:std:${label}`}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    padding: '6px 10px',
                                                    borderRadius: radii.pill,
                                                    background: colors.surfaceGlassHover,
                                                    color: colors.textSecondary,
                                                    fontSize: typography.caption,
                                                    fontWeight: typography.semibold,
                                                    letterSpacing: '0.02em',
                                                }}
                                            >
                                                {label}
                                            </span>
                                        ))}
                                        {standardLabels.length > maxStandards ? (
                                            <span
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    padding: '6px 10px',
                                                    borderRadius: radii.pill,
                                                    background: colors.surfaceGlassHover,
                                                    color: colors.textMuted,
                                                    fontSize: typography.caption,
                                                    fontWeight: typography.semibold,
                                                }}
                                            >
                                                +{standardLabels.length - maxStandards}
                                            </span>
                                        ) : null}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );
}
