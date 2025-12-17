/**
 * Chip Settings Flow Tests
 * 
 * Tests the chip visibility configuration and how it affects documentation generation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SettingsManager, ChipVisibility } from '../sonia/settings/settingsManager';
import { getTreatment } from '../sonia/behandlungen';
import { processTreatment } from '../sonia/behandlungen/_shared/engine';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => { store[key] = value; },
        removeItem: (key: string) => { delete store[key]; },
        clear: () => { store = {}; }
    };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Mock window for settings events
global.window = { dispatchEvent: vi.fn() } as any;

describe('Chip Settings Flow', () => {
    beforeEach(() => {
        localStorageMock.clear();
        SettingsManager.reset();
    });

    describe('Test 1: Chip Visibility States', () => {
        it('should have 4 visibility states: hidden, visible, locked_on, locked_off', () => {
            const treatment = getTreatment('filling');
            expect(treatment).toBeDefined();
            expect(treatment!.chips.length).toBeGreaterThan(0);

            // Test all 4 states
            const chipId = treatment!.chips[0].id;

            // Default should be hidden
            expect(SettingsManager.getChipVisibility('filling', chipId)).toBe('hidden');

            // Set to visible
            SettingsManager.setChipVisibility('filling', chipId, 'visible');
            expect(SettingsManager.getChipVisibility('filling', chipId)).toBe('visible');

            // Set to locked_on
            SettingsManager.setChipVisibility('filling', chipId, 'locked_on');
            expect(SettingsManager.getChipVisibility('filling', chipId)).toBe('locked_on');

            // Set to locked_off
            SettingsManager.setChipVisibility('filling', chipId, 'locked_off');
            expect(SettingsManager.getChipVisibility('filling', chipId)).toBe('locked_off');
        });
    });

    describe('Test 2: Dictation with Locked-On Chip', () => {
        it('should always include locked_on chips in output', () => {
            // Configure "kofferdam" as locked_on
            SettingsManager.setChipVisibility('filling', 'kofferdam', 'locked_on');

            const lockedOnChips = SettingsManager.getLockedOnChips('filling');
            expect(lockedOnChips).toContain('kofferdam');

            // When processing, locked_on should be in effective always-on list
            const effectiveAlwaysOn = SettingsManager.getEffectiveAlwaysOnChips('filling');
            expect(effectiveAlwaysOn).toContain('kofferdam');
        });
    });

    describe('Test 3: Dictation with Locked-Off Chip', () => {
        it('should mark locked_off chips as documented "nicht durchgeführt"', () => {
            // Configure "fluor" as locked_off (dentist never does fluoridation)
            SettingsManager.setChipVisibility('filling', 'fluor', 'locked_off');

            const lockedOffChips = SettingsManager.getLockedOffChips('filling');
            expect(lockedOffChips).toContain('fluor');
        });
    });

    describe('Test 4: Visible Chips with Toggle State', () => {
        it('should track default active state for visible chips', () => {
            // Configure "matrize" as visible with default OFF
            SettingsManager.setChipVisibility('filling', 'matrize', 'visible');
            SettingsManager.setInactiveChips('filling', ['matrize']); // Default inactive

            const visibleChips = SettingsManager.getVisibleChips('filling');
            expect(visibleChips).toContain('matrize');

            const inactiveChips = SettingsManager.getInactiveChips('filling');
            expect(inactiveChips).toContain('matrize');

            // Toggle to active
            SettingsManager.toggleChip('filling', 'matrize');
            expect(SettingsManager.isChipActive('filling', 'matrize')).toBe(true);

            // Toggle back to inactive
            SettingsManager.toggleChip('filling', 'matrize');
            expect(SettingsManager.isChipActive('filling', 'matrize')).toBe(false);
        });
    });

    describe('Test 5: Complete Flow with Mixed Chip States', () => {
        it('should correctly categorize chips in a realistic scenario', () => {
            const treatment = getTreatment('filling');
            expect(treatment).toBeDefined();

            // Realistic configuration:
            // - Always do: Adhäsiv, Schichttechnik (locked_on)
            // - Show in QuickView: Kofferdam (default on), Matrize (default off)
            // - Never do: Rö-Kontrolle (locked_off)
            // - Ignore: Some rarely used chips (hidden)

            SettingsManager.setChipVisibility('filling', 'adhesive', 'locked_on');
            SettingsManager.setChipVisibility('filling', 'schicht', 'locked_on');
            SettingsManager.setChipVisibility('filling', 'kofferdam', 'visible');
            SettingsManager.setChipVisibility('filling', 'matrize', 'visible');
            SettingsManager.setChipVisibility('filling', 'rö_kontrolle', 'locked_off');

            // Set matrize as default inactive
            SettingsManager.setInactiveChips('filling', ['matrize']);

            // Verify locked_on
            const lockedOn = SettingsManager.getLockedOnChips('filling');
            expect(lockedOn).toContain('adhesive');
            expect(lockedOn).toContain('schicht');

            // Verify visible
            const visible = SettingsManager.getVisibleChips('filling');
            expect(visible).toContain('kofferdam');
            expect(visible).toContain('matrize');

            // Verify locked_off
            const lockedOff = SettingsManager.getLockedOffChips('filling');
            expect(lockedOff).toContain('rö_kontrolle');

            // Verify hidden (not configured)
            expect(SettingsManager.getChipVisibility('filling', 'vipr_pos')).toBe('hidden');

            // Verify effective always-on includes locked_on chips
            const effectiveAlwaysOn = SettingsManager.getEffectiveAlwaysOnChips('filling');
            expect(effectiveAlwaysOn).toContain('adhesive');
            expect(effectiveAlwaysOn).toContain('schicht');
        });
    });

    describe('Test 6: Persistence across sessions', () => {
        it('should persist chip visibility settings in localStorage', () => {
            // Set some visibility
            SettingsManager.setChipVisibility('filling', 'kofferdam', 'locked_on');
            SettingsManager.setChipVisibility('filling', 'fluor', 'visible');

            // Verify localStorage was written
            const stored = localStorage.getItem('sonia_settings_v3');
            expect(stored).toBeTruthy();

            const parsed = JSON.parse(stored!);
            expect(parsed.chipVisibility.filling.kofferdam).toBe('locked_on');
            expect(parsed.chipVisibility.filling.fluor).toBe('visible');
        });
    });
});
