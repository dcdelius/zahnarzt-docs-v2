/**
 * Gate: V10 Default Documentation Chips must exist in KB.
 * Ensures UI defaults never point to missing chip IDs.
 */

import { describe, it, expect } from 'vitest';
import { DEFAULT_DOC_CHIPS } from '../../v10/settings/docStandardChips';
import { hasChipInKb } from '../../v10/renderer';

describe('gate-v10-doc-standard-chips', () => {
    it('all standard doc chips exist in fuellung KB', () => {
        const missing = DEFAULT_DOC_CHIPS
            .map(item => item.id)
            .filter(chipId => !hasChipInKb('fuellung', chipId));

        expect(missing).toEqual([]);
    });
});
