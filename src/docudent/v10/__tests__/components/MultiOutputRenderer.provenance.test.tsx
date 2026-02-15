// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MultiOutputRenderer } from '../../components/MultiOutputRenderer';
import type { MultiTreatmentResult } from '../../multitreatment/types';

describe('MultiOutputRenderer provenance summary', () => {
    it('renders provenance source counters when available', () => {
        const result: MultiTreatmentResult = {
            aggregatedState: 'output',
            runs: [],
            perTreatmentBundles: {},
            mergedOutput: { fullText: 'ok', billingCodes: [], warnings: [] },
            aggregatedCopyText: 'ok',
            billingCodes: [{ code: 'BEMA_13', type: 'BEMA', scope: 'TOOTH', tooth: '36', instanceId: 'inst-36' }],
            conflicts: [],
            combinability: null,
            warnings: [],
            provenanceSummary: {
                dictation: 3,
                settings: 2,
                askback: 1,
                manual: 0,
            },
            executionMeta: {
                kbReleaseId: 'kb-2026-02-15',
                outputHash: 'h1234abcd',
            },
            billingTrace: [
                {
                    code: 'BEMA_13',
                    instanceId: 'inst-36',
                    tooth: '36',
                    scope: 'TOOTH',
                    kbReleaseId: 'kb-2026-02-15',
                },
            ],
        };

        render(<MultiOutputRenderer result={result} onReset={() => {}} />);

        expect(screen.getByText('Herkunft Fakten')).toBeTruthy();
        expect(screen.getByText('dictation: 3')).toBeTruthy();
        expect(screen.getByText('settings: 2')).toBeTruthy();
        expect(screen.getByText('askback: 1')).toBeTruthy();
        expect(screen.getByText('manual: 0')).toBeTruthy();
        expect(screen.getByText('kb: kb-2026-02-15')).toBeTruthy();
        expect(screen.getByText('hash: h1234abcd')).toBeTruthy();
        expect(screen.getByText('BEMA_13 (36) · inst-36')).toBeTruthy();
        expect(screen.getByTestId('multi-billing-trace')).toBeTruthy();
        const rows = screen.getAllByText((_, node) =>
            node?.textContent === 'BEMA_13 · inst-36 · Zahn 36 · TOOTH · kb-2026-02-15'
        );
        expect(rows.length).toBeGreaterThan(0);
    });
});
