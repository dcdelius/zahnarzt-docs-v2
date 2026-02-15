/**
 * V10SegmentPreview — Segment Cards After Dictation
 * 
 * M37: Shows recognized segments with treatment, tooth, and negations.
 * Display only (no edit) for v1.
 */

import React from 'react';
import './V10SegmentPreview.css';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface SegmentPreviewData {
    id: string;
    treatmentType: 'endo' | 'fuellung' | 'unknown';
    tooth?: string;
    negations: string[];
    keywords: string[];
}

interface Props {
    segments: SegmentPreviewData[];
    loading?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function V10SegmentPreview({ segments, loading }: Props) {
    if (loading) {
        return (
            <div className="v10-segment-preview loading" data-testid="v10-segment-preview">
                <div className="v10-segment-loading">Analysiere Diktat...</div>
            </div>
        );
    }

    if (segments.length === 0) {
        return null;
    }

    return (
        <div className="v10-segment-preview" data-testid="v10-segment-preview">
            <div className="v10-segment-header">
                <span className="v10-segment-title">Erkannte Behandlungen</span>
            </div>

            <div className="v10-segment-cards">
                {segments.map(segment => (
                    <SegmentCard key={segment.id} segment={segment} />
                ))}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// SEGMENT CARD
// ═══════════════════════════════════════════════════════════════

interface SegmentCardProps {
    segment: SegmentPreviewData;
}

function SegmentCard({ segment }: SegmentCardProps) {
    const treatmentLabel = {
        endo: 'Endodontie',
        fuellung: 'Füllung',
        unknown: 'Unbekannt',
    }[segment.treatmentType];

    const treatmentColor = {
        endo: '#e74c3c',
        fuellung: '#3498db',
        unknown: '#7f8c8d',
    }[segment.treatmentType];

    return (
        <div
            className="v10-segment-card"
            data-testid={`v10-segment-card-${segment.id}`}
            style={{ borderLeftColor: treatmentColor }}
        >
            <div className="v10-segment-card-header">
                <span className="v10-segment-badge" style={{ backgroundColor: treatmentColor }}>
                    {treatmentLabel}
                </span>
                {segment.tooth && (
                    <span className="v10-segment-tooth">Zahn {segment.tooth}</span>
                )}
            </div>

            {segment.keywords.length > 0 && (
                <div className="v10-segment-keywords">
                    {segment.keywords.slice(0, 4).map((kw, i) => (
                        <span key={i} className="v10-segment-keyword">{kw}</span>
                    ))}
                </div>
            )}

            {segment.negations.length > 0 && (
                <div className="v10-segment-negations">
                    {segment.negations.map((neg, i) => (
                        <span key={i} className="v10-segment-negation">{neg}</span>
                    ))}
                </div>
            )}
        </div>
    );
}
