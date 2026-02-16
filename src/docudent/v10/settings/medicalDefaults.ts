import type { PracticeSettings, SettingsInput, UserSettings } from './settingsTypes';

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function omitUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
    const next: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) next[key] = value;
    }
    return next as Partial<T>;
}

function hasAnyValue(value: unknown): boolean {
    return isRecord(value) && Object.keys(value).length > 0;
}

function getPracticeDefaultIsolationFromAny(
    practice?: Partial<PracticeSettings>
): PracticeSettings['defaultIsolation'] | undefined {
    return practice?.medicalDefaults?.isolation?.defaultMode ?? practice?.defaultIsolation;
}

function getPracticeDefaultAnestheticAgentIdFromAny(
    practice?: Partial<PracticeSettings>
): string | undefined {
    return practice?.medicalDefaults?.anesthesia?.defaultAgentId ?? practice?.defaultAnestheticAgentId;
}

function getUserDefaultIsolationFromAny(
    user?: Partial<UserSettings>
): UserSettings['defaultIsolation'] | undefined {
    return user?.medicalDefaults?.isolation?.defaultMode ?? user?.defaultIsolation;
}

function getUserDefaultLATypeFromAny(
    user?: Partial<UserSettings>
): UserSettings['defaultLAType'] | undefined {
    return user?.medicalDefaults?.anesthesia?.defaultType ?? user?.defaultLAType;
}

function getUserDefaultLATypeUkPosteriorFromAny(
    user?: Partial<UserSettings>
): UserSettings['defaultLATypeUkPosterior'] | undefined {
    return user?.medicalDefaults?.anesthesia?.ukPosteriorType ?? user?.defaultLATypeUkPosterior;
}

function getUserDefaultAnestheticAgentIdFromAny(
    user?: Partial<UserSettings>
): string | undefined {
    return user?.medicalDefaults?.anesthesia?.defaultAgentId ?? user?.defaultAnestheticAgentId;
}

function getUserDefaultCappingMaterialFromAny(
    user?: Partial<UserSettings>
): UserSettings['defaultCappingMaterial'] | undefined {
    return user?.medicalDefaults?.restorative?.defaultCappingMaterial ?? user?.defaultCappingMaterial;
}

export function getPracticeDefaultIsolation(
    practice?: Partial<PracticeSettings>
): PracticeSettings['defaultIsolation'] | undefined {
    return practice?.medicalDefaults?.isolation?.defaultMode;
}

export function getPracticeDefaultAnestheticAgentId(
    practice?: Partial<PracticeSettings>
): string | undefined {
    return practice?.medicalDefaults?.anesthesia?.defaultAgentId;
}

function buildPracticeMedicalDefaultsPatch(
    practice: Partial<PracticeSettings> | undefined,
    patch: {
        anesthesiaDefaultAgentId?: string;
        isolationDefaultMode?: PracticeSettings['defaultIsolation'];
    }
): PracticeSettings['medicalDefaults'] | undefined {
    const anesthesia = omitUndefined({
        ...(practice?.medicalDefaults?.anesthesia ?? {}),
        defaultAgentId: patch.anesthesiaDefaultAgentId,
    });
    const isolation = omitUndefined({
        ...(practice?.medicalDefaults?.isolation ?? {}),
        defaultMode: patch.isolationDefaultMode,
    });
    const nextMedicalDefaults = omitUndefined({
        ...(practice?.medicalDefaults ?? {}),
        anesthesia: hasAnyValue(anesthesia) ? anesthesia : undefined,
        isolation: hasAnyValue(isolation) ? isolation : undefined,
    });
    return hasAnyValue(nextMedicalDefaults)
        ? (nextMedicalDefaults as PracticeSettings['medicalDefaults'])
        : undefined;
}

export function patchPracticeDefaultAnestheticAgentId(
    practice: Partial<PracticeSettings> | undefined,
    value: string | undefined
): Partial<PracticeSettings> {
    return {
        medicalDefaults: buildPracticeMedicalDefaultsPatch(practice, {
            anesthesiaDefaultAgentId: value,
            isolationDefaultMode: getPracticeDefaultIsolationFromAny(practice),
        }),
    };
}

