/**
 * V10AskbackExplain — "Warum?" Tooltip for Questions
 * 
 * M37: Shows why a question was asked (trigger, scope).
 */

import React, { useState } from 'react';
import './V10AskbackExplain.css';
import type { AskbackProvenance } from '../settings/conflictResolution';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface Props {
    provenance: AskbackProvenance;
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function V10AskbackExplain({ provenance }: Props) {
    const [isOpen, setIsOpen] = useState(false);

    const scopeLabel = provenance.scope ?
        (provenance.scope === 'endo' ? 'Endodontie' :
            provenance.scope === 'fuellung' ? 'Füllung' : 'Global')
        : 'Global';

    return (
        <div className="v10-askback-explain">
            <button
                className="v10-explain-trigger"
                onClick={() => setIsOpen(!isOpen)}
                data-testid={`v10-explain-${provenance.id}`}
            >
                ?
            </button>

            {isOpen && (
                <div className="v10-explain-popover" data-testid={`v10-explain-popover-${provenance.id}`}>
                    <div className="v10-explain-header">
                        <span>Warum diese Frage?</span>
                        <button className="v10-explain-close" onClick={() => setIsOpen(false)}>×</button>
                    </div>

                    <div className="v10-explain-content">
                        {provenance.whyAsked && (
                            <div className="v10-explain-row">
                                <span className="v10-explain-label">Grund:</span>
                                <span className="v10-explain-value">{provenance.whyAsked}</span>
                            </div>
                        )}

                        <div className="v10-explain-row">
                            <span className="v10-explain-label">Scope:</span>
                            <span className="v10-explain-value">{scopeLabel}</span>
                        </div>

                        {provenance.sourceRefs && provenance.sourceRefs.length > 0 && (
                            <div className="v10-explain-row">
                                <span className="v10-explain-label">Quellen:</span>
                                <span className="v10-explain-value">
                                    {provenance.sourceRefs.join(', ')}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// SKIPPED ASKBACKS LIST (Debug Drawer)
// ═══════════════════════════════════════════════════════════════

interface SkippedAskbacksProps {
    askbacks: AskbackProvenance[];
}

export function V10SkippedAskbacksList({ askbacks }: SkippedAskbacksProps) {
    if (askbacks.length === 0) {
        return (
            <div className="v10-skipped-askbacks empty" data-testid="v10-skipped-askbacks">
                <p className="v10-skipped-empty">Keine übersprungenen Fragen</p>
            </div>
        );
    }

    return (
        <div className="v10-skipped-askbacks" data-testid="v10-skipped-askbacks">
            <div className="v10-skipped-header">
                <span className="v10-skipped-title">Übersprungene Fragen ({askbacks.length})</span>
            </div>

            <div className="v10-skipped-list">
                {askbacks.map(askback => (
                    <div key={askback.id} className="v10-skipped-item" data-testid={`v10-skipped-${askback.id}`}>
                        <span className="v10-skipped-id">{askback.id}</span>
                        <span className="v10-skipped-reason">{askback.whySkipped}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
