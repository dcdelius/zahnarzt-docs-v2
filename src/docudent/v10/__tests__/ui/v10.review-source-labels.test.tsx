/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { V10ReviewSummaryCard } from '../../components/V10ReviewSummaryCard';
import type { V10ReviewContext } from '../../types';

describe('V10ReviewSummaryCard source labels', () => {
    it('shows provenance badges for displayed pills', () => {
        const review: V10ReviewContext = {
            instances: [
                {
                    instanceId: 'fuellung-16-1',
                    treatmentId: 'fuellung',
                    teeth: ['16'],
                    tooth: '16',
                    standardChipIds: [],
                    extractedSummary: {
                        tooth: '16',
                        surfaces: ['m', 'o'],
                        diagnosis: null,
                    },
                    facts: {
                        anesthesia: 'leitung',
                        kofferdamUsed: true,
                        cariesDepth: 'profunda',
                        capping: { performed: 'yes', material: 'MTA' },
                        pulpaOpened: false,
                    },
                    factSources: {
                        anesthesia: 'askback',
                        kofferdam: 'settings',
                        cariesDepth: 'dictation',
                        capping: 'manual',
                    },
                },
            ],
        };

        render(<V10ReviewSummaryCard review={review} />);

        expect(screen.getByText('Anästhesie: Leitung')).toBeInTheDocument();
        expect(screen.getByText('Kofferdam')).toBeInTheDocument();
        expect(screen.getByText('Tiefe: profunda')).toBeInTheDocument();
        expect(screen.getByText('Überkappung: indirekt')).toBeInTheDocument();

        expect(screen.getByText('Rückfrage')).toBeInTheDocument();
        expect(screen.getByText('Einstellung')).toBeInTheDocument();
        expect(screen.getByText('Diktat')).toBeInTheDocument();
        expect(screen.getByText('Manuell')).toBeInTheDocument();
    });
});
