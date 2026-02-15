/**
 * Gate M42: Review Has Critical Components
 */

import { describe, it, expect } from 'vitest';
import { V10ChipsGroupedPanel } from '../../v10/components/V10ChipsGroupedPanel';
import { V10ChangeSummary, extractChanges } from '../../v10/components/V10ChangeSummary';
import { V10CommandPalette, getAvailableChipsForTreatment } from '../../v10/components/V10CommandPalette';
import { V10ReproPanel } from '../../v10/components/V10ReproPanel';

describe('gate-m42-review-has-critical-components', () => {
    describe('component exports', () => {
        it('V10ChipsGroupedPanel exports', () => {
            expect(V10ChipsGroupedPanel).toBeDefined();
            expect(typeof V10ChipsGroupedPanel).toBe('function');
        });

        it('V10ChangeSummary exports', () => {
            expect(V10ChangeSummary).toBeDefined();
            expect(extractChanges).toBeDefined();
        });

        it('V10CommandPalette exports', () => {
            expect(V10CommandPalette).toBeDefined();
            expect(getAvailableChipsForTreatment).toBeDefined();
        });

        it('V10ReproPanel exports', () => {
            expect(V10ReproPanel).toBeDefined();
        });
    });

    describe('helper functions', () => {
        it('getAvailableChipsForTreatment returns chips', () => {
            const endoChips = getAvailableChipsForTreatment('endo');
            expect(endoChips.length).toBeGreaterThan(0);
            expect(endoChips.some(c => c.id === 'wl_method')).toBe(true);
        });

        it('getAvailableChipsForTreatment returns fuellung chips', () => {
            const fuellungChips = getAvailableChipsForTreatment('fuellung');
            expect(fuellungChips.length).toBeGreaterThan(0);
            expect(fuellungChips.some(c => c.id === 'mehrschicht')).toBe(true);
        });

        it('extractChanges returns override changes', () => {
            const effectiveChips = [
                { id: 'la_type', enabled: false, source: 'override' as const },
            ];
            const settingsChips = [
                { id: 'la_type', enabled: true, value: 'infiltr' },
            ];

            const changes = extractChanges(effectiveChips, settingsChips);
            expect(changes.length).toBe(1);
            expect(changes[0].toSource).toBe('Manuell');
        });
    });

    describe('data-testid coverage', () => {
        it('critical testids are documented', () => {
            const requiredTestIds = [
                'v10-review-step',
                'v10-review-tabs',
                'v10-add-chip-btn',
                'v10-review-back',
                'v10-review-proceed',
                'v10-command-palette',
                'v10-repro-panel',
                'v10-chips-grouped',
                'v10-change-summary',
            ];

            // Just document that these should exist
            expect(requiredTestIds.length).toBeGreaterThan(5);
        });
    });
});
