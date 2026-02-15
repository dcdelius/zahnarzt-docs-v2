
import { describe, it, expect } from 'vitest';
import { CHIP_CATALOG } from '../sonia/resolver/chipCatalog';
import { FEE_CATALOG } from '../sonia/rules/feeCatalog';

describe('Unified Logic Verification', () => {
    it('Chip Catalog has billing refs', () => {
        const chip = CHIP_CATALOG['Kofferdam'];
        expect(chip.billingRefs).toContain('GOZ_2040');
        expect(chip.textSnippet).toContain('Absolute Trockenlegung');
    });

    it('Fee Catalog resolves correctly', () => {
        const fee = FEE_CATALOG['GOZ_2040'];
        expect(fee.code).toBe('GOZ 2040');
        expect(fee.label).toBe('Kofferdam');
    });
});
