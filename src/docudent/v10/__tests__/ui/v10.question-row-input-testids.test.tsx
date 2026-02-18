/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import type { DynamicQuestion } from '../../../contracts/questions';
import { V10QuestionRow } from '../../components/V10QuestionRow';

function renderRow(question: DynamicQuestion) {
    render(
        <V10QuestionRow
            question={question}
            value={undefined}
            onChange={vi.fn()}
            variant="bare"
        />
    );
}

describe('V10QuestionRow input testids', () => {
    it('adds stable input-testid for text askbacks', () => {
        renderRow({
            id: 'radiology_indication',
            questionKey: 'radiology_indication',
            question: 'Roentgen-Indikation dokumentieren',
            category: 'forensic',
            type: 'text',
            medicalSeverity: 'hard',
        });

        expect(screen.getByTestId('input-radiology_indication')).toBeInTheDocument();
    });

    it('adds stable input-testid for perCanalTable askbacks', () => {
        renderRow({
            id: 'endo_working_length_table',
            questionKey: 'endo_working_length_table',
            question: 'Arbeitslaengen dokumentieren',
            category: 'forensic',
            type: 'perCanalTable',
            medicalSeverity: 'hard',
        });

        expect(screen.getByTestId('input-endo_working_length_table')).toBeInTheDocument();
    });
});

