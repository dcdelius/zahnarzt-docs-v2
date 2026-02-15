import React from 'react';
import { ChevronDown, Check } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import './ValueFieldSelect.css';

interface Option {
    value: string;
    label: string;
}

interface Props {
    value: string;
    options: Option[];
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
}

export function ValueFieldSelect({
    value,
    options,
    onChange,
    placeholder = 'Auswählen...',
    disabled = false,
}: Props) {
    return (
        <Select value={value} onValueChange={onChange} disabled={disabled}>
            <SelectTrigger className="v10-value-select-trigger">
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent className="v10-value-select-content">
                {options.map((opt) => (
                    <SelectItem
                        key={opt.value}
                        value={opt.value}
                        className="v10-value-select-item"
                    >
                        {opt.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
