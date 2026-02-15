/**
 * Multi-Treatment Segment Editor
 * 
 * Minimal UI for manual segment definition.
 * Easy to delete/replace later when real segmentation is implemented.
 */

import React from 'react';
import { colors, spacing, radii, typography } from '../styles/tokens';
import type { TreatmentSegment } from '../multitreatment/types';

interface SegmentEditorProps {
    segments: TreatmentSegment[];
    onUpdateSegment: (segmentId: string, updates: Partial<TreatmentSegment>) => void;
    onAddSegment: () => void;
    onRemoveSegment: (segmentId: string) => void;
    onRunMulti: () => void;
    isProcessing: boolean;
}

const TREATMENT_OPTIONS = [
    { value: 'fuellung', label: 'Füllung' },
    { value: 'endo', label: 'Endodontie' },
    { value: 'extraktion', label: 'Extraktion' },
    { value: 'pzr', label: 'Prophylaxe' },
    { value: 'kontrolle', label: 'Kontrolle' },
];

const styles = {
    container: {
        padding: spacing.lg,
        background: 'rgba(255,255,255,0.03)',
        borderRadius: radii.card,
        marginTop: spacing.lg,
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    title: {
        fontSize: '14px',
        fontWeight: typography.semibold,
        color: colors.textPrimary,
        letterSpacing: '0.02em',
    },
    segmentCard: {
        padding: spacing.md,
        background: 'rgba(255,255,255,0.02)',
        borderRadius: radii.cardSmall,
        marginBottom: spacing.sm,
        border: '1px solid rgba(255,255,255,0.08)',
    },
    segmentHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    segmentId: {
        fontSize: '12px',
        color: 'rgba(255,255,255,0.5)',
        fontFamily: 'monospace',
    },
    select: {
        padding: '6px 12px',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: radii.input,
        color: colors.textPrimary,
        fontSize: '14px',
        cursor: 'pointer',
    },
    textarea: {
        width: '100%',
        minHeight: '60px',
        padding: spacing.sm,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: radii.input,
        color: colors.textPrimary,
        fontSize: '14px',
        resize: 'vertical' as const,
        fontFamily: typography.fontFamily,
    },
    removeBtn: {
        padding: '4px 8px',
        background: 'rgba(255,100,100,0.1)',
        border: '1px solid rgba(255,100,100,0.3)',
        borderRadius: radii.input,
        color: 'rgba(255,100,100,0.9)',
        fontSize: '12px',
        cursor: 'pointer',
    },
    addBtn: {
        padding: '8px 16px',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: radii.input,
        color: colors.textPrimary,
        fontSize: '13px',
        cursor: 'pointer',
        marginRight: spacing.sm,
    },
    runBtn: {
        padding: '10px 24px',
        background: colors.coralAccent,
        border: 'none',
        borderRadius: radii.input,
        color: '#fff',
        fontSize: '14px',
        fontWeight: typography.semibold,
        cursor: 'pointer',
        opacity: 1,
    },
    runBtnDisabled: {
        opacity: 0.5,
        cursor: 'not-allowed',
    },
    actions: {
        display: 'flex',
        justifyContent: 'flex-end',
        marginTop: spacing.md,
    },
};

export const SegmentEditor: React.FC<SegmentEditorProps> = ({
    segments,
    onUpdateSegment,
    onAddSegment,
    onRemoveSegment,
    onRunMulti,
    isProcessing,
}) => {
    return (
        <div style={styles.container} data-testid="segment-editor">
            <div style={styles.header}>
                <span style={styles.title}>Manual Segments ({segments.length})</span>
            </div>

            {segments.map((segment, index) => (
                <div key={segment.id} style={styles.segmentCard} data-testid={`segment-${segment.id}`}>
                    <div style={styles.segmentHeader}>
                        <span style={styles.segmentId}>#{index + 1} • {segment.id}</span>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <select
                                style={styles.select}
                                value={segment.treatmentId}
                                onChange={(e) => onUpdateSegment(segment.id, { treatmentId: e.target.value })}
                                data-testid={`segment-treatment-${segment.id}`}
                            >
                                {TREATMENT_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                            {segments.length > 1 && (
                                <button
                                    style={styles.removeBtn}
                                    onClick={() => onRemoveSegment(segment.id)}
                                    data-testid={`remove-segment-${segment.id}`}
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>
                    <textarea
                        style={styles.textarea}
                        value={segment.dictationSlice}
                        onChange={(e) => onUpdateSegment(segment.id, { dictationSlice: e.target.value })}
                        placeholder="Diktat für dieses Segment..."
                        data-testid={`segment-dictation-${segment.id}`}
                    />
                </div>
            ))}

            <div style={styles.actions}>
                <button
                    style={styles.addBtn}
                    onClick={onAddSegment}
                    data-testid="add-segment-btn"
                >
                    + Segment hinzufügen
                </button>
                <button
                    style={{
                        ...styles.runBtn,
                        ...(isProcessing ? styles.runBtnDisabled : {}),
                    }}
                    onClick={onRunMulti}
                    disabled={isProcessing}
                    data-testid="run-multi-btn"
                >
                    {isProcessing ? 'Läuft...' : 'Multi ausführen'}
                </button>
            </div>
        </div>
    );
};

export default SegmentEditor;
