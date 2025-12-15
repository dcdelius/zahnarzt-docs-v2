/**
 * V7 Render Test — MUST NOT CRASH
 *
 * Tests that React components actually render without crashing.
 *
 * Requirements:
 * - render(<OutputRenderer output={mockOutput} />) must not throw
 * - render(<WarningCard warning={mockWarning} />) must not throw
 * - render(<QuestionRenderer .../>) must not throw
 */

import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';

// Import components
import { OutputRenderer } from '../../components/OutputRenderer';
import { WarningCard } from '../../components/WarningCard';
import { QuestionRenderer } from '../../components/QuestionRenderer';

// Import types from contracts (SSOT)
import type { ComposedOutput, ValidationWarning, DynamicQuestion } from '../types';

describe('V7 Render Tests (NO CRASH)', () => {
    const mockOutput: ComposedOutput = {
        sections: [
            {
                id: 'header',
                label: 'Kopf',
                content: 'Zahn 36, mo Komposit',
                lines: ['Zahn 36, mo Komposit'],
                format: 'text'
            },
            {
                id: 'treatment',
                label: 'Behandlung',
                content: 'Karies entfernt',
                lines: ['Karies entfernt'],
                format: 'text'
            }
        ],
        fullText: 'Zahn 36, mo Komposit\nKaries entfernt',
        billingCodes: ['BEMA_13b', 'BEMA_01'],
        warnings: [
            {
                id: 'devital_warning',
                type: 'warning',
                title: 'Devitaler Zahn',
                description: 'Endo-Indikation prüfen',
                affectedCodes: ['13c']
            }
        ]
    };

    const mockWarning: ValidationWarning = {
        id: 'test-warn',
        type: 'regress',
        title: 'REGRESS Warnung',
        description: 'Diese Kombination ist kritisch',
        affectedCodes: ['13a', '13b']
    };

    const mockQuestions: DynamicQuestion[] = [
        {
            id: 'vitality',
            category: 'forensic',
            question: 'Vitalität?',
            type: 'single',
            options: [
                { id: 'yes', label: 'Vital +' },
                { id: 'no', label: 'Devital -' }
            ]
        }
    ];

    it('OutputRenderer must not throw', () => {
        expect(() => {
            const html = renderToString(
                React.createElement(OutputRenderer, { output: mockOutput })
            );
            expect(html).toBeTruthy();
            expect(html).not.toContain('[object Object]');
        }).not.toThrow();
    });

    it('WarningCard must not throw', () => {
        expect(() => {
            const html = renderToString(
                React.createElement(WarningCard, { warning: mockWarning, index: 0 })
            );
            expect(html).toBeTruthy();
            expect(html).toContain('REGRESS Warnung');
            expect(html).not.toContain('[object Object]');
        }).not.toThrow();
    });

    it('QuestionRenderer must not throw', () => {
        expect(() => {
            const html = renderToString(
                React.createElement(QuestionRenderer, {
                    questions: mockQuestions,
                    answers: new Map(),
                    onAnswer: () => { },
                    onComplete: () => { }
                })
            );
            expect(html).toBeTruthy();
            expect(html).toContain('Vitalität?');
            expect(html).not.toContain('[object Object]');
        }).not.toThrow();
    });

    it('WarningCard renders all warning types correctly', () => {
        const types: ValidationWarning['type'][] = ['regress', 'warning', 'info'];

        types.forEach(type => {
            const warning: ValidationWarning = {
                id: `${type}-test`,
                type,
                title: `${type} Title`,
                description: `${type} description`,
                affectedCodes: ['CODE1']
            };

            expect(() => {
                const html = renderToString(
                    React.createElement(WarningCard, { warning, index: 0 })
                );
                expect(html).toContain(`${type} Title`);
            }).not.toThrow();
        });
    });

    it('OutputRenderer handles empty sections gracefully', () => {
        const emptyOutput: ComposedOutput = {
            sections: [],
            fullText: '',
            billingCodes: [],
            warnings: []
        };

        expect(() => {
            const html = renderToString(
                React.createElement(OutputRenderer, { output: emptyOutput })
            );
            expect(html).toBeTruthy();
        }).not.toThrow();
    });

    it('OutputRenderer handles warnings correctly', () => {
        expect(() => {
            const html = renderToString(
                React.createElement(OutputRenderer, { output: mockOutput })
            );
            // MUST NOT render warning objects directly (would cause [object Object])
            expect(html).not.toContain('[object Object]');
            // Should contain actual warning content
            expect(html).toContain('Devitaler Zahn');
        }).not.toThrow();
    });
});
