/**
 * V10InstanceSummary — Per-Instance Summary Cards
 * 
 * M35: Mini-card for each instance showing tooth, treatment, state, 
 * chips count, and billing count.
 */

import React from 'react';
import { getPack } from '../packs';
import './V10InstanceSummary.css';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface InstanceSummaryData {
    id: string;
    treatmentType: 'endo' | 'fuellung' | string;
    treatmentId?: string;
    tooth?: string;
    state: 'idle' | 'questions' | 'output' | 'error';
    chipsCount: number;
    billingCount: number;
    askbacksCount: number;
}

interface Props {
    instances: InstanceSummaryData[];
    selectedInstanceId?: string;
    onSelectInstance?: (instanceId: string) => void;
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function V10InstanceSummary({ instances, selectedInstanceId, onSelectInstance }: Props) {
    if (instances.length === 0) {
        return null;
    }

    return (
        <div className="v10-instance-summary" data-testid="v10-instance-summary">
            <div className="v10-summary-header">
                <span className="v10-summary-title">Behandlungen</span>
            </div>

            <div className="v10-summary-cards">
                {instances.map(instance => (
                    <InstanceCard
                        key={instance.id}
                        instance={instance}
                        isSelected={selectedInstanceId === instance.id}
                        onClick={() => onSelectInstance?.(instance.id)}
                    />
                ))}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// INSTANCE CARD
// ═══════════════════════════════════════════════════════════════

interface InstanceCardProps {
    instance: InstanceSummaryData;
    isSelected: boolean;
    onClick: () => void;
}

function InstanceCard({ instance, isSelected, onClick }: InstanceCardProps) {
    const treatmentId = instance.treatmentId ?? instance.treatmentType;
    const pack = treatmentId ? getPack(treatmentId) : null;
    const treatmentLabel = pack?.meta?.label ?? (instance.treatmentType === 'endo' ? 'Endo' : instance.treatmentType === 'fuellung' ? 'Füllung' : String(treatmentId));
    const treatmentColor = instance.treatmentType === 'endo' ? 'var(--endo-color, #e74c3c)' : 'var(--fuellung-color, #3498db)';

    const stateLabel = {
        idle: 'Idle',
        questions: 'Fragen',
        output: 'Output',
        error: 'Fehler',
    }[instance.state];

    const stateClass = {
        idle: 'state-idle',
        questions: 'state-questions',
        output: 'state-output',
        error: 'state-error',
    }[instance.state];

    return (
        <div
            className={`v10-instance-card ${isSelected ? 'selected' : ''} ${stateClass}`}
            onClick={onClick}
            data-testid={`v10-instance-card-${instance.treatmentType}`}
            style={{ '--instance-color': treatmentColor } as React.CSSProperties}
        >
            <div className="v10-card-header">
                <span className="v10-card-badge" style={{ backgroundColor: treatmentColor }}>
                    {treatmentLabel}
                </span>
                <span className="v10-card-state">{stateLabel}</span>
            </div>

            {instance.tooth && (
                <div className="v10-card-tooth">
                    Zahn {instance.tooth}
                </div>
            )}

            <div className="v10-card-stats">
                <div className="v10-card-stat" title="Chips">
                    <span className="stat-value">{instance.chipsCount}</span>
                </div>
                <div className="v10-card-stat" title="Billing">
                    <span className="stat-value">{instance.billingCount}</span>
                </div>
                {instance.askbacksCount > 0 && (
                    <div className="v10-card-stat" title="Fragen">
                        <span className="stat-value">{instance.askbacksCount}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
