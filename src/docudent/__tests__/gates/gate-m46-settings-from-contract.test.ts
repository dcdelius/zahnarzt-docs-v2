/**
 * Gate M46: Settings From Contract
 * 
 * Settings drawer fields must come from settingsSchema.
 */

import { describe, it, expect } from 'vitest';
import { listPacks } from '../../v10/packs';
import { resolvePackContract } from '../../v10/ui/usePackUiContract';

describe('gate-m46-settings-from-contract', () => {
    const packs = listPacks();

    describe('each pack provides settings schema', () => {
        packs.forEach(pack => {
            describe(`pack: ${pack.id}`, () => {
                it('has settingsSchema in contract', () => {
                    const contract = resolvePackContract(pack.id);
                    expect(contract).not.toBeNull();
                    expect(contract!.settingsSchema).toBeDefined();
                });

                it('has practice array', () => {
                    const contract = resolvePackContract(pack.id)!;
                    expect(Array.isArray(contract.settingsSchema.practice)).toBe(true);
                });

                it('has user array', () => {
                    const contract = resolvePackContract(pack.id)!;
                    expect(Array.isArray(contract.settingsSchema.user)).toBe(true);
                });

                it('settings fields have required properties', () => {
                    const contract = resolvePackContract(pack.id)!;
                    const allSettings = [
                        ...contract.settingsSchema.practice,
                        ...contract.settingsSchema.user,
                    ];

                    for (const field of allSettings) {
                        expect(field.key).toBeDefined();
                        expect(field.label).toBeDefined();
                        expect(field.type).toBeDefined();
                        expect(['enum', 'boolean', 'string']).toContain(field.type);
                    }
                });

                it('enum settings have options', () => {
                    const contract = resolvePackContract(pack.id)!;
                    const allSettings = [
                        ...contract.settingsSchema.practice,
                        ...contract.settingsSchema.user,
                    ];

                    const enumSettings = allSettings.filter(s => s.type === 'enum');
                    for (const field of enumSettings) {
                        expect(field.options).toBeDefined();
                        expect(field.options!.length).toBeGreaterThanOrEqual(2);
                    }
                });
            });
        });
    });
});
