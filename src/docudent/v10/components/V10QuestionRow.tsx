import React from 'react';
import { motion } from 'framer-motion';

import type { DynamicQuestion } from '../../contracts/questions';
import { colors, radii, shadows, typography, motion as motionTokens } from '../styles/tokens';
import { V10OptionPillButton } from './V10OptionPillButton';

interface Props {
    question: DynamicQuestion;
    value: unknown;
    onChange: (value: unknown) => void;
    isMedical?: boolean;
    variant?: 'card' | 'bare';
    parseNumber?: (raw: string) => number | undefined;
    optionTestId?: (option: { id: string; label: string }) => string;
}

type QuestionOptionLoose = {
    id?: string;
    label: string;
    dataValue?: unknown;
};

function defaultParseNumber(raw: string): number | undefined {
    const trimmed = raw.trim();
    if (trimmed.length === 0) return undefined;
    const normalized = trimmed.replace(',', '.').replace(/[^\d.]/g, '');
    const amount = Number.parseFloat(normalized);
    return Number.isFinite(amount) ? amount : undefined;
}

function defaultOptionTestId(option: { id: string; label: string }) {
    return `option-${option.label}`;
}

function buildInputTestId(questionId: string) {
    return `input-${questionId}`;
}

function resolveOptionId(option: QuestionOptionLoose): string {
    if (typeof option.id === 'string' && option.id.trim().length > 0) {
        return option.id;
    }
    if (typeof option.dataValue === 'string' && option.dataValue.trim().length > 0) {
        return option.dataValue;
    }
    return option.label;
}

function resolveOptionValue(option: QuestionOptionLoose): unknown {
    return option.dataValue ?? resolveOptionId(option);
}

function isOptionActive(value: unknown, option: QuestionOptionLoose): boolean {
    const resolvedId = resolveOptionId(option);
    const resolvedValue = resolveOptionValue(option);
    return value === resolvedValue || value === resolvedId || value === option.label;
}

