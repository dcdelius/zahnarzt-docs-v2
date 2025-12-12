import { TREATMENT_TYPES } from '../templates/catalog';

export interface ChipUsageStats {
    clickCount: number;
    lastUsed: number; // timestamp
    autoActivated: boolean; // promoted to always-on
}

/**
 * Chip Visibility States:
 * - hidden: Not shown in QuickView, normal default behavior
 * - visible: Shown in QuickView, user can toggle
 * - locked_on: Always active, not in QuickView (e.g. Rel. Trockenlegung)
 * - locked_off: Always inactive, documented as "nicht durchgeführt"
 */
export type ChipVisibility = 'hidden' | 'visible' | 'locked_on' | 'locked_off';

export interface TreatmentSettings {
    global: {
        textLength: 'compact' | 'standard' | 'verbose';
        forensicLevel: 'minimal' | 'standard' | 'detailed';
        showBillingCodes: boolean;
        tone: 'professional' | 'friendly';
    };
    // New Selection State
    enabledTreatmentTypes: string[];
    selectedTreatmentType: string;
    selectedTemplateIdByTreatment: Record<string, string>;

    // Chip Toggle State: stores INACTIVE chip IDs per treatment
    chipToggles: Record<string, string[]>;

    // Always-On Chips (user-set in settings) - LEGACY, use chipVisibility instead
    alwaysOnChips: Record<string, string[]>; // treatmentType -> chipIds

    // NEW: Chip Visibility per treatment
    chipVisibility: Record<string, Record<string, ChipVisibility>>; // treatmentType -> chipId -> visibility

    // Usage Tracking for Auto-Learn
    chipUsage: Record<string, Record<string, ChipUsageStats>>; // treatmentType -> chipId -> stats

    // Legacy / Overrides
    perTreatment: Record<string, {
        templateOverrides?: Record<string, {
            groups?: string[];
        }>;
    }>;
}

const DEFAULT_SETTINGS: TreatmentSettings = {
    global: {
        textLength: 'standard',
        forensicLevel: 'standard',
        showBillingCodes: true,
        tone: 'professional'
    },
    enabledTreatmentTypes: ['filling', 'endo', 'extraction', 'consultation', 'prophylaxis'],
    selectedTreatmentType: 'filling',
    selectedTemplateIdByTreatment: {
        'filling': 'master_fill_v3_blueprint'
    },
    chipToggles: {},
    alwaysOnChips: {},
    chipVisibility: {},  // NEW: per-treatment chip visibility
    chipUsage: {},
    perTreatment: {}
};

const STORAGE_KEY = 'sonia_settings_v3';

