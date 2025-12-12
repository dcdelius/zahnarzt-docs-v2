
import { type TreatmentDefaults as BillingDefaults } from '../../core/billing/knowledgeBase/logic/billingRegistry';

// Re-export or redefine to match billing inference
export type TreatmentDefaults = BillingDefaults & {
    // Add any UI-specific fields if they differ, but they should ideally match.
    // For now, we assume they match or we extend.
    // Actually, let's redefine explicitly to ensure we have the full shape we use in UI.
    // If billingInference defines it, we should USE it to ensure compatibility.
    setupComplete?: boolean;
    updatedAt?: string;
};

// Strict type for UI editing (keys required)
// Strict type for UI editing (keys required)
export interface WizardTreatmentDefaults {
    dokumentation: {
        aufklaerungImmer: boolean;
        alternativenBesprochen: boolean;
        risikenErklaert: boolean;
    };
    anaesthesie: {
        ukSeitenzahn: 'leitung' | 'infiltration' | 'ila' | 'fragen';
        oberflaecheImmer: boolean;
    };
    methodik: {
        kofferdamStandard: boolean;
        kariesdetektorBeiZweifel: boolean;
    };
    tiefKaries: {
        unterfuellungStandard: boolean;
    };
    finishing?: {
        fluoridImmer: boolean;
        politurImmer: boolean;
    };
    // NEW: 3-Tier Question System
    questionLevel: 'minimal' | 'standard' | 'aggressive';
    setupComplete: boolean;
    updatedAt: string;
}

export interface PracticeProfile {
    id: string;
    treatments: {
        fuellung?: TreatmentDefaults;
    };
}

export const STORAGE_KEY = 'docudent_v5_practice_profile';

export const DEFAULT_PROFILE: PracticeProfile = {
    id: 'default',
    treatments: {}
};

export function loadPracticeProfile(): PracticeProfile {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error('Failed to load practice profile', e);
    }
    return DEFAULT_PROFILE;
}

export function savePracticeProfile(profile: PracticeProfile) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch (e) {
        console.error('Failed to save practice profile', e);
    }
}

export function getTreatmentDefaults(profile: PracticeProfile, treatmentId: string): TreatmentDefaults | null {
    return profile.treatments[treatmentId as keyof typeof profile.treatments] || null;
}
