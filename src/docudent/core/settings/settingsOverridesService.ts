/**
 * Settings Overrides Service — Firestore Write Layer
 *
 * ═══════════════════════════════════════════════════════════════
 * Validates overrides, then writes to Firestore.
 * Uses contracts/settingsValidator as SSOT validation.
 * ═══════════════════════════════════════════════════════════════
 *
 * RULES:
 * ✅ Validate before write (fail fast)
 * ✅ Deterministic overrideId based on scope
 * ❌ No v7/** imports
 * ❌ No core/billing/** imports
 */

import {
    doc,
    setDoc,
    updateDoc,
    getDoc,
    Timestamp,
    Firestore,
} from 'firebase/firestore';
import {
    validateOverrides,
    ValidationResult,
    ValidationIssue,
} from '../../contracts/settingsValidator';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type OverrideScope = 'org' | 'practice' | 'room' | 'provider';

export interface WriteSettingsOverrideParams {
    orgId: string;
    scope: OverrideScope;
    scopeId?: string;    // practiceId for practice, roomId for room, providerId for provider
    practiceId?: string; // Required for room and provider scopes
    overrides: Record<string, unknown>;
    updatedBy: string;
}

export interface SettingsOverrideDoc {
    id: string;
    orgId: string;
    scope: OverrideScope;
    scopeId: string | null;
    practiceId?: string;
    overrides: Record<string, unknown>;
    updatedAt: Timestamp;
    updatedBy: string;
}

export class SettingsValidationError extends Error {
    constructor(
        public readonly issues: ValidationIssue[],
        message: string = 'Settings validation failed'
    ) {
        super(message);
        this.name = 'SettingsValidationError';
    }
}

// ═══════════════════════════════════════════════════════════════
// DETERMINISTIC ID STRATEGY
// ═══════════════════════════════════════════════════════════════

/**
 * Generate deterministic overrideId based on scope.
 * - org: "org"
 * - practice: "practice_{practiceId}"
 * - room: "room_{roomId}"
 * - provider: "provider_{providerId}"
 */
export function generateOverrideId(scope: OverrideScope, scopeId?: string): string {
    switch (scope) {
        case 'org':
            return 'org';
        case 'practice':
            if (!scopeId) throw new Error('scopeId required for practice scope');
            return `practice_${scopeId}`;
        case 'room':
            if (!scopeId) throw new Error('scopeId required for room scope');
            return `room_${scopeId}`;
        case 'provider':
            if (!scopeId) throw new Error('scopeId required for provider scope');
            return `provider_${scopeId}`;
    }
}

// ═══════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════

export class SettingsOverridesService {
    constructor(private db: Firestore) { }

    /**
     * Write settings override to Firestore.
     * Validates overrides before write; throws on invalid data.
     */
    async writeSettingsOverride(params: WriteSettingsOverrideParams): Promise<string> {
        // 1. Validate overrides
        const validation = validateOverrides(params.overrides);
        if (!validation.ok) {
            throw new SettingsValidationError(
                validation.issues,
                `Settings validation failed: ${validation.issues.length} issue(s)`
            );
        }

        // 2. Check required practiceId for room/provider scopes
        if ((params.scope === 'room' || params.scope === 'provider') && !params.practiceId) {
            throw new Error(`practiceId required for ${params.scope} scope`);
        }

        // 3. Generate deterministic ID
        const overrideId = generateOverrideId(params.scope, params.scopeId);

        // 4. Build document
        const doc_data: SettingsOverrideDoc = {
            id: overrideId,
            orgId: params.orgId,
            scope: params.scope,
            scopeId: params.scopeId ?? null,
            overrides: params.overrides,
            updatedAt: Timestamp.now(),
            updatedBy: params.updatedBy,
        };

        // Include practiceId for room/provider scopes (required by rules)
        if (params.practiceId) {
            doc_data.practiceId = params.practiceId;
        }

        // 5. Write to Firestore
        const ref = doc(this.db, `orgs/${params.orgId}/settingsOverrides`, overrideId);
        await setDoc(ref, doc_data, { merge: true });

        return overrideId;
    }

    /**
     * Get settings override by scope.
     */
    async getSettingsOverride(
        orgId: string,
        scope: OverrideScope,
        scopeId?: string
    ): Promise<SettingsOverrideDoc | null> {
        const overrideId = generateOverrideId(scope, scopeId);
        const ref = doc(this.db, `orgs/${orgId}/settingsOverrides`, overrideId);
        const snap = await getDoc(ref);
        return snap.exists() ? (snap.data() as SettingsOverrideDoc) : null;
    }

    /**
     * Delete a specific key from overrides.
     * Use to "reset to default" for a single setting.
     */
    async deleteOverrideKey(
        orgId: string,
        scope: OverrideScope,
        scopeId: string | undefined,
        settingsPath: string,
        updatedBy: string
    ): Promise<void> {
        const overrideId = generateOverrideId(scope, scopeId);
        const ref = doc(this.db, `orgs/${orgId}/settingsOverrides`, overrideId);

        // Get current doc
        const snap = await getDoc(ref);
        if (!snap.exists()) return;

        const current = snap.data() as SettingsOverrideDoc;
        const newOverrides = { ...current.overrides };
        delete newOverrides[settingsPath];

        // Update with removed key
        await updateDoc(ref, {
            overrides: newOverrides,
            updatedAt: Timestamp.now(),
            updatedBy,
        });
    }
}

// ═══════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════

export function createSettingsOverridesService(db: Firestore): SettingsOverridesService {
    return new SettingsOverridesService(db);
}
