/**
 * M36: Settings Hook
 * 
 * Manages practice and user settings with localStorage persistence.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import type {
    PracticeSettings,
    UserSettings,
    SettingsInput,
    hashSettings,
} from './settingsTypes';
import { setActiveKbReleaseId } from '../kb/release';
import { reconcileUserWithPracticeHierarchy } from './hierarchyPolicy';

// ═══════════════════════════════════════════════════════════════
// STORAGE KEYS
// ═══════════════════════════════════════════════════════════════

const PRACTICE_SETTINGS_KEY = 'docudent_v10_practice_settings';
const USER_SETTINGS_KEY = 'docudent_v10_user_settings';
const PRACTICE_ID_KEY = 'docudent_practice_id';

function getActivePracticeId(): string {
    if (typeof window === 'undefined') return '1';
    return localStorage.getItem(PRACTICE_ID_KEY) || '1';
}

function getActiveUserId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('selectedUser') || null;
}

function isFirestoreSettingsEnabled(): boolean {
    return import.meta.env.VITE_SETTINGS_FIRESTORE === 'true';
}

function isPracticeAdminRole(role?: string | null): boolean {
    const value = String(role || '').toLowerCase();
    return value.includes('practice_admin') || value.includes('admin') || value.includes('owner') || value.includes('praxis');
}

// ═══════════════════════════════════════════════════════════════
// DEFAULTS
// ═══════════════════════════════════════════════════════════════

const DEFAULT_PRACTICE: PracticeSettings = {
    version: '1.0.0',
    strictKzvMode: false,
};

const DEFAULT_USER: UserSettings = {
    version: '1.0.0',
    preferredTextLength: 'mittel',
};

const DOC_STANDARD_CHIPS = [
    'doc_aufklaerung',
    'doc_alternativen',
    'doc_risiken',
    'doc_einverstaendnis',
    'doc_okklusion',
    'doc_politur',
];

function stripUndefinedDeep<T>(value: T): T {
    if (Array.isArray(value)) {
        return value
            .map(v => stripUndefinedDeep(v))
            .filter(v => v !== undefined) as unknown as T;
    }
    if (value && typeof value === 'object') {
        const out: Record<string, unknown> = {};
        for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
            if (v === undefined) continue;
            const next = stripUndefinedDeep(v);
            if (next === undefined) continue;
            out[key] = next;
        }
        return out as unknown as T;
    }
    return value;
}

function uniqStable(ids: string[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const id of ids) {
        const trimmed = String(id ?? '').trim();
        if (!trimmed) continue;
        if (seen.has(trimmed)) continue;
        seen.add(trimmed);
        out.push(trimmed);
    }
    return out;
}

function migrateUserFromPracticeLegacy(practice: PracticeSettings, user: UserSettings): { next: UserSettings; changed: boolean } {
    if (user.migrations?.endoDefaultsFromPracticeLegacyV1) return { next: user, changed: false };

    const endo = user.treatments?.endo ?? {};
    const endoUpdates: Record<string, unknown> = {};

    if (endo.defaultWLMethod === undefined && practice.defaultWLMethod) {
        endoUpdates.defaultWLMethod = practice.defaultWLMethod;
    }
    if (endo.defaultWFTechnique === undefined && practice.defaultWFTechnique) {
        endoUpdates.defaultWFTechnique = practice.defaultWFTechnique;
    }
    if (endo.defaultIrrigationProtocol === undefined && practice.defaultIrrigationProtocol) {
        endoUpdates.defaultIrrigationProtocol = practice.defaultIrrigationProtocol;
    }

    if (Object.keys(endoUpdates).length === 0) return { next: user, changed: false };

    const next: UserSettings = {
        ...user,
        migrations: {
            ...(user.migrations ?? {}),
            endoDefaultsFromPracticeLegacyV1: true,
        },
        treatments: {
            ...(user.treatments ?? {}),
            endo: {
                ...endo,
                ...endoUpdates,
            },
        },
    };

    return { next, changed: true };
}

function migrateStandardChipsToGlobal(user: UserSettings): { next: UserSettings; changed: boolean } {
    const chipStandards = user.chipStandards;
    const global = chipStandards?.global ?? [];
    const perTreatment = chipStandards?.perTreatment ?? {};
    const fuellung = perTreatment.fuellung ?? [];

    const fromFuellung = fuellung.filter(id => DOC_STANDARD_CHIPS.includes(id));
    if (fromFuellung.length === 0) return { next: user, changed: false };
    if (global.length > 0) return { next: user, changed: false };

    const nextGlobal = uniqStable([...global, ...fromFuellung]);
    const nextFuellung = fuellung.filter(id => !DOC_STANDARD_CHIPS.includes(id));
    const nextPer = { ...perTreatment };
    if (nextFuellung.length > 0) nextPer.fuellung = nextFuellung;
    else delete nextPer.fuellung;

    const next: UserSettings = {
        ...user,
        chipStandards: {
            ...(chipStandards ?? {}),
            global: nextGlobal,
            perTreatment: Object.keys(nextPer).length > 0 ? nextPer : undefined,
        },
    };

    return { next, changed: true };
}

function sanitizePracticeForFirestore(settings: PracticeSettings): PracticeSettings {
    return stripUndefinedDeep({
        version: settings.version ?? DEFAULT_PRACTICE.version,
        // Defaults used by pipeline (must persist if Firestore is enabled)
        defaultIsolation: settings.defaultIsolation,
        defaultMaterial: settings.defaultMaterial,
        defaultRoentgenPolicy: settings.defaultRoentgenPolicy,
        defaultIrrigationProtocol: settings.defaultIrrigationProtocol,
        defaultWLMethod: settings.defaultWLMethod,
        defaultWFTechnique: settings.defaultWFTechnique,
        strictKzvMode: settings.strictKzvMode,
        materials: settings.materials,
        materialCatalog: settings.materialCatalog,
        defaultAnestheticAgentId: settings.defaultAnestheticAgentId,
        treatments: settings.treatments,
        devices: settings.devices,
        inventory: settings.inventory,
        enabledTreatments: settings.enabledTreatments,
        activeKbReleaseId: settings.activeKbReleaseId,
        chipStandards: settings.chipStandards,
        lockUserOverrides: settings.lockUserOverrides,
    });
}

function sanitizeUserForFirestore(settings: UserSettings): UserSettings {
    return stripUndefinedDeep({
        version: settings.version ?? DEFAULT_USER.version,
        // Defaults used by pipeline/UI (must persist if Firestore is enabled)
        defaultLAType: settings.defaultLAType,
        defaultLATypeUkPosterior: settings.defaultLATypeUkPosterior,
        defaultAnestheticAgentId: settings.defaultAnestheticAgentId,
        defaultIsolation: settings.defaultIsolation,
        defaultCappingMaterial: settings.defaultCappingMaterial,
        preferredTextLength: settings.preferredTextLength,
        skipAskbacks: settings.skipAskbacks,
        defaultHasMKV: settings.defaultHasMKV,
        chipStandards: settings.chipStandards,
        treatments: settings.treatments,
        enabledTreatments: settings.enabledTreatments,
        migrations: settings.migrations,
    });
}

// ═══════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════

export interface UseSettingsResult {
    practiceSettings: PracticeSettings;
    userSettings: UserSettings;
    settingsInput: SettingsInput;
    settingsHash: string;

    updatePracticeSettings: (updates: Partial<PracticeSettings>) => void;
    updateUserSettings: (updates: Partial<UserSettings>) => void;
    resetToDefaults: () => void;

    isLoaded: boolean;
    canEditPractice: boolean;
}

export function useSettings(params?: { userId?: string | null; actorRole?: string | null }): UseSettingsResult {
    const [practiceSettings, setPracticeSettings] = useState<PracticeSettings>(DEFAULT_PRACTICE);
    const [userSettings, setUserSettings] = useState<UserSettings>(DEFAULT_USER);
    const [isLoaded, setIsLoaded] = useState(false);
    const activeUserId = params?.userId ?? getActiveUserId();
    const canEditPractice = !isFirestoreSettingsEnabled() || isPracticeAdminRole(params?.actorRole);

    // Load from localStorage / Firestore on mount
    useEffect(() => {
        let cancelled = false;
        const practiceId = getActivePracticeId();
        const userId = activeUserId;

        const loadLocal = () => {
            try {
                const storedPractice = localStorage.getItem(PRACTICE_SETTINGS_KEY);
                const practiceNext = storedPractice
                    ? ({ ...DEFAULT_PRACTICE, ...JSON.parse(storedPractice) } as PracticeSettings)
                    : DEFAULT_PRACTICE;
                setPracticeSettings(practiceNext);
                setActiveKbReleaseId(practiceNext.activeKbReleaseId);

                const storedUser = localStorage.getItem(USER_SETTINGS_KEY);
                const userNext = storedUser
                    ? ({ ...DEFAULT_USER, ...JSON.parse(storedUser) } as UserSettings)
                    : DEFAULT_USER;
                const migrated = migrateUserFromPracticeLegacy(practiceNext, userNext);
                const migratedStandards = migrateStandardChipsToGlobal(migrated.next);
                const reconciled = reconcileUserWithPracticeHierarchy(practiceNext, migratedStandards.next);
                setUserSettings(reconciled.user);
                if (migrated.changed || migratedStandards.changed || reconciled.changed) {
                    localStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(reconciled.user));
                }
            } catch (e) {
                console.warn('[useSettings] Failed to load settings from localStorage:', e);
            }
        };

        const loadFirestore = async () => {
            try {
                const practiceRef = doc(db, 'Praxen', practiceId, 'Settings', 'v10');
                const practiceSnap = await getDoc(practiceRef);
                let practiceNext: PracticeSettings = DEFAULT_PRACTICE;
                if (!cancelled && practiceSnap.exists()) {
                    const data = practiceSnap.data() as PracticeSettings;
                    practiceNext = {
                        ...DEFAULT_PRACTICE,
                        version: data.version ?? DEFAULT_PRACTICE.version,
                        defaultIsolation: data.defaultIsolation,
                        defaultMaterial: data.defaultMaterial,
                        defaultRoentgenPolicy: data.defaultRoentgenPolicy,
                        defaultIrrigationProtocol: data.defaultIrrigationProtocol,
                        defaultWLMethod: data.defaultWLMethod,
                        defaultWFTechnique: data.defaultWFTechnique,
                        materials: data.materials,
                        materialCatalog: data.materialCatalog,
                        defaultAnestheticAgentId: data.defaultAnestheticAgentId,
                        treatments: data.treatments,
                        devices: data.devices,
                        inventory: data.inventory,
                        enabledTreatments: data.enabledTreatments,
                        activeKbReleaseId: data.activeKbReleaseId,
                        strictKzvMode: data.strictKzvMode,
                        chipStandards: data.chipStandards,
                        lockUserOverrides: data.lockUserOverrides,
                    };
                    setPracticeSettings(practiceNext);
                    localStorage.setItem(PRACTICE_SETTINGS_KEY, JSON.stringify(practiceNext));
                    setActiveKbReleaseId(practiceNext.activeKbReleaseId);
                }

                if (userId) {
                    const userRef = doc(db, 'Praxen', practiceId, 'Benutzer', userId, 'Settings', 'v10');
                    const userSnap = await getDoc(userRef);
                    if (!cancelled && userSnap.exists()) {
                        const data = userSnap.data() as UserSettings;
                        let next = {
                            ...DEFAULT_USER,
                            version: data.version ?? DEFAULT_USER.version,
                            defaultLAType: data.defaultLAType,
                            defaultLATypeUkPosterior: data.defaultLATypeUkPosterior,
                            defaultAnestheticAgentId: data.defaultAnestheticAgentId,
                            defaultIsolation: data.defaultIsolation,
                            defaultCappingMaterial: data.defaultCappingMaterial,
                            preferredTextLength: data.preferredTextLength ?? DEFAULT_USER.preferredTextLength,
                            skipAskbacks: data.skipAskbacks,
                            defaultHasMKV: data.defaultHasMKV,
                            chipStandards: data.chipStandards,
                            treatments: data.treatments,
                            enabledTreatments: data.enabledTreatments,
                            migrations: data.migrations,
                        };
                        const migrated = migrateUserFromPracticeLegacy(practiceNext, next);
                        const migratedStandards = migrateStandardChipsToGlobal(migrated.next);
                        const reconciled = reconcileUserWithPracticeHierarchy(practiceNext, migratedStandards.next);
                        next = reconciled.user;
                        setUserSettings(next);
                        localStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(next));
                        if (migrated.changed || migratedStandards.changed || reconciled.changed) {
                            const payload = sanitizeUserForFirestore(next);
                            Promise.resolve()
                                .then(() => setDoc(userRef, payload, { merge: true }))
                                .catch(err => {
                                    console.warn('[useSettings] Failed to write migrated user settings to Firestore:', err);
                                });
                        }
                    }
                }
            } catch (e) {
                console.warn('[useSettings] Failed to load settings from Firestore:', e);
                loadLocal();
            }
        };

        setIsLoaded(false);
        if (typeof window !== 'undefined' && isFirestoreSettingsEnabled()) {
            loadFirestore().finally(() => {
                if (!cancelled) setIsLoaded(true);
            });
        } else {
            loadLocal();
            setIsLoaded(true);
        }

        return () => {
            cancelled = true;
        };
    }, [activeUserId]);

    // Save practice settings
    const updatePracticeSettings = useCallback((updates: Partial<PracticeSettings>) => {
        setPracticeSettings(prev => {
            if (!canEditPractice) {
                console.warn('[useSettings] Practice settings update blocked: missing practice admin role');
                return prev;
            }
            const next = { ...prev, ...updates };
            const reconcile = reconcileUserWithPracticeHierarchy(next, userSettings);
            if (reconcile.changed) {
                setUserSettings(reconcile.user);
                try {
                    localStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(reconcile.user));
                } catch (e) {
                    console.warn('[useSettings] Failed to save reconciled user settings:', e);
                }
                if (isFirestoreSettingsEnabled() && activeUserId) {
                    const practiceId = getActivePracticeId();
                    const firestoreUserRef = doc(db, 'Praxen', practiceId, 'Benutzer', activeUserId, 'Settings', 'v10');
                    const userPayload = sanitizeUserForFirestore(reconcile.user);
                    Promise.resolve()
                        .then(() => setDoc(firestoreUserRef, userPayload, { merge: true }))
                        .catch(err => {
                            console.warn('[useSettings] Failed to save reconciled user settings to Firestore:', err);
                        });
                }
            }
            try {
                localStorage.setItem(PRACTICE_SETTINGS_KEY, JSON.stringify(next));
            } catch (e) {
                console.warn('[useSettings] Failed to save practice settings:', e);
            }
            setActiveKbReleaseId(next.activeKbReleaseId);
            if (isFirestoreSettingsEnabled()) {
                const practiceId = getActivePracticeId();
                const practiceRef = doc(db, 'Praxen', practiceId, 'Settings', 'v10');
                const payload = sanitizePracticeForFirestore(next);
                Promise.resolve()
                    .then(() => setDoc(practiceRef, payload, { merge: true }))
                    .catch(err => {
                    console.warn('[useSettings] Failed to save practice settings to Firestore:', err);
                });
            }
            return next;
        });
    }, [activeUserId, canEditPractice, userSettings]);

    // Save user settings
    const updateUserSettings = useCallback((updates: Partial<UserSettings>) => {
        setUserSettings(prev => {
            const merged = { ...prev, ...updates };
            const { user: next } = reconcileUserWithPracticeHierarchy(practiceSettings, merged);
            try {
                localStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(next));
            } catch (e) {
                console.warn('[useSettings] Failed to save user settings:', e);
            }
            if (isFirestoreSettingsEnabled()) {
                const practiceId = getActivePracticeId();
                const userId = activeUserId;
                if (userId) {
                    const userRef = doc(db, 'Praxen', practiceId, 'Benutzer', userId, 'Settings', 'v10');
                    const payload = sanitizeUserForFirestore(next);
                    Promise.resolve()
                        .then(() => setDoc(userRef, payload, { merge: true }))
                        .catch(err => {
                        console.warn('[useSettings] Failed to save user settings to Firestore:', err);
                    });
                }
            }
            return next;
        });
    }, [activeUserId, practiceSettings, setUserSettings]);

    // Reset
    const resetToDefaults = useCallback(() => {
        setPracticeSettings(DEFAULT_PRACTICE);
        setUserSettings(DEFAULT_USER);
        try {
            localStorage.removeItem(PRACTICE_SETTINGS_KEY);
            localStorage.removeItem(USER_SETTINGS_KEY);
        } catch (e) {
            console.warn('[useSettings] Failed to clear settings:', e);
        }
        setActiveKbReleaseId(undefined);
    }, []);

    // Combined settings input for pipeline
    const settingsInput = useMemo<SettingsInput>(() => ({
        practice: practiceSettings,
        user: userSettings,
    }), [practiceSettings, userSettings]);

    // Hash for determinism tracking
    const settingsHash = useMemo(() => {
        const str = JSON.stringify(settingsInput);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
    }, [settingsInput]);

    return {
        practiceSettings,
        userSettings,
        settingsInput,
        settingsHash,
        updatePracticeSettings,
        updateUserSettings,
        resetToDefaults,
        isLoaded,
        canEditPractice,
    };
}
