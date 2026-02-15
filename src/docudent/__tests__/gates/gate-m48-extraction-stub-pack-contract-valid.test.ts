/**
 * Gate M48: Extraction Stub Pack Contract Valid
 * 
 * The stub pack must have a complete UI contract.
 */

import { describe, it, expect } from 'vitest';
import { getPack, listPacks } from '../../v10/packs';
import { resolvePackContract } from '../../v10/ui/usePackUiContract';

describe('gate-m48-extraction-stub-pack-contract-valid', () => {
    describe('extraction_stub pack exists', () => {
        it('is registered in packs', () => {
            const packs = listPacks();
            const stubPack = packs.find(p => p.id === 'extraction_stub');
            expect(stubPack).toBeDefined();
        });

        it('has meta.label', () => {
            const pack = getPack('extraction_stub' as any);
            expect(pack?.meta?.label).toBe('Extraktion (Stub)');
        });

        it('has version', () => {
            const pack = getPack('extraction_stub' as any);
            expect(pack?.version).toBe('0.1.0');
        });
    });

    describe('UI contract is complete', () => {
        it('resolves via usePackUiContract', () => {
            const contract = resolvePackContract('extraction_stub');
            expect(contract).not.toBeNull();
        });

        it('has chipControls', () => {
            const contract = resolvePackContract('extraction_stub')!;
            expect(contract.chipControls.length).toBeGreaterThanOrEqual(2);
        });

        it('has at least one boolean control', () => {
            const contract = resolvePackContract('extraction_stub')!;
            const toggles = contract.chipControls.filter(c => c.mode === 'toggle');
            expect(toggles.length).toBeGreaterThanOrEqual(1);
        });

        it('has at least one param control with options', () => {
            const contract = resolvePackContract('extraction_stub')!;
            const params = contract.chipControls.filter(c => c.mode === 'param');
            expect(params.length).toBeGreaterThanOrEqual(1);
            expect(params[0].options!.length).toBeGreaterThanOrEqual(2);
        });

        it('has settingsSchema with practice and user', () => {
            const contract = resolvePackContract('extraction_stub')!;
            expect(contract.settingsSchema.practice.length).toBeGreaterThanOrEqual(1);
            expect(contract.settingsSchema.user.length).toBeGreaterThanOrEqual(1);
        });

        it('has askbackPolicy with criticalAskbacks including tooth', () => {
            const contract = resolvePackContract('extraction_stub')!;
            expect(contract.askbackPolicy.criticalAskbacks).toContain('extraction_tooth');
        });
    });
});
