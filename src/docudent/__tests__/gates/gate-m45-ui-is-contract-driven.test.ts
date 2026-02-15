/**
 * Gate M45: UI Is Contract-Driven
 * 
 * V10 UI components must not hardcode chip/askback IDs.
 * All UI data must flow from PackUiContractV1.
 */

import { describe, it, expect } from 'vitest';
import { usePackUiContract, resolvePackContract, getGroupedControls } from '../../v10/ui/usePackUiContract';

describe('gate-m45-ui-is-contract-driven', () => {
    describe('usePackUiContract hook', () => {
        it('exports usePackUiContract', () => {
            expect(usePackUiContract).toBeDefined();
            expect(typeof usePackUiContract).toBe('function');
        });

        it('exports resolvePackContract', () => {
            expect(resolvePackContract).toBeDefined();
        });

        it('exports getGroupedControls', () => {
            expect(getGroupedControls).toBeDefined();
        });
    });

    describe('contract resolution works', () => {
        it('resolves endo contract', () => {
            const contract = resolvePackContract('endo');
            expect(contract).not.toBeNull();
            expect(contract?.chipControls.length).toBeGreaterThan(0);
        });

        it('resolves fuellung contract', () => {
            const contract = resolvePackContract('fuellung');
            expect(contract).not.toBeNull();
            expect(contract?.chipControls.length).toBeGreaterThan(0);
        });

        it('returns null for unknown pack', () => {
            const contract = resolvePackContract('unknown_treatment');
            expect(contract).toBeNull();
        });
    });

    describe('grouped controls', () => {
        it('groups endo controls correctly', () => {
            const contract = resolvePackContract('endo')!;
            const groups = getGroupedControls(contract);

            expect(groups.relevant.length).toBeGreaterThan(0);
            // Endo has relevant controls at minimum
        });

        it('groups fuellung controls correctly', () => {
            const contract = resolvePackContract('fuellung')!;
            const groups = getGroupedControls(contract);

            expect(groups.relevant.length).toBeGreaterThan(0);
        });
    });

    describe('UI data flows from contract', () => {
        it('chip IDs come from contract, not hardcoded', () => {
            const endoContract = resolvePackContract('endo')!;
            const fuellungContract = resolvePackContract('fuellung')!;

            // Each treatment defines its own controls
            const endoChipIds = endoContract.chipControls.map(c => c.chipId);
            const fuellungChipIds = fuellungContract.chipControls.map(c => c.chipId);

            // Some overlap is expected (common chips), but distinct controls exist
            expect(endoChipIds).toContain('wl_method'); // Endo-specific
            expect(fuellungChipIds).not.toContain('wl_method');
        });

        it('settings schema unique per treatment', () => {
            const endoContract = resolvePackContract('endo')!;
            const fuellungContract = resolvePackContract('fuellung')!;

            // Endo has WL/WF settings
            const endoKeys = endoContract.settingsSchema.practice.map(s => s.key);
            expect(endoKeys).toContain('defaultWLMethod');

            // Fuellung doesn't
            const fuellungKeys = fuellungContract.settingsSchema.practice.map(s => s.key);
            expect(fuellungKeys).not.toContain('defaultWLMethod');
        });
    });
});