export function patchPracticeDefaultIsolation(
    practice: Partial<PracticeSettings> | undefined,
    value: PracticeSettings['defaultIsolation'] | undefined
): Partial<PracticeSettings> {
    return {
        medicalDefaults: buildPracticeMedicalDefaultsPatch(practice, {
            anesthesiaDefaultAgentId: getPracticeDefaultAnestheticAgentIdFromAny(practice),
            isolationDefaultMode: value,
        }),
    };
}

export function getUserDefaultIsolation(
    user?: Partial<UserSettings>
): UserSettings['defaultIsolation'] | undefined {
    return user?.medicalDefaults?.isolation?.defaultMode;
}

export function resolveIsolationDefaultWithSource(
    practice?: Partial<PracticeSettings>,
    user?: Partial<UserSettings>
): {
    value: PracticeSettings['defaultIsolation'] | UserSettings['defaultIsolation'] | undefined;
    source: 'practice' | 'user' | undefined;
} {
    const practiceValue = getPracticeDefaultIsolation(practice);
    if (practiceValue !== undefined) {
        return { value: practiceValue, source: 'practice' };
    }
    const userValue = getUserDefaultIsolation(user);
    if (userValue !== undefined) {
        return { value: userValue, source: 'user' };
    }
    return { value: undefined, source: undefined };
}

export function getUserDefaultLAType(
    user?: Partial<UserSettings>
): UserSettings['defaultLAType'] | undefined {
    return user?.medicalDefaults?.anesthesia?.defaultType;
}

export function getUserDefaultLATypeUkPosterior(
    user?: Partial<UserSettings>
): UserSettings['defaultLATypeUkPosterior'] | undefined {
    return user?.medicalDefaults?.anesthesia?.ukPosteriorType;
}

export function getUserDefaultAnestheticAgentId(
    user?: Partial<UserSettings>
): string | undefined {
    return user?.medicalDefaults?.anesthesia?.defaultAgentId;
}

export function getUserDefaultCappingMaterial(
    user?: Partial<UserSettings>
): UserSettings['defaultCappingMaterial'] | undefined {
    return user?.medicalDefaults?.restorative?.defaultCappingMaterial;
}

function buildUserMedicalDefaultsPatch(
    user: Partial<UserSettings> | undefined,
    patch: {
        anesthesiaDefaultType?: UserSettings['defaultLAType'];
        anesthesiaUkPosteriorType?: UserSettings['defaultLATypeUkPosterior'];
        anesthesiaDefaultAgentId?: string;
        isolationDefaultMode?: UserSettings['defaultIsolation'];
        restorativeCappingMaterial?: UserSettings['defaultCappingMaterial'];
    }
): UserSettings['medicalDefaults'] | undefined {
    const anesthesia = omitUndefined({
        ...(user?.medicalDefaults?.anesthesia ?? {}),
        defaultType: patch.anesthesiaDefaultType,
        ukPosteriorType: patch.anesthesiaUkPosteriorType,
        defaultAgentId: patch.anesthesiaDefaultAgentId,
    });
    const isolation = omitUndefined({
        ...(user?.medicalDefaults?.isolation ?? {}),
        defaultMode: patch.isolationDefaultMode,
    });
    const restorative = omitUndefined({
        ...(user?.medicalDefaults?.restorative ?? {}),
        defaultCappingMaterial: patch.restorativeCappingMaterial,
    });
    const nextMedicalDefaults = omitUndefined({
        ...(user?.medicalDefaults ?? {}),
        anesthesia: hasAnyValue(anesthesia) ? anesthesia : undefined,
        isolation: hasAnyValue(isolation) ? isolation : undefined,
        restorative: hasAnyValue(restorative) ? restorative : undefined,
    });
    return hasAnyValue(nextMedicalDefaults)
        ? (nextMedicalDefaults as UserSettings['medicalDefaults'])
        : undefined;
}

export function patchUserDefaultLAType(
    user: Partial<UserSettings> | undefined,
    value: UserSettings['defaultLAType'] | undefined
): Partial<UserSettings> {
    return {
        medicalDefaults: buildUserMedicalDefaultsPatch(user, {
            anesthesiaDefaultType: value,
            anesthesiaUkPosteriorType: getUserDefaultLATypeUkPosteriorFromAny(user),
            anesthesiaDefaultAgentId: getUserDefaultAnestheticAgentIdFromAny(user),
            isolationDefaultMode: getUserDefaultIsolationFromAny(user),
            restorativeCappingMaterial: getUserDefaultCappingMaterialFromAny(user),
        }),
    };
}

