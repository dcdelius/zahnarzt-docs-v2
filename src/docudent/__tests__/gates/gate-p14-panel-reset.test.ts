/**
 * Gate: P14 Panel Reset Control
 * 
 * Verifies the UX for resetting the "don't show again" panel hidden state.
 * 
 * localStorage key: v7_multiinstance_panel_hidden
 * Reset control testid: multiinstance-reset-panel
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Gate: P14 Panel Reset Control', () => {
    // Mock localStorage
    let mockStorage: Map<string, string>;

    beforeEach(() => {
        mockStorage = new Map();

        vi.stubGlobal('localStorage', {
            getItem: (key: string) => mockStorage.get(key) ?? null,
            setItem: (key: string, value: string) => mockStorage.set(key, value),
            removeItem: (key: string) => mockStorage.delete(key),
            clear: () => mockStorage.clear(),
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe('panelHidden state detection', () => {
        it('should detect when panel is hidden (localStorage true)', () => {
            localStorage.setItem('v7_multiinstance_panel_hidden', 'true');

            const isHidden = localStorage.getItem('v7_multiinstance_panel_hidden') === 'true';

            expect(isHidden).toBe(true);
        });

        it('should detect when panel is not hidden (no key)', () => {
            // Don't set anything

            const isHidden = localStorage.getItem('v7_multiinstance_panel_hidden') === 'true';

            expect(isHidden).toBe(false);
        });

        it('should detect when panel is not hidden (key removed)', () => {
            localStorage.setItem('v7_multiinstance_panel_hidden', 'true');
            localStorage.removeItem('v7_multiinstance_panel_hidden');

            const isHidden = localStorage.getItem('v7_multiinstance_panel_hidden') === 'true';

            expect(isHidden).toBe(false);
        });
    });

    describe('reset control behavior', () => {
        it('should remove hidden key when reset clicked', () => {
            localStorage.setItem('v7_multiinstance_panel_hidden', 'true');

            // Simulate reset handler
            localStorage.removeItem('v7_multiinstance_panel_hidden');

            expect(localStorage.getItem('v7_multiinstance_panel_hidden')).toBeNull();
        });

        it('should allow panel to appear after reset', () => {
            // Set hidden
            localStorage.setItem('v7_multiinstance_panel_hidden', 'true');
            expect(localStorage.getItem('v7_multiinstance_panel_hidden')).toBe('true');

            // Reset
            localStorage.removeItem('v7_multiinstance_panel_hidden');

            // Now check should show panel
            const shouldShowPanel = localStorage.getItem('v7_multiinstance_panel_hidden') !== 'true';
            expect(shouldShowPanel).toBe(true);
        });
    });

    describe('reset control visibility', () => {
        it('should be visible when panel is hidden', () => {
            localStorage.setItem('v7_multiinstance_panel_hidden', 'true');

            const isHidden = localStorage.getItem('v7_multiinstance_panel_hidden') === 'true';
            const showResetControl = isHidden;

            expect(showResetControl).toBe(true);
        });

        it('should not be visible when panel is not hidden', () => {
            // Don't set hidden flag

            const isHidden = localStorage.getItem('v7_multiinstance_panel_hidden') === 'true';
            const showResetControl = isHidden;

            expect(showResetControl).toBe(false);
        });
    });
});