export function V10QuestionRow({
    question,
    value,
    onChange,
    isMedical,
    variant = 'card',
    parseNumber = defaultParseNumber,
    optionTestId = defaultOptionTestId,
}: Props) {
    const { id, question: label, type, options } = question;
    const displayLabel = label || question.questionKey || id || '(Frage)';

    const containerStyle: React.CSSProperties = variant === 'bare'
        ? {
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: 12,
              padding: '10px 2px',
              borderRadius: radii.cardSmall,
              background: 'transparent',
              boxShadow: 'none',
          }
        : {
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: 12,
              padding: '16px 18px',
              borderRadius: radii.cardSmall,
              background: colors.surfaceGlass,
              boxShadow: shadows.cardSoft,
              backdropFilter: 'blur(14px)',
          };

    return (
        <motion.div
            style={containerStyle}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: motionTokens.durationSmall, ease: motionTokens.easing }}
            data-testid={`question-row-${id}`}
        >
            <div>
                <h3 style={{
                    margin: 0,
                    fontSize: typography.subtitle,
                    fontWeight: typography.semibold,
                    fontFamily: typography.fontFamily,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    color: colors.textPrimary,
                }}>
                    {displayLabel}
                    {isMedical ? (
                        <span
                            style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: colors.coralAccent,
                                boxShadow: shadows.buttonGlow,
                            }}
                            title="Medizinisch erforderlich"
                        />
                    ) : null}
                </h3>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {type === 'single' && options && options.length > 0 && options.map((opt) => (
                    <V10OptionPillButton
                        key={resolveOptionId(opt)}
                        label={opt.label}
                        isActive={isOptionActive(value, opt)}
                        onClick={() => onChange(resolveOptionValue(opt))}
                        testId={optionTestId({ id: resolveOptionId(opt), label: opt.label })}
                    />
                ))}

                {type === 'single' && (!options || options.length === 0) && (
                    <div style={{
                        padding: '12px 16px',
                        background: 'rgba(220, 53, 69, 0.1)',
                        border: '1px solid rgba(220, 53, 69, 0.3)',
                        borderRadius: radii.cardSmall,
                        color: '#dc3545',
                        fontSize: 13,
                    }} data-testid="error-no-options">
                        <strong>Frage defekt:</strong> Keine Optionen definiert
                        {import.meta.env.DEV && (
                            <div style={{ fontSize: 11, marginTop: 4, fontFamily: 'monospace' }}>
                                id: {id} | questionKey: {question.questionKey}
                            </div>
                        )}
                    </div>
                )}

                {type === 'number' && (
                    <input
                        type="number"
                        value={typeof value === 'number' ? String(value) : ''}
                        onChange={(event) => onChange(parseNumber(event.target.value))}
                        min={question.min}
                        max={question.max}
                        step={question.step}
                        style={{
                            width: 140,
                            textAlign: 'center',
                            padding: '10px',
                            borderRadius: radii.pill,
                            border: 'none',
                            background: colors.surfaceGlass,
                            color: colors.textPrimary,
                            fontSize: 16,
                            fontWeight: 700,
                            boxShadow: shadows.cardInput,
                        }}
                        data-testid={buildInputTestId(id)}
                    />
                )}

                {type === 'text' && (
                    <textarea
                        value={value !== undefined ? String(value) : ''}
                        onChange={(event) => onChange(event.target.value || undefined)}
                        rows={2}
                        placeholder="Freitext eingeben"
                        style={{
                            width: '100%',
                            maxWidth: 360,
                            padding: '10px 12px',
                            borderRadius: radii.cardSmall,
                            border: 'none',
                            fontSize: 14,
                            resize: 'vertical',
                            background: colors.surfaceGlass,
                            color: colors.textPrimary,
                            boxShadow: shadows.cardInput,
                        }}
                        data-testid={buildInputTestId(id)}
                    />
                )}

                {type === 'perCanalTable' && (
                    <textarea
                        value={value !== undefined ? String(value) : ''}
                        onChange={(event) => onChange(event.target.value || undefined)}
                        rows={3}
                        placeholder="Beispiel: MB: 19, ML: 18, D: 20"
                        style={{
                            width: '100%',
                            maxWidth: 360,
                            padding: '10px 12px',
                            borderRadius: radii.cardSmall,
                            border: 'none',
                            fontSize: 14,
                            fontFamily: 'monospace',
                            resize: 'vertical',
                            background: colors.surfaceGlass,
                            color: colors.textPrimary,
                            boxShadow: shadows.cardInput,
                        }}
                        data-testid={buildInputTestId(id)}
                    />
                )}

                {type === 'multi' && options?.map((opt) => {
                    const currentArray = Array.isArray(value) ? value : [];
                    const resolvedValue = resolveOptionValue(opt);
                    const isSelected = currentArray.includes(resolvedValue);
                    return (
                        <V10OptionPillButton
                            key={resolveOptionId(opt)}
                            label={opt.label}
                            isActive={isSelected}
                            onClick={() => {
                                if (isSelected) {
                                    onChange(currentArray.filter(v => v !== resolvedValue));
                                } else {
                                    onChange([...currentArray, resolvedValue]);
                                }
                            }}
                            testId={optionTestId({ id: resolveOptionId(opt), label: opt.label })}
                        />
                    );
                })}

                {!type && options && options.map((opt) => (
                    <V10OptionPillButton
                        key={resolveOptionId(opt)}
                        label={opt.label}
                        isActive={isOptionActive(value, opt)}
                        onClick={() => onChange(resolveOptionValue(opt))}
                        testId={optionTestId({ id: resolveOptionId(opt), label: opt.label })}
                    />
                ))}

                {/* Small hint: unsupported type */}
                {type && type !== 'single' && type !== 'multi' && type !== 'number' && type !== 'text' && type !== 'perCanalTable' && (
                    <div style={{
                        padding: '10px 12px',
                        borderRadius: radii.cardSmall,
                        background: colors.surfaceGlass,
                        color: colors.textSecondary,
                        fontSize: 13,
                        boxShadow: shadows.cardInput,
                    }}>
                        Unbekannter Fragetyp: <span style={{ fontFamily: 'monospace' }}>{String(type)}</span>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
