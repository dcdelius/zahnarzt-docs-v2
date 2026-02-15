// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QuestionsFlowV2 } from '../../components/QuestionsFlowV2';
import type { QuestionBundle } from '../../../contracts/questions';
import type { V10ReviewContext } from '../../types';

describe('QuestionsFlowV2 lane board', () => {
    it('filters askbacks by selected treatment lane', () => {
        const bundle: QuestionBundle = {
            required: [
                {
                    id: 'inst-a::q1',
                    instanceId: 'inst-a',
                    category: 'medical',
                    question: 'Frage A',
                    type: 'single',
                    options: [{ id: 'ja', label: 'Ja' }],
                    medicalSeverity: 'hard',
                },
                {
                    id: 'inst-b::q2',
                    instanceId: 'inst-b',
                    category: 'medical',
                    question: 'Frage B',
                    type: 'single',
                    options: [{ id: 'ja', label: 'Ja' }],
                    medicalSeverity: 'hard',
                },
            ],
            optionalVisible: [],
            optionalHidden: [],
            optionalTotal: 0,
            docMode: 'balanced',
        };

        const review: V10ReviewContext = {
            instances: [
                {
                    instanceId: 'inst-a',
                    treatmentId: 'fuellung',
                    teeth: ['36'],
                    tooth: '36',
                    standardChipIds: [],
                    extractedSummary: { tooth: '36', surfaces: ['o'], diagnosis: null },
                    facts: {},
                    factSources: { anesthesia: 'dictation' },
                },
                {
                    instanceId: 'inst-b',
                    treatmentId: 'endo',
                    teeth: ['46'],
                    tooth: '46',
                    standardChipIds: [],
                    extractedSummary: { tooth: '46', surfaces: [], diagnosis: null },
                    facts: {},
                    factSources: { workingLengthMethod: 'askback' },
                },
            ],
        };

        render(
            <QuestionsFlowV2
                bundle={bundle}
                answers={new Map()}
                onAnswer={() => {}}
                onComplete={() => {}}
                review={review}
            />
        );

        expect(screen.getByTestId('v10-askback-lane-board')).toBeTruthy();
        expect(screen.getByText('Frage A')).toBeTruthy();

        fireEvent.click(screen.getByTestId('v10-askback-lane-inst-b'));

        expect(screen.queryByText('Frage A')).toBeNull();
        expect(screen.getByText('Frage B')).toBeTruthy();
    });
});
