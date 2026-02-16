import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { colors, gradients, radii, shadows, typography, spacing, motion as motionTokens } from '../styles/tokens';
import { V10ChipsGroupedPanel, type GroupedChipsInstance } from './V10ChipsGroupedPanel';
import { V10TracePanel } from './V10TracePanel';
import { V10ReviewSummaryCard } from './V10ReviewSummaryCard';
import { V10QuestionRow } from './V10QuestionRow';
import {
    resolveEffectiveChips,
    type ChipOverride,
    type OverridesByInstance,
} from '../settings/useChipOverrides';
import type { DynamicQuestion } from '../../contracts/questions';
import type { V10PipelineMeta, V10ReviewContext } from '../types';
import { V10StageHeader } from './V10StageHeader';

interface TreatmentInstance {
    instanceId: string;
    treatmentId: string;
    tooth?: string;
}

interface ChipsInputEntry {
    id: string;
    enabled: boolean;
    value?: unknown;
}

type ChipsInput = ChipsInputEntry[] | Record<string, ChipsInputEntry[]>;

interface UpsellHint {
    type: 'mkv';
    segmentId: string;
    tooth?: string;
    message: string;
    requiredAskbacks: string[];
}

interface Props {
    treatmentId: string;
    instances: TreatmentInstance[];
    dictationChips: ChipsInput;
    settingsChips: ChipsInput;
    overridesByInstance: OverridesByInstance;
    onOverride: (instanceId: string, chipId: string, override: ChipOverride) => void;
    onResetOverride: (instanceId: string, chipId: string) => void;
    onResetAllOverrides: () => void;
    questions: DynamicQuestion[];
    answers: Map<string, unknown>;
    onApplyAnswers: (answers: Map<string, unknown>) => void;
    upsellHints?: UpsellHint[];
    onProceedToOutput?: () => void;
    meta?: V10PipelineMeta;
    perInstance?: Record<string, unknown>;
    billingCodes?: string[];
    review?: V10ReviewContext;
    showTrace?: boolean;
}

function stripEmoji(value: string) {
    return value.replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '').trim();
}

function parseAmount(raw: string): number | undefined {
    const normalized = raw.replace(',', '.').replace(/[^\d.]/g, '');
    const amount = Number.parseFloat(normalized);
    return Number.isFinite(amount) ? amount : undefined;
}

function resolveChipsForInstance(input: ChipsInput, instanceId: string): ChipsInputEntry[] {
    return Array.isArray(input) ? input : (input[instanceId] ?? []);
}

