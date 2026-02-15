import { describe, expect, it, vi } from 'vitest';
import { gateNoUnknownChipEmitters } from '@/docudent/v10/procedure/gates/gateNoUnknownChipEmitters';

describe('gateNoUnknownChipEmitters', () => {
    it('warns when chip has no emitter', () => {
        const logger = vi.fn();
        const result = gateNoUnknownChipEmitters([{ id: 'chip-a' }], { logger });
        expect(result.ok).toBe(false);
        expect(result.warnings.length).toBe(1);
        expect(logger).toHaveBeenCalled();
    });

    it('passes when emitter is node:* or manualOverride', () => {
        const logger = vi.fn();
        const result = gateNoUnknownChipEmitters(
            [
                { id: 'chip-a', emitter: 'node:common.anesthesia.infiltration' },
                { id: 'chip-b', emitter: 'manualOverride' },
            ],
            { logger }
        );
        expect(result.ok).toBe(true);
        expect(result.warnings.length).toBe(0);
        expect(logger).not.toHaveBeenCalled();
    });
});
