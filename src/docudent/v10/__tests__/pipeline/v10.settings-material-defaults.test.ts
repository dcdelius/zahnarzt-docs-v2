import { describe, it, expect } from 'vitest';
import { buildFactsFromExtraction } from '../../facts/buildFactsFromExtraction';
import { resolveSettings } from '../../settings/settingsResolver';
import { fuellungUiContract } from '../../packs/fuellung/ui.contract';

describe('v10 settings material defaults', () => {
    it('auto-fills fuellung_material from practice defaultMaterial when skippable', () => {
        const facts = buildFactsFromExtraction({
            extracted: { tooth: '26', treatmentId: 'fuellung' },
            treatmentId: 'fuellung',
        });

        const resolved = resolveSettings({
            settings: {
                practice: {
                    defaultMaterial: 'ormocer',
                },
                user: {},
            },
            facts,
            askbackPolicy: fuellungUiContract.askbackPolicy,
            settingsSchema: fuellungUiContract.settingsSchema,
        });

        expect(resolved.answers.get('fuellung_material')).toBe('ormocer');
        expect((resolved.facts as Record<string, unknown>).material).toBe('ormocer');
    });
});
