import { describe, expect, it } from 'vitest';

import { DEFAULT_PRACTICE_SETTINGS } from '../../settings/settingsTypes';

describe('Settings: strict KZV defaults', () => {
    it('defaults strictKzvMode to false', () => {
        expect(DEFAULT_PRACTICE_SETTINGS.strictKzvMode).toBe(false);
    });
});