export function V10PostAnalysisDashboard({
    treatmentId,
    instances,
    dictationChips,
    settingsChips,
    overridesByInstance,
    onOverride,
    onResetOverride,
    onResetAllOverrides,
    questions,
    answers,
    onApplyAnswers,
    upsellHints,
    onProceedToOutput,
    meta,
    perInstance,
    billingCodes,
    review,
    showTrace = false,
}: Props) {
    const [draftAnswers, setDraftAnswers] = useState<Map<string, unknown>>(new Map(answers));
    const [hasChanges, setHasChanges] = useState(false);
    const [mkvActionState, setMkvActionState] = useState<Record<string, { open: boolean; amount: string; justification: string }>>({});
    const [showManualOverrides, setShowManualOverrides] = useState(false);

    const overrideCount = useMemo(() => {
        return Object.values(overridesByInstance ?? {}).reduce((sum, inst) => sum + Object.keys(inst ?? {}).length, 0);
    }, [overridesByInstance]);

    useEffect(() => {
        setDraftAnswers(new Map(answers));
        setHasChanges(false);
    }, [answers]);

    const instancesWithChips = useMemo(() => {
        return instances.map(inst => {
            const instOverrides = overridesByInstance[inst.instanceId] || {};
            const instDictationChips = resolveChipsForInstance(dictationChips, inst.instanceId);
            const instSettingsChips = resolveChipsForInstance(settingsChips, inst.instanceId);
            const effectiveChips = resolveEffectiveChips({
                dictationChips: instDictationChips,
                settingsChips: instSettingsChips,
                overrides: instOverrides,
            });

            return {
                instanceId: inst.instanceId,
                treatmentId: inst.treatmentId,
                tooth: inst.tooth,
                chips: effectiveChips,
            } as GroupedChipsInstance;
        });
    }, [instances, dictationChips, settingsChips, overridesByInstance]);

    const updateAnswer = (questionId: string, value: unknown) => {
        setDraftAnswers(prev => {
            const next = new Map(prev);
            if (value === undefined || value === '') {
                next.delete(questionId);
            } else {
                next.set(questionId, value);
            }
            return next;
        });
        setHasChanges(true);
    };

    const applyAnswers = (nextAnswers: Map<string, unknown>) => {
        onApplyAnswers(nextAnswers);
        setHasChanges(false);
    };

    const applyMkvAction = (key: string) => {
        const state = mkvActionState[key];
        if (!state) return;
        const amount = parseAmount(state.amount);
        if (!amount) return;
        const justification = state.justification.trim() || 'Mehrkostenvereinbarung';
        const next = new Map(draftAnswers);
        next.set('mkv_betrag', amount);
        next.set('mkv_justification', justification);
        setDraftAnswers(next);
        setHasChanges(true);
        applyAnswers(next);
        setMkvActionState(prev => ({
            ...prev,
            [key]: { ...state, open: false },
        }));
    };

    const mkvHints = (upsellHints ?? []).filter(h => h.type === 'mkv');
    const billingPreview = useMemo(() => {
        const codes = billingCodes ?? [];
        const bema = codes.filter(c => c.startsWith('BEMA_')).length;
        const goz = codes.filter(c => c.startsWith('GOZ_')).length;
        return { total: codes.length, bema, goz };
    }, [billingCodes]);

    const visibleBillingCodes = useMemo(() => {
        const fromOutput = (billingCodes ?? []).filter(code => typeof code === 'string' && code.trim().length > 0);
        const fromMeta = (meta?.billingCompleteness?.origins ?? [])
            .map(origin => origin.code)
            .filter(code => typeof code === 'string' && code.trim().length > 0);
        const merged = Array.from(new Set([...fromOutput, ...fromMeta]));
        return merged.sort((a, b) => a.localeCompare(b));
    }, [billingCodes, meta?.billingCompleteness?.origins]);

    const containerStyle: React.CSSProperties = {
        maxWidth: 1160,
        margin: '0 auto',
        padding: '0 12px',
    };

    const glassCardStyle: React.CSSProperties = {
        padding: spacing.xxl,
        borderRadius: radii.card,
        background: colors.surfaceGlass,
        boxShadow: shadows.barDefault,
        backdropFilter: 'blur(16px)',
    };

    return (
        <div style={{ marginBottom: spacing.xxxl }} data-testid="v10-postanalysis-dashboard">
            <div style={containerStyle}>
                <V10StageHeader
                    kicker="Analyse"
                    title="Extrahierte Details prüfen"
                    subtitle={(
                        <>
                            <strong>BEMA {billingPreview.bema}</strong> · <strong>GOZ {billingPreview.goz}</strong>
                            {billingPreview.total > 0 ? ` · ${billingPreview.total} Codes` : ''}
                        </>
                    )}
                    right={(
                        <>
                            <button
                                onClick={() => {
                                    onResetAllOverrides();
                                    setHasChanges(true);
                                }}
                                style={{
                                    padding: '12px 20px',
                                    borderRadius: radii.pill,
                                    border: 'none',
                                    background: colors.surfaceGlass,
                                    color: colors.textSecondary,
                                    fontWeight: typography.semibold,
                                    cursor: 'pointer',
                                    boxShadow: shadows.barHover,
                                    backdropFilter: 'blur(16px)',
                                }}
                            >
                                Chips zurücksetzen
                            </button>
                            <button
                                onClick={() => applyAnswers(new Map(draftAnswers))}
                                disabled={!hasChanges}
                                style={{
                                    padding: '12px 22px',
                                    borderRadius: radii.pill,
                                    border: 'none',
                                    background: hasChanges ? gradients.button : colors.surfaceGlassActive,
                                    color: colors.textPrimary,
                                    fontWeight: typography.semibold,
                                    cursor: hasChanges ? 'pointer' : 'not-allowed',
                                    boxShadow: hasChanges ? shadows.buttonDefault : 'none',
                                }}
                            >
                                Output aktualisieren
                            </button>
                            {onProceedToOutput && (
                                <button
                                    onClick={onProceedToOutput}
                                    style={{
                                        padding: '12px 22px',
                                        borderRadius: radii.pill,
                                        border: 'none',
                                        background: gradients.button,
                                        color: colors.textPrimary,
                                        fontWeight: typography.semibold,
                                        cursor: 'pointer',
                                        boxShadow: shadows.buttonDefault,
                                    }}
                                >
                                    Zum Output
                                </button>
                            )}
                        </>
                    )}
                />

                <V10ReviewSummaryCard review={review} />

                {visibleBillingCodes.length > 0 && (
                    <div
                        data-testid="v10-postanalysis-billing-codes"
                        style={{
                            marginTop: spacing.xl,
                            padding: spacing.lg,
                            borderRadius: radii.cardSmall,
                            background: colors.surfaceGlass,
                            boxShadow: shadows.cardSoft,
                            backdropFilter: 'blur(14px)',
                        }}
                    >
                        <div
                            style={{
                                fontSize: typography.label,
                                color: colors.textSecondary,
                                letterSpacing: '0.14em',
                                textTransform: 'uppercase',
                                marginBottom: spacing.sm,
                            }}
                        >
                            Abrechnungsvorschau
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm }}>
                            {visibleBillingCodes.map((code, index) => (
                                <span
                                    key={`${code}-${index}`}
                                    data-testid={`v10-postanalysis-billing-code-${index}`}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        padding: '6px 10px',
                                        borderRadius: radii.pill,
                                        background: colors.surfaceGlassActive,
                                        border: `1px solid ${colors.lineDivider}`,
                                        color: colors.textPrimary,
                                        fontSize: typography.caption,
                                        fontWeight: typography.semibold,
                                        letterSpacing: '0.02em',
                                    }}
                                >
                                    {code}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                <div
                    style={{
                        marginTop: spacing.xxl,
                        display: 'grid',
                        gridTemplateColumns: '1.2fr 1fr',
                        gap: spacing.xxl,
                        alignItems: 'start',
                    }}
                >
                    <div style={glassCardStyle}>
                        <div style={{ fontSize: typography.label, color: colors.textSecondary, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: spacing.md }}>
                            Chips
                        </div>
                        <div style={{ color: colors.textSecondary, fontSize: typography.bodySmall, marginBottom: spacing.lg }}>
                            Aus Fakten abgeleitet (SSOT). Änderungen über Rückfragen/Fakten.
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg }}>
                            {[
                                { key: 'DICT', label: 'Diktat' },
                                { key: 'STD', label: 'Standard' },
                                { key: 'USER', label: 'Manuell' },
                                { key: 'AUTO', label: 'System' },
                            ].map(item => (
                                <span
                                    key={item.key}
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
                                        letterSpacing: '0.06em',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    <span style={{ color: colors.textPrimary }}>{item.key}</span>
                                    <span style={{ letterSpacing: '0.02em', textTransform: 'none', fontWeight: typography.medium }}>
                                        {item.label}
                                    </span>
                                </span>
                            ))}
                        </div>

                        <V10ChipsGroupedPanel
                            instances={instancesWithChips}
                            onOverride={(instanceId, chipId, override) => {
                                // Read-only in SSOT mode: manual overrides are behind an explicit opt-in section below.
                                void instanceId; void chipId; void override;
                            }}
                            onResetOverride={(instanceId, chipId) => {
                                void instanceId; void chipId;
                            }}
                            interactionMode="readonly"
                        />

                        <div style={{ marginTop: spacing.xl }}>
                            <button
                                onClick={() => setShowManualOverrides(prev => !prev)}
                                style={{
                                    padding: '10px 16px',
                                    borderRadius: radii.pill,
                                    border: 'none',
                                    background: showManualOverrides ? colors.surfaceGlassActive : colors.surfaceGlass,
                                    color: colors.textSecondary,
                                    fontWeight: typography.semibold,
                                    cursor: 'pointer',
                                    boxShadow: shadows.cardSoft,
                                }}
                            >
                                {showManualOverrides
                                    ? 'Manuelle Overrides ausblenden'
                                    : `Manuelle Overrides${overrideCount > 0 ? ` (${overrideCount})` : ''}`}
                            </button>

                            {showManualOverrides && (
                                <div style={{ marginTop: spacing.lg }}>
                                    <div style={{ color: colors.textSecondary, fontSize: typography.bodySmall, marginBottom: spacing.md }}>
                                        Ausnahme: überschreibt Chips direkt (Quelle <code>manualOverride</code>).
                                    </div>
                                    <V10ChipsGroupedPanel
                                        instances={instancesWithChips}
                                        onOverride={(instanceId, chipId, override) => {
                                            onOverride(instanceId, chipId, override);
                                            setHasChanges(true);
                                        }}
                                        onResetOverride={(instanceId, chipId) => {
                                            onResetOverride(instanceId, chipId);
                                            setHasChanges(true);
                                        }}
                                        interactionMode="override"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={glassCardStyle}>
                        <div style={{ fontSize: typography.label, color: colors.textSecondary, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: spacing.md }}>
                            Rückfragen & Aktionen
                        </div>

                        {questions.length === 0 && mkvHints.length === 0 && (
                            <div style={{ color: colors.textSecondary, fontSize: typography.bodySmall }}>
                                Keine offenen Rückfragen.
                            </div>
                        )}

                        {questions.length > 0 && (
                            <div style={{ display: 'grid', gap: spacing.xl, marginBottom: spacing.xxl }}>
                                {questions.map(question => {
                                    const currentValue = draftAnswers.get(question.id);

                                    return (
                                        <V10QuestionRow
                                            key={question.id}
                                            question={{
                                                ...question,
                                                question: stripEmoji(question.question || ''),
                                                options: (question.options ?? []).map(opt => ({ ...opt, label: stripEmoji(opt.label) })),
                                            }}
                                            value={currentValue}
                                            onChange={(value) => updateAnswer(question.id, value)}
                                            isMedical={question.medicalSeverity === 'hard'}
                                            variant="bare"
                                            parseNumber={parseAmount}
                                            optionTestId={(opt) => `option-${question.id}-${opt.id}`}
                                        />
                                    );
                                })}
                            </div>
                        )}

                        {mkvHints.length > 0 && (
                            <div style={{ display: 'grid', gap: spacing.lg }}>
                                {mkvHints.map(hint => {
                                    const key = `${hint.segmentId}-${hint.tooth || 'session'}`;
                                    const state = mkvActionState[key] ?? { open: false, amount: '', justification: '' };
                                    return (
                                        <div key={key} style={{
                                            padding: spacing.lg,
                                            borderRadius: radii.cardSmall,
                                            background: colors.surfaceGlass,
                                            boxShadow: shadows.cardSoft,
                                            backdropFilter: 'blur(14px)',
                                        }}>
                                            <div style={{ fontSize: typography.subtitle, color: colors.textPrimary, fontWeight: typography.semibold }}>
                                                {stripEmoji(hint.message)}
                                            </div>
                                            <div style={{ marginTop: spacing.sm }}>
                                                {!state.open && (
                                                    <button
                                                        onClick={() => setMkvActionState(prev => ({
                                                            ...prev,
                                                            [key]: { ...state, open: true },
                                                        }))}
                                                        style={{
                                                            padding: '10px 18px',
                                                            borderRadius: radii.pill,
                                                            border: 'none',
                                                            background: gradients.button,
                                                            color: colors.textPrimary,
                                                            fontWeight: typography.semibold,
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        Mehrkosten eintragen
                                                    </button>
                                                )}
                                                {state.open && (
                                                    <div style={{ display: 'grid', gap: spacing.sm, marginTop: spacing.sm }}>
                                                        <input
                                                            type="text"
                                                            value={state.amount}
                                                            placeholder="Betrag in €"
                                                            onChange={(event) => setMkvActionState(prev => ({
                                                                ...prev,
                                                                [key]: { ...state, amount: event.target.value },
                                                            }))}
                                                            style={{
                                                                width: '100%',
                                                                padding: '12px 14px',
                                                                borderRadius: radii.input,
                                                                border: `1px solid ${colors.lineDivider}`,
                                                                background: colors.surfaceCard,
                                                                color: colors.textPrimary,
                                                            }}
                                                        />
                                                        <input
                                                            type="text"
                                                            value={state.justification}
                                                            placeholder="Begründung (optional)"
                                                            onChange={(event) => setMkvActionState(prev => ({
                                                                ...prev,
                                                                [key]: { ...state, justification: event.target.value },
                                                            }))}
                                                            style={{
                                                                width: '100%',
                                                                padding: '12px 14px',
                                                                borderRadius: radii.input,
                                                                border: `1px solid ${colors.lineDivider}`,
                                                                background: colors.surfaceCard,
                                                                color: colors.textPrimary,
                                                            }}
                                                        />
                                                        <div style={{ display: 'flex', gap: spacing.sm }}>
                                                            <button
                                                                onClick={() => applyMkvAction(key)}
                                                                style={{
                                                                    padding: '10px 18px',
                                                                    borderRadius: radii.pill,
                                                                    border: 'none',
                                                                    background: gradients.button,
                                                                    color: colors.textPrimary,
                                                                    fontWeight: typography.semibold,
                                                                    cursor: 'pointer',
                                                                }}
                                                            >
                                                                Übernehmen
                                                            </button>
                                                            <button
                                                                onClick={() => setMkvActionState(prev => ({
                                                                    ...prev,
                                                                    [key]: { ...state, open: false },
                                                                }))}
                                                                style={{
                                                                    padding: '10px 18px',
                                                                    borderRadius: radii.pill,
                                                                    border: `1px solid ${colors.lineDivider}`,
                                                                    background: 'transparent',
                                                                    color: colors.textSecondary,
                                                                    cursor: 'pointer',
                                                                }}
                                                            >
                                                                Abbrechen
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {showTrace ? (
                    <div style={{ marginTop: spacing.xxl }}>
                        <V10TracePanel
                            treatmentId={treatmentId}
                            meta={meta}
                            perInstance={perInstance as any}
                        />
                    </div>
                ) : null}
            </div>
        </div>
    );
}

export default V10PostAnalysisDashboard;
