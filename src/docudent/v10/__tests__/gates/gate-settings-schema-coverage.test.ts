import { describe, expect, it } from 'vitest';
import { getPack, listPackIds } from '../../packs';

describe('gate: settings schema coverage (active onboarding set)', () => {
    it('all active packs expose at least one settings schema entry', () => {
        for (const treatmentId of listPackIds()) {
            if (treatmentId === 'extraction_stub') continue;
            const schema = getPack(treatmentId).getUiContract().settingsSchema;
            const count = (schema.practice?.length ?? 0) + (schema.user?.length ?? 0);
            expect(count, `${treatmentId}: settingsSchema is empty`).toBeGreaterThan(0);
        }
    });
});
