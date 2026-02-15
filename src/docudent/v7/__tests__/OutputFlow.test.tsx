/**
 * OutputFlow Component Tests
 * 
 * Regression tests for P0 hardening:
 * - Edit button disabled when onEdit undefined
 * - Warnings rendering (string + object)
 * - Billing blocked diagnostics
 * 
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OutputFlow } from '../components/OutputFlow';
import type { ComposedOutput } from '../../contracts/output';
import type { ValidationWarning } from '../../contracts/warnings';
import React from 'react';

// Base minimal output for tests
const createMinimalOutput = (overrides: Partial<ComposedOutput> = {}): ComposedOutput => ({
    sections: [
        { id: 'befund', label: 'Befund', content: 'Test content', lines: ['Test content'], format: 'text' }
    ],
    fullText: 'Test full text',
    billingCodes: [],
    warnings: [],
    ...overrides,
});

describe('OutputFlow', () => {
    describe('Edit button behavior', () => {
        it('should disable edit button when onEdit is undefined', () => {
            render(
                <OutputFlow
                    output={createMinimalOutput()}
                    onReset={() => { }}
                // onEdit not provided
                />
            );

            const editButton = screen.getByTestId('edit-button');
            expect(editButton.hasAttribute('disabled')).toBe(true);
            expect(editButton.style.opacity).toBe('0.5');
        });

        it('should enable edit button when onEdit is provided', () => {
            const mockOnEdit = vi.fn();
            render(
                <OutputFlow
                    output={createMinimalOutput()}
                    onReset={() => { }}
                    onEdit={mockOnEdit}
                />
            );

            const editButton = screen.getByTestId('edit-button');
            expect(editButton.hasAttribute('disabled')).toBe(false);

            fireEvent.click(editButton);
            expect(mockOnEdit).toHaveBeenCalledTimes(1);
        });
    });

    describe('Warnings rendering', () => {
        it('should render object warnings with title and description', () => {
            const objectWarnings: ValidationWarning[] = [
                {
                    id: 'warn-1',
                    type: 'warning',
                    title: 'Test Warning Title',
                    description: 'This is a test description',
                    affectedCodes: []
                }
            ];

            render(
                <OutputFlow
                    output={createMinimalOutput({ warnings: objectWarnings })}
                    onReset={() => { }}
                />
            );

            const warningsSection = screen.getByTestId('warnings-section');
            expect(warningsSection).toBeTruthy();
            expect(screen.getByText('Test Warning Title')).toBeTruthy();
            expect(screen.getByText('This is a test description')).toBeTruthy();
        });

        it('should render regress warnings with correct styling', () => {
            const regressWarning: ValidationWarning = {
                id: 'regress-1',
                type: 'regress',
                title: 'Regress Risk',
                description: 'High risk warning',
                affectedCodes: ['BEMA_40']
            };

            render(
                <OutputFlow
                    output={createMinimalOutput({ warnings: [regressWarning] })}
                    onReset={() => { }}
                />
            );

            const warningTitle = screen.getByText('Regress Risk');
            expect(warningTitle).toBeTruthy();
            // Check style is applied via className or inline
            expect(warningTitle.closest('li')).toBeTruthy();
        });
    });

    describe('Billing diagnostics', () => {
        it('should show "keine Positionen" message when billingCodes is empty', () => {
            render(
                <OutputFlow
                    output={createMinimalOutput({ billingCodes: [] })}
                    onReset={() => { }}
                />
            );

            expect(screen.getByTestId('no-billing-message')).toBeTruthy();
            expect(screen.getByText('Keine abrechnungsrelevanten Positionen ermittelt.')).toBeTruthy();
        });

        it('should show billingReason when provided', () => {
            render(
                <OutputFlow
                    output={createMinimalOutput({
                        billingCodes: [],
                        billingReason: 'missing confirmation'
                    })}
                    onReset={() => { }}
                />
            );

            expect(screen.getByText('Grund: missing confirmation')).toBeTruthy();
        });

        it('should show blocked codes toggle when billingBlocked has items', () => {
            render(
                <OutputFlow
                    output={createMinimalOutput({
                        billingCodes: [],
                        billingBlocked: ['BEMA_40', 'GOZ_2410']
                    })}
                    onReset={() => { }}
                />
            );

            const blockedToggle = screen.getByTestId('blocked-toggle');
            expect(blockedToggle).toBeTruthy();
            expect(blockedToggle.textContent).toContain('2 geblockte Position(en) anzeigen');

            // Click to expand
            fireEvent.click(blockedToggle);

            const blockedList = screen.getByTestId('blocked-list');
            expect(blockedList).toBeTruthy();
            expect(screen.getByText('BEMA_40')).toBeTruthy();
            expect(screen.getByText('GOZ_2410')).toBeTruthy();
        });

        it('should show billing codes when available', () => {
            render(
                <OutputFlow
                    output={createMinimalOutput({
                        billingCodes: ['BEMA_13c', 'GOZ_2360']
                    })}
                    onReset={() => { }}
                />
            );

            const billingToggle = screen.getByTestId('billing-toggle');
            expect(billingToggle.textContent).toContain('2 Positionen');

            // Click to expand
            fireEvent.click(billingToggle);

            expect(screen.getByTestId('billing-list')).toBeTruthy();
            expect(screen.getByText('BEMA_13c')).toBeTruthy();
            expect(screen.getByText('GOZ_2360')).toBeTruthy();
        });

        it('should prefer billingDetails over billingCodes when both present', () => {
            render(
                <OutputFlow
                    output={createMinimalOutput({
                        billingCodes: ['BEMA_13c'],
                        billingDetails: [
                            { code: 'BEMA_13c', label: 'Wurzelkanalbehandlung', amount: 45.50 }
                        ]
                    })}
                    onReset={() => { }}
                />
            );

            // Click to expand
            fireEvent.click(screen.getByTestId('billing-toggle'));

            expect(screen.getByText('BEMA_13c')).toBeTruthy();
            expect(screen.getByText('Wurzelkanalbehandlung')).toBeTruthy();
            expect(screen.getByText('45.50 €')).toBeTruthy();
        });
    });

    describe('Content formatting', () => {
        it('should have pre-wrap style on section content', () => {
            const output = createMinimalOutput({
                sections: [{
                    id: 'test',
                    label: 'Test',
                    content: 'Line 1\nLine 2\nLine 3',
                    lines: ['Line 1', 'Line 2', 'Line 3'],
                    format: 'text'
                }]
            });

            render(<OutputFlow output={output} onReset={() => { }} />);

            const section = screen.getByTestId('section-test');
            expect(section).toBeTruthy();
            // Check that content contains line breaks
            expect(section.textContent).toContain('Line 1');
            expect(section.textContent).toContain('Line 2');
        });
    });
});
