import { describe, expect, it } from 'vitest';
import { getPack, listPackIds } from '../../packs';
import { resolveSettings } from '../../settings/settingsResolver';
import type { SettingsSchemaV1 } from '../../packs/types';
import type { SettingsInput } from '../../settings/settingsTypes';
import type { TreatmentFacts } from '../../facts';

function setNestedValue(target: Record<string, unknown>, path: string, value: unknown) {
    const parts = path.split('.');
    let cursor = target;
    for (let i = 0; i < parts.length; i += 1) {
        const key = parts[i];
        if (i === parts.length - 1) {
            cursor[key] = value;
            return;
        }
        const next = cursor[key];
        if (!next || typeof next !== 'object' || Array.isArray(next)) {
            cursor[key] = {};
        }
        cursor = cursor[key] as Record<string, unknown>;
    }
}

function buildSampleValue(entry: { type: 'enum' | 'boolean' | 'string'; options?: Array<{ value: string }> }): unknown {
    if (entry.type === 'boolean') return true;
    if (entry.type === 'string') return 'standardwert';
    return entry.options?.[0]?.value ?? 'default';
}

describe('gate: settings askback mappings are resolver-wired', () => {
    it('every mapsToAskbackId entry is applied by resolveSettings when askback is skippable', () => {
        for (const treatmentId of listPackIds()) {
            if (treatmentId === 'extraction_stub') continue;
            const ui = getPack(treatmentId).getUiContract();
            const scopeEntries: Array<{
                scope: 'practice' | 'user';
                entry: SettingsSchemaV1['practice'][number] | SettingsSchemaV1['user'][number];
            }> = [
                ...ui.settingsSchema.practice.map(entry => ({ scope: 'practice' as const, entry })),
                ...ui.settingsSchema.user.map(entry => ({ scope: 'user' as const, entry })),
            ];

            for (const { scope, entry } of scopeEntries) {
                if (!entry.mapsToAskbackId) continue;

                const settings: SettingsInput = { practice: {}, user: {} };
                const sample = buildSampleValue(entry as { type: 'enum' | 'boolean' | 'string'; options?: Array<{ value: string }> });
                setNestedValue((settings[scope] ??= {}), entry.key, sample);

                const scopedSchema: SettingsSchemaV1 = {
                    practice: scope === 'practice' ? [entry as SettingsSchemaV1['practice'][number]] : [],
                    user: scope === 'user' ? [entry as SettingsSchemaV1['user'][number]] : [],
                };

                const resolved = resolveSettings({
                    settings,
                    facts: { treatmentId } as TreatmentFacts,
                    askbackPolicy: {
                        criticalAskbacks: [],
                        skippableAskbacks: [entry.mapsToAskbackId],
                    },
                    settingsSchema: scopedSchema,
                });

                expect(
                    resolved.answers.has(entry.mapsToAskbackId),
                    `${treatmentId}:${scope}:${entry.key} did not resolve ${entry.mapsToAskbackId}`
                ).toBe(true);
                expect(
                    resolved.appliedAskbacks.has(entry.mapsToAskbackId),
                    `${treatmentId}:${scope}:${entry.key} did not mark ${entry.mapsToAskbackId} as applied`
                ).toBe(true);
            }
        }
    });
});
