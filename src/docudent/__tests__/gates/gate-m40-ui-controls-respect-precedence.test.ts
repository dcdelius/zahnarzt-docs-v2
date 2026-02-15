/**
 * Gate M40: UI Controls Respect Precedence
 */

import { describe, it, expect } from 'vitest';
import { resolveEffectiveChips } from '../../v10/settings/useChipOverrides';
import { extractChanges } from '../../v10/components/V10ChangeSummary';

describe('gate-m40-ui-controls-respect-precedence', () => {
    describe('precedence chain', () => {
        it('dictation beats everything', () => {
            const result = resolveEffectiveChips({
                dictationChips: [{ id: 'la_type', enabled: false }],
                settingsChips: [{ id: 'la_type', enabled: true }],
                overrides: { la_type: { mode: 'on' } },
            });

            const chip = result.find(c => c.id === 'la_type');
            expect(chip?.source).toBe('dictation');
            expect(chip?.enabled).toBe(false);
        });

        it('override beats settings', () => {
            const result = resolveEffectiveChips({
                dictationChips: [],
                settingsChips: [{ id: 'la_type', enabled: true, value: 'infiltr' }],
                overrides: { la_type: { mode: 'off' } },
            });

            const chip = result.find(c => c.id === 'la_type');
            expect(chip?.source).toBe('override');
            expect(chip?.enabled).toBe(false);
        });
    });

    describe('change extraction', () => {
        it('extracts override changes', () => {
            const effectiveChips = [
                { id: 'la_type', enabled: false, source: 'override' as const },
                { id: 'kofferdam', enabled: true, source: 'settings' as const },
            ];
            const settingsChips = [
                { id: 'la_type', enabled: true, value: 'infiltr' },
            ];

            const changes = extractChanges(effectiveChips, settingsChips, 'endo');

            expect(changes.length).toBe(1);
            expect(changes[0].chipId).toBe('la_type');
            expect(changes[0].toSource).toBe('Manuell');
        });

        it('no changes when only settings', () => {
            const effectiveChips = [
                { id: 'kofferdam', enabled: true, source: 'settings' as const },
            ];
            const settingsChips = [
                { id: 'kofferdam', enabled: true },
            ];

            const changes = extractChanges(effectiveChips, settingsChips);
            expect(changes.length).toBe(0);
        });
    });
});
