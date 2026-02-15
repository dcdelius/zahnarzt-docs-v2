/**
 * V10Stepper — 3-Stage Navigation
 * 
 * M38: Diktat → Chips/Fragen → Output
 */

import React from 'react';
import './V10Stepper.css';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type V10Stage = 'diktat' | 'review' | 'output';

interface Props {
    currentStage: V10Stage;
    onStageChange: (stage: V10Stage) => void;
    canProceed: boolean;
    canGoBack: boolean;
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function V10Stepper({ currentStage, onStageChange, canProceed, canGoBack }: Props) {
    const stages: Array<{ id: V10Stage; label: string }> = [
        { id: 'diktat', label: 'Diktat' },
        { id: 'review', label: 'Chips & Fragen' },
        { id: 'output', label: 'Output' },
    ];

    const currentIndex = stages.findIndex(s => s.id === currentStage);

    return (
        <div className="v10-stepper" data-testid="v10-stepper">
            <div className="v10-stepper-track">
                {stages.map((stage, index) => {
                    const isActive = stage.id === currentStage;
                    const isCompleted = index < currentIndex;
                    const isClickable = index <= currentIndex || (index === currentIndex + 1 && canProceed);

                    return (
                        <React.Fragment key={stage.id}>
                            {index > 0 && (
                                <div className={`v10-stepper-line ${isCompleted ? 'completed' : ''}`} />
                            )}
                            <button
                                className={`v10-stepper-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                                onClick={() => isClickable && onStageChange(stage.id)}
                                disabled={!isClickable}
                                data-testid={`v10-step-${stage.id}`}
                            >
                                <span className="v10-step-label">{stage.label}</span>
                            </button>
                        </React.Fragment>
                    );
                })}
            </div>

            <div className="v10-stepper-actions">
                {currentStage !== 'diktat' && (
                    <button
                        className="v10-stepper-back"
                        onClick={() => {
                            const prevStage = stages[currentIndex - 1];
                            if (prevStage) onStageChange(prevStage.id);
                        }}
                        disabled={!canGoBack}
                        data-testid="v10-stepper-back"
                    >
                        ← Zurück
                    </button>
                )}

                {currentStage !== 'output' && (
                    <button
                        className="v10-stepper-next"
                        onClick={() => {
                            const nextStage = stages[currentIndex + 1];
                            if (nextStage) onStageChange(nextStage.id);
                        }}
                        disabled={!canProceed}
                        data-testid="v10-stepper-next"
                    >
                        Weiter →
                    </button>
                )}
            </div>
        </div>
    );
}
