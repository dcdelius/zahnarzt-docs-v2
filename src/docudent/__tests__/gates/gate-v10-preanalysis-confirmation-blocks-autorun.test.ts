import { describe, expect, it, vi } from 'vitest';
import { runPreanalyzedBundle } from '../../v10/preanalysis/runPreanalyzedBundle';

describe('gate-v10-preanalysis-confirmation-blocks-autorun', () => {
    it('does not run bundle pipeline when preanalysis requires confirmation', async () => {
        const runBundle = vi.fn();

        const result = await runPreanalyzedBundle({
            dictation: '36 für Krone beschliffen, danach Aufbaufüllung gelegt.',
            insuranceType: 'GKV',
            textLength: 'mittel',
            forceFallback: true,
        }, { runBundle });

        expect(result.state).toBe('needs_confirmation');
        expect(runBundle).not.toHaveBeenCalled();
    });
});
