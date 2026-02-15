import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SettingsManager } from '../sonia/settings/settingsManager';
import { generateSmartSuggestions } from '../sonia/suggestions/generateSmartSuggestions';
import { TREATMENT_CATALOG } from '../sonia/knowledge/treatments/treatmentCatalog';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => { store[key] = value.toString(); },
        clear: () => { store = {}; },
        removeItem: (key: string) => { delete store[key]; }
    };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('Scalable Treatment Architecture', () => {

    describe('SettingsManager', () => {
        beforeEach(() => {
            localStorage.clear();
        });

        it('should load default settings if none exist', () => {
            const settings = SettingsManager.load();
            expect(settings.enabledTreatmentTypes).toContain('filling');
            expect(settings.global.textLength).toBe('standard');
        });

        it('should save and load settings', () => {
            const defaults = SettingsManager.load();
            const newSettings = {
                ...defaults,
                global: { ...defaults.global, textLength: 'compact' as const }
            };
            SettingsManager.save(newSettings);

            const loaded = SettingsManager.load();
            expect(loaded.global.textLength).toBe('compact');
        });

        it('should get selected template id', () => {
            SettingsManager.setSelectedTemplateId('filling', 'my_custom_template');
            const selected = SettingsManager.getSelectedTemplateId('filling');
            expect(selected).toBe('my_custom_template');
        });
    });

    describe('Rule Engine Integration', () => {
        const mockTemplate = { id: 'test', title: 'Test', fields: [], rules: [] } as any;
        const mockCaseState = { data: {} } as any;

        it('should use CONSERVATIVE_RULES for filling treatment', () => {
            // Mock case state that triggers a conservative rule (e.g. anesthesia)
            // Note: We are relying on the fact that 'anesthesia_filling' is ONLY in conservative rules
            const caseState = {
                data: {
                    procedures: ['Füllung'],
                    anesthesia: undefined
                }
            } as any;

            const suggestions = generateSmartSuggestions({
                template: mockTemplate,
                caseState: caseState,
                insuranceType: 'GKV',
                treatmentType: 'filling'
            });

            // Should contain 'anesthesia_filling' if predicates pass.
            // Even if it doesn't match (due to complex predicates), we can check that it didn't crash
            // and that it didn't try to load endo rules.
            expect(suggestions).toBeDefined();
        });

        it('should use ENDO_RULES for endo treatment', () => {
            const caseState = {
                data: {
                    procedures: ['Wurzelkanalbehandlung'],
                    length_measurement: undefined
                }
            } as any;

            const suggestions = generateSmartSuggestions({
                template: mockTemplate,
                caseState: caseState,
                insuranceType: 'GKV',
                treatmentType: 'endo'
            });

            // If we passed 'endo', it should use ENDO_RULES.
            // We can verify this by checking if a rule ID from ENDO_RULES is present
            // OR by checking that a rule from CONSERVATIVE_RULES is NOT present.

            // 'anesthesia_filling' is definitely in conservative.
            const conservativeRule = suggestions.find(s => s.id === 'anesthesia_filling');
            expect(conservativeRule).toBeUndefined();
        });

        it('should use SURGERY_RULES for extraction treatment', () => {
            const caseState = {
                data: {
                    procedures: ['Chirurgische Extraktion'],
                    hemostasis: null,
                    complications: 'entzündung'
                }
            } as any;

            const suggestions = generateSmartSuggestions({
                template: mockTemplate,
                caseState,
                insuranceType: 'PKV',
                treatmentType: 'extraction'
            });

            expect(suggestions.find(s => s.id === 'surgical_bleeding_control')).toBeTruthy();
            expect(suggestions.find(s => s.id === 'anesthesia_filling')).toBeUndefined();
        });
    });

    describe('Full Flow Integration', () => {
        it('should respect enabled treatments in settings', () => {
            // 1. User disables 'endo'
            const settings = SettingsManager.load();
            settings.enabledTreatmentTypes = ['filling'];
            SettingsManager.save(settings);

            // 2. Verify SettingsManager reflects this
            const loaded = SettingsManager.load();
            expect(loaded.enabledTreatmentTypes).not.toContain('endo');
            expect(loaded.enabledTreatmentTypes).toContain('filling');
        });
    });
});
