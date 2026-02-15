import React from 'react';
import { ChevronRight } from 'lucide-react';
import './ValueCapsule.css';

interface Props {
    value: string;
    onOpen: () => void;
    helper?: string;
    disabled?: boolean;
}

export function ValueCapsule({ value, onOpen, helper, disabled = false }: Props) {
    return (
        <button
            type="button"
            className="v10-value-capsule"
            onClick={onOpen}
            disabled={disabled}
            aria-label={helper ?? 'Wert bearbeiten'}
        >
            <span className="v10-value-capsule-text">{value}</span>
            <span className="v10-value-capsule-icon">
                <ChevronRight size={16} />
            </span>
        </button>
    );
}
