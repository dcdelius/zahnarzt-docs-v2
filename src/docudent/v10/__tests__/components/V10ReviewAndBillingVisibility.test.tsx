// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { V10ReviewSummaryCard } from '../../components/V10ReviewSummaryCard';
import { V10PostAnalysisDashboard } from '../../components/V10PostAnalysisDashboard';
import type { V10PipelineMeta, V10ReviewContext } from '../../types';

describe('V10 review/billing visibility', () => {
    it('shows Komposit material pill in review summary when material fact is present', () => {
        const review: V10ReviewContext = {
            instances: [
                {
                    instanceId: 'inst-36',
                    treatmentId: 'fuellung',
                    teeth: ['36'],
                    tooth: '36',
                    standardChipIds: [],
                    extractedSummary: { tooth: '36', surfaces: ['m', 'o'], diagnosis: 'karies' },
                    facts: {
                        materialMentioned: 'komposit',
                    },
                    factSources: {
                        material: 'dictation',
                    },
                },
            ],
        };

        render(<V10ReviewSummaryCard review={review} />);

        expect(screen.getByText('Material: Komposit')).toBeTruthy();
    });

    it('shows billing codes in postanalysis even when output billing array is empty', () => {
        const meta: V10PipelineMeta = {
            engineUsed: 'v10',
            instanceCount: 1,
            multiInstance: false,
            billingCompleteness: {
                isComplete: true,
                origins: [
                    { code: 'BEMA_13A', origin: 'chip.billingRef', ref: 'chip:fuellung_surface' },
                    { code: 'GOZ_2197', origin: 'chip.billingRef', ref: 'chip:adhesive' },
                ],
                missing: [],
            },
        };

        render(
            <V10PostAnalysisDashboard
                treatmentId="fuellung"
                instances={[{ instanceId: 'inst-36', treatmentId: 'fuellung', tooth: '36' }]}
                dictationChips={{ 'inst-36': [] }}
                settingsChips={{ 'inst-36': [] }}
                overridesByInstance={{}}
                onOverride={() => {}}
                onResetOverride={() => {}}
                onResetAllOverrides={() => {}}
                questions={[]}
                answers={new Map()}
                onApplyAnswers={() => {}}
                meta={meta}
                billingCodes={[]}
            />
        );

        const container = screen.getByTestId('v10-postanalysis-billing-codes');
        expect(container.textContent).toContain('BEMA_13A');
        expect(container.textContent).toContain('GOZ_2197');
    });
});
