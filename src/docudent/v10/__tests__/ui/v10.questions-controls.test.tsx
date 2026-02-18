/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { QuestionsFlowV2 } from '../../components/QuestionsFlowV2';

describe('QuestionsFlowV2 controls', () => {
    it('hides optional toggle when there are no hidden optional questions', () => {
        render(
            <QuestionsFlowV2
                bundle={{
                    required: [],
                    optionalVisible: [
                        {
                            id: 'optional_question_1',
                            questionKey: 'optional_question_1',
                            question: 'Optional Frage',
                            category: 'forensic',
                            type: 'single',
                            options: [
                                { id: 'ja', label: 'Ja', dataValue: 'ja' },
                                { id: 'nein', label: 'Nein', dataValue: 'nein' },
                            ],
                            medicalSeverity: 'soft',
                        },
                    ],
                    optionalHidden: [],
                    optionalTotal: 1,
                    docMode: 'balanced',
                }}
                answers={new Map()}
                onAnswer={vi.fn()}
                onComplete={vi.fn()}
            />
        );

        expect(screen.queryByTestId('optional-toggle')).not.toBeInTheDocument();
        expect(screen.getByText('Optional Frage')).toBeInTheDocument();
    });

    it('exposes deterministic completion-state hook for automation', () => {
        render(
            <QuestionsFlowV2
                bundle={{
                    required: [
                        {
                            id: 'r1',
                            questionKey: 'r1',
                            question: 'Pflichtfrage',
                            category: 'forensic',
                            type: 'text',
                            medicalSeverity: 'hard',
                        },
                    ],
                    optionalVisible: [],
                    optionalHidden: [],
                    optionalTotal: 0,
                    docMode: 'balanced',
                }}
                answers={new Map()}
                onAnswer={vi.fn()}
                onComplete={vi.fn()}
            />
        );

        const completionState = screen.getByTestId('v10-questions-completion-state');
        expect(completionState).toHaveAttribute('data-required-total', '1');
        expect(completionState).toHaveAttribute('data-required-answered', '0');
        expect(completionState).toHaveAttribute('data-can-complete', 'false');
    });
});