export class SettingsManager {
    static load(): TreatmentSettings {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Merge with defaults to ensure new fields exist
                const merged = { ...DEFAULT_SETTINGS, ...parsed, global: { ...DEFAULT_SETTINGS.global, ...parsed.global } };

                // MIGRATION: Fix old template reference
                if (merged.selectedTemplateIdByTreatment?.filling === 'master_fill_v3') {
                    merged.selectedTemplateIdByTreatment.filling = 'master_fill_v3_blueprint';
                    // Save the migration
                    SettingsManager.save(merged);
                }

                return merged;
            }
        } catch (e) {
            console.error("Failed to load settings", e);
        }
        return DEFAULT_SETTINGS;
    }

    static save(settings: TreatmentSettings) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
            // Dispatch event for real-time updates
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('sonia-settings-changed', { detail: settings }));
            }
        } catch (e) {
            console.error("Failed to save settings", e);
        }
    }

    static reset() {
        this.save(DEFAULT_SETTINGS);
        return DEFAULT_SETTINGS;
    }

    static getEnabledTreatmentTypes(): string[] {
        const settings = this.load();
        return settings.enabledTreatmentTypes || ['filling', 'endo', 'extraction', 'consultation', 'prophylaxis'];
    }

    static setEnabledTreatmentTypes(types: string[]) {
        const settings = this.load();
        settings.enabledTreatmentTypes = types;
        this.save(settings);
    }

    static getSelectedTemplateId(treatmentId: string): string | undefined {
        const settings = this.load();
        return settings.selectedTemplateIdByTreatment?.[treatmentId];
    }

    static setSelectedTemplateId(treatmentId: string, templateId: string) {
        const settings = this.load();
        if (!settings.selectedTemplateIdByTreatment) {
            settings.selectedTemplateIdByTreatment = {};
        }
        settings.selectedTemplateIdByTreatment[treatmentId] = templateId;
        this.save(settings);
    }

    // ==========================================
    // CHIP TOGGLE METHODS
    // ==========================================

    /**
     * Get array of INACTIVE chip IDs for a treatment
     */
    static getInactiveChips(treatmentType: string): string[] {
        const settings = this.load();
        return settings.chipToggles?.[treatmentType] || [];
    }

    /**
     * Set array of INACTIVE chip IDs for a treatment
     */
    static setInactiveChips(treatmentType: string, chipIds: string[]) {
        const settings = this.load();
        if (!settings.chipToggles) {
            settings.chipToggles = {};
        }
        settings.chipToggles[treatmentType] = chipIds;
        this.save(settings);
    }

    /**
     * Toggle a single chip (add to inactive if active, remove if inactive)
     */
    static toggleChip(treatmentType: string, chipId: string) {
        const inactive = this.getInactiveChips(treatmentType);
        const isCurrentlyInactive = inactive.includes(chipId);

        if (isCurrentlyInactive) {
            // Activate: remove from inactive list
            this.setInactiveChips(treatmentType, inactive.filter(id => id !== chipId));
        } else {
            // Deactivate: add to inactive list
            this.setInactiveChips(treatmentType, [...inactive, chipId]);
        }
    }

    /**
     * Check if a chip is active for a treatment
     */
    static isChipActive(treatmentType: string, chipId: string): boolean {
        const inactive = this.getInactiveChips(treatmentType);
        return !inactive.includes(chipId);
    }

    // ==========================================
    // ALWAYS-ON CHIPS (User-configured defaults)
    // ==========================================

    static getAlwaysOnChips(treatmentType: string): string[] {
        const settings = this.load();
        return settings.alwaysOnChips?.[treatmentType] || [];
    }

    static setAlwaysOn(treatmentType: string, chipId: string, enabled: boolean) {
        const settings = this.load();
        if (!settings.alwaysOnChips) settings.alwaysOnChips = {};
        if (!settings.alwaysOnChips[treatmentType]) settings.alwaysOnChips[treatmentType] = [];

        const current = settings.alwaysOnChips[treatmentType];
        if (enabled && !current.includes(chipId)) {
            settings.alwaysOnChips[treatmentType] = [...current, chipId];
        } else if (!enabled) {
            settings.alwaysOnChips[treatmentType] = current.filter(id => id !== chipId);
        }
        this.save(settings);
    }

    // ==========================================
    // AUTO-LEARN (Usage tracking + auto-promotion)
    // ==========================================

    static readonly AUTO_ACTIVATE_THRESHOLD = 3;

    static recordChipClick(treatmentType: string, chipId: string): { promoted: boolean } {
        const settings = this.load();
        if (!settings.chipUsage) settings.chipUsage = {};
        if (!settings.chipUsage[treatmentType]) settings.chipUsage[treatmentType] = {};

        const existing = settings.chipUsage[treatmentType][chipId] || {
            clickCount: 0,
            lastUsed: 0,
            autoActivated: false
        };

        existing.clickCount += 1;
        existing.lastUsed = Date.now();

        // Check if should auto-activate
        let promoted = false;
        if (existing.clickCount >= this.AUTO_ACTIVATE_THRESHOLD && !existing.autoActivated) {
            existing.autoActivated = true;
            promoted = true;
            // Also add to always-on
            this.setAlwaysOn(treatmentType, chipId, true);
        }

        settings.chipUsage[treatmentType][chipId] = existing;
        this.save(settings);

        return { promoted };
    }

    static getChipUsage(treatmentType: string, chipId: string): ChipUsageStats | null {
        const settings = this.load();
        return settings.chipUsage?.[treatmentType]?.[chipId] || null;
    }

    static getAutoActivatedChips(treatmentType: string): string[] {
        const settings = this.load();
        const usage = settings.chipUsage?.[treatmentType] || {};
        return Object.entries(usage)
            .filter(([_, stats]) => stats.autoActivated)
            .map(([chipId]) => chipId);
    }

    /**
     * Get all chips that should be active (manual always-on + auto-activated)
     */
    static getEffectiveAlwaysOnChips(treatmentType: string): string[] {
        const manual = this.getAlwaysOnChips(treatmentType);
        const auto = this.getAutoActivatedChips(treatmentType);
        const lockedOn = this.getLockedOnChips(treatmentType);
        return [...new Set([...manual, ...auto, ...lockedOn])];
    }

    // ========================================
    // CHIP VISIBILITY (4 states)
    // ========================================

    /**
     * Get visibility for a chip (default: 'hidden')
     */
    static getChipVisibility(treatmentType: string, chipId: string): ChipVisibility {
        const settings = this.load();
        return settings.chipVisibility?.[treatmentType]?.[chipId] || 'hidden';
    }

    /**
     * Set visibility for a chip
     */
    static setChipVisibility(treatmentType: string, chipId: string, visibility: ChipVisibility) {
        const settings = this.load();
        if (!settings.chipVisibility) {
            settings.chipVisibility = {};
        }
        if (!settings.chipVisibility[treatmentType]) {
            settings.chipVisibility[treatmentType] = {};
        }
        settings.chipVisibility[treatmentType][chipId] = visibility;
        this.save(settings);
    }

    /**
     * Cycle visibility: hidden → visible → locked_on → locked_off → hidden
     */
    static cycleChipVisibility(treatmentType: string, chipId: string): ChipVisibility {
        const current = this.getChipVisibility(treatmentType, chipId);
        const cycle: ChipVisibility[] = ['hidden', 'visible', 'locked_on', 'locked_off'];
        const currentIndex = cycle.indexOf(current);
        const nextIndex = (currentIndex + 1) % cycle.length;
        const next = cycle[nextIndex];
        this.setChipVisibility(treatmentType, chipId, next);
        return next;
    }

    /**
     * Get all chips with visibility 'visible' (shown in QuickView)
     */
    static getVisibleChips(treatmentType: string): string[] {
        const settings = this.load();
        const visibility = settings.chipVisibility?.[treatmentType] || {};
        return Object.entries(visibility)
            .filter(([_, v]) => v === 'visible')
            .map(([chipId]) => chipId);
    }

    /**
     * Get all chips with visibility 'locked_on' (always active)
     */
    static getLockedOnChips(treatmentType: string): string[] {
        const settings = this.load();
        const visibility = settings.chipVisibility?.[treatmentType] || {};
        return Object.entries(visibility)
            .filter(([_, v]) => v === 'locked_on')
            .map(([chipId]) => chipId);
    }

    /**
     * Get all chips with visibility 'locked_off' (always inactive, documented as "nicht durchgeführt")
     */
    static getLockedOffChips(treatmentType: string): string[] {
        const settings = this.load();
        const visibility = settings.chipVisibility?.[treatmentType] || {};
        return Object.entries(visibility)
            .filter(([_, v]) => v === 'locked_off')
            .map(([chipId]) => chipId);
    }

    /**
     * Get all chip visibility settings for a treatment
     */
    static getAllChipVisibility(treatmentType: string): Record<string, ChipVisibility> {
        const settings = this.load();
        return settings.chipVisibility?.[treatmentType] || {};
    }
}
