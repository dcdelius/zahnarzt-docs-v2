/**
 * Gate: No settings access in composer block (V10).
 *
 * Ensures the output composer path doesn't read settings directly.
 */

import { describe, it, expect } from 'vitest';
import { gateNoSettingsAccessInComposer } from '../../v10/procedure/gates/gateNoSettingsAccessInComposer';

describe('gate-v10-no-settings-in-composer', () => {
    it('composer block must not access settings or renderContext', () => {
        const result = gateNoSettingsAccessInComposer();
        if (!result.ok) {
            console.error('Composer settings access violations:', result.violations);
        }
        expect(result.ok).toBe(true);
        expect(result.violations).toHaveLength(0);
    });
});
