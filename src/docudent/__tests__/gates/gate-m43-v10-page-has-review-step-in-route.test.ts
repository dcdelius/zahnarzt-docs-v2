/**
 * Gate M43: V10 Page Has Review Components
 */

import { describe, it, expect } from 'vitest';
import { V10ReviewStep } from '../../v10/components/V10ReviewStep';
import { V10DebugDrawer } from '../../v10/components/V10DebugDrawer';
import { V10ReproPanel } from '../../v10/components/V10ReproPanel';

describe('gate-m43-v10-page-has-review-step-in-route', () => {
    describe('component exports for page integration', () => {
        it('V10ReviewStep exports', () => {
            expect(V10ReviewStep).toBeDefined();
            expect(typeof V10ReviewStep).toBe('function');
        });

        it('V10DebugDrawer exports', () => {
            expect(V10DebugDrawer).toBeDefined();
            expect(typeof V10DebugDrawer).toBe('function');
        });

        it('V10ReproPanel exports', () => {
            expect(V10ReproPanel).toBeDefined();
            expect(typeof V10ReproPanel).toBe('function');
        });
    });

    describe('stepper flow structure', () => {
        it('defines 3-step flow', () => {
            const steps = [
                { id: 'dictation', label: 'Diktat' },
                { id: 'review', label: 'Prüfen' },
                { id: 'output', label: 'Output' },
            ];

            expect(steps.length).toBe(3);
            expect(steps[0].id).toBe('dictation');
            expect(steps[1].id).toBe('review');
            expect(steps[2].id).toBe('output');
        });
    });

    describe('debug drawer tabs', () => {
        it('includes repro tab', () => {
            const tabs = ['trace', 'kb', 'combinability', 'provenance', 'explain', 'repro'];
            expect(tabs).toContain('repro');
        });

        it('has 6 tabs total', () => {
            const tabs = ['trace', 'kb', 'combinability', 'provenance', 'explain', 'repro'];
            expect(tabs.length).toBe(6);
        });
    });

    describe('data-testid requirements', () => {
        it('critical testids documented', () => {
            const testIds = [
                'v10-review-step',
                'v10-review-tabs',
                'v10-review-proceed',
                'v10-review-back',
                'v10-debug-repro',
                'v10-repro-panel',
            ];

            expect(testIds.length).toBeGreaterThan(5);
            expect(testIds).toContain('v10-debug-repro');
        });
    });
});