export function patchUserDefaultLATypeUkPosterior(
    user: Partial<UserSettings> | undefined,
    value: UserSettings['defaultLATypeUkPosterior'] | undefined
): Partial<UserSettings> {
    return {
        medicalDefaults: buildUserMedicalDefaultsPatch(user, {
            anesthesiaDefaultType: getUserDefaultLATypeFromAny(user),
            anesthesiaUkPosteriorType: value,
            anesthesiaDefaultAgentId: getUserDefaultAnestheticAgentIdFromAny(user),
            isolationDefaultMode: getUserDefaultIsolationFromAny(user),
            restorativeCappingMaterial: getUserDefaultCappingMaterialFromAny(user),
        }),
    };
}

export function patchUserDefaultAnestheticAgentId(
    user: Partial<UserSettings> | undefined,
    value: string | undefined
): Partial<UserSettings> {
    return {
        medicalDefaults: buildUserMedicalDefaultsPatch(user, {
            anesthesiaDefaultType: getUserDefaultLATypeFromAny(user),
            anesthesiaUkPosteriorType: getUserDefaultLATypeUkPosteriorFromAny(user),
            anesthesiaDefaultAgentId: value,
            isolationDefaultMode: getUserDefaultIsolationFromAny(user),
            restorativeCappingMaterial: getUserDefaultCappingMaterialFromAny(user),
        }),
    };
}

export function patchUserDefaultIsolation(
    user: Partial<UserSettings> | undefined,
    value: UserSettings['defaultIsolation'] | undefined
): Partial<UserSettings> {
    return {
        medicalDefaults: buildUserMedicalDefaultsPatch(user, {
            anesthesiaDefaultType: getUserDefaultLATypeFromAny(user),
            anesthesiaUkPosteriorType: getUserDefaultLATypeUkPosteriorFromAny(user),
            anesthesiaDefaultAgentId: getUserDefaultAnestheticAgentIdFromAny(user),
            isolationDefaultMode: value,
            restorativeCappingMaterial: getUserDefaultCappingMaterialFromAny(user),
        }),
    };
}

export function patchUserDefaultCappingMaterial(
    user: Partial<UserSettings> | undefined,
    value: UserSettings['defaultCappingMaterial'] | undefined
): Partial<UserSettings> {
    return {
        medicalDefaults: buildUserMedicalDefaultsPatch(user, {
            anesthesiaDefaultType: getUserDefaultLATypeFromAny(user),
            anesthesiaUkPosteriorType: getUserDefaultLATypeUkPosteriorFromAny(user),
            anesthesiaDefaultAgentId: getUserDefaultAnestheticAgentIdFromAny(user),
            isolationDefaultMode: getUserDefaultIsolationFromAny(user),
            restorativeCappingMaterial: value,
        }),
    };
}

export function normalizePracticeMedicalDefaults(practice: PracticeSettings): { next: PracticeSettings; changed: boolean } {
    const isolation = getPracticeDefaultIsolationFromAny(practice);
    const agentId = getPracticeDefaultAnestheticAgentIdFromAny(practice);

    const anesthesia = omitUndefined({
        ...(practice.medicalDefaults?.anesthesia ?? {}),
        defaultAgentId: agentId,
    });
    const isolationDefaults = omitUndefined({
        ...(practice.medicalDefaults?.isolation ?? {}),
        defaultMode: isolation,
    });
    const nextMedicalDefaults = omitUndefined({
        ...(practice.medicalDefaults ?? {}),
        anesthesia: hasAnyValue(anesthesia) ? anesthesia : undefined,
        isolation: hasAnyValue(isolationDefaults) ? isolationDefaults : undefined,
    });

    const next: PracticeSettings = {
        ...practice,
        defaultIsolation: isolation,
        defaultAnestheticAgentId: agentId,
        medicalDefaults: hasAnyValue(nextMedicalDefaults) ? nextMedicalDefaults : undefined,
    };

    const changed = JSON.stringify(practice) !== JSON.stringify(next);
    return { next, changed };
}

export function normalizeUserMedicalDefaults(user: UserSettings): { next: UserSettings; changed: boolean } {
    const laType = getUserDefaultLATypeFromAny(user);
    const ukPosteriorType = getUserDefaultLATypeUkPosteriorFromAny(user);
    const agentId = getUserDefaultAnestheticAgentIdFromAny(user);
    const isolation = getUserDefaultIsolationFromAny(user);
    const capping = getUserDefaultCappingMaterialFromAny(user);

    const anesthesia = omitUndefined({
        ...(user.medicalDefaults?.anesthesia ?? {}),
        defaultType: laType,
        ukPosteriorType,
        defaultAgentId: agentId,
    });
    const isolationDefaults = omitUndefined({
        ...(user.medicalDefaults?.isolation ?? {}),
        defaultMode: isolation,
    });
    const restorative = omitUndefined({
        ...(user.medicalDefaults?.restorative ?? {}),
        defaultCappingMaterial: capping,
    });
    const nextMedicalDefaults = omitUndefined({
        ...(user.medicalDefaults ?? {}),
        anesthesia: hasAnyValue(anesthesia) ? anesthesia : undefined,
        isolation: hasAnyValue(isolationDefaults) ? isolationDefaults : undefined,
        restorative: hasAnyValue(restorative) ? restorative : undefined,
    });

    const next: UserSettings = {
        ...user,
        defaultLAType: laType,
        defaultLATypeUkPosterior: ukPosteriorType,
        defaultAnestheticAgentId: agentId,
        defaultIsolation: isolation,
        defaultCappingMaterial: capping,
        medicalDefaults: hasAnyValue(nextMedicalDefaults) ? nextMedicalDefaults : undefined,
    };

    const changed = JSON.stringify(user) !== JSON.stringify(next);
    return { next, changed };
}

/**
 * Runtime canonicalization: once normalized defaults exist, legacy mirror keys
 * are removed from the live settings object to avoid dual-source reads.
 */
export function stripPracticeMedicalDefaultMirrors(practice: PracticeSettings): PracticeSettings {
    const {
        defaultIsolation: _defaultIsolation,
        defaultAnestheticAgentId: _defaultAnestheticAgentId,
        ...rest
    } = practice;
    void _defaultIsolation;
    void _defaultAnestheticAgentId;
    return rest as PracticeSettings;
}

/**
 * Runtime canonicalization for user-level shared medical defaults.
 */
export function stripUserMedicalDefaultMirrors(user: UserSettings): UserSettings {
    const {
        defaultLAType: _defaultLAType,
        defaultLATypeUkPosterior: _defaultLATypeUkPosterior,
        defaultAnestheticAgentId: _defaultAnestheticAgentId,
        defaultIsolation: _defaultIsolation,
        defaultCappingMaterial: _defaultCappingMaterial,
        ...rest
    } = user;
    void _defaultLAType;
    void _defaultLATypeUkPosterior;
    void _defaultAnestheticAgentId;
    void _defaultIsolation;
    void _defaultCappingMaterial;
    return rest as UserSettings;
}

function coercePracticeSettings(value: unknown): PracticeSettings | undefined {
    if (!isRecord(value)) return undefined;
    const partial = value as Partial<PracticeSettings>;
    return {
        version: typeof partial.version === 'string' && partial.version.trim().length > 0
            ? partial.version
            : '1.0.0',
        ...partial,
    };
}

function coerceUserSettings(value: unknown): UserSettings | undefined {
    if (!isRecord(value)) return undefined;
    const partial = value as Partial<UserSettings>;
    return {
        version: typeof partial.version === 'string' && partial.version.trim().length > 0
            ? partial.version
            : '1.0.0',
        ...partial,
    };
}

/**
 * Canonicalize loosely-shaped settings input for pipeline/test/repro entry points.
 * Accepts either { practice, user } or legacy user-only object.
 */
export function canonicalizeSettingsInput(raw: unknown): SettingsInput | undefined {
    if (!isRecord(raw)) return undefined;

    const container: Record<string, unknown> =
        ('practice' in raw || 'user' in raw)
            ? (raw as Record<string, unknown>)
            : { user: raw };

    const practiceRaw = coercePracticeSettings(container.practice);
    const userRaw = coerceUserSettings(container.user);

    const practice = practiceRaw
        ? stripPracticeMedicalDefaultMirrors(normalizePracticeMedicalDefaults(practiceRaw).next)
        : undefined;
    const user = userRaw
        ? stripUserMedicalDefaultMirrors(normalizeUserMedicalDefaults(userRaw).next)
        : undefined;

    if (!practice && !user) return undefined;
    return { practice, user };
}
