import { describe, expect, it } from 'vitest';

import { resolveContractContext } from '../../procedure/resolver/resolveContractContext';

describe('Procedure: strict KZV contract context', () => {
    it('defaults to strictKzv=false when not set', () => {
        const contract = resolveContractContext({
            facts: { global: { insuranceType: 'GKV' }, instances: [] },
        });

        expect(contract.values.strictKzv).toBe(false);
    });

    it('propagates practice strictKzvMode=true into contract', () => {
        const contract = resolveContractContext({
            facts: { global: { insuranceType: 'GKV' }, instances: [] },
            settings: { practice: { version: '1.0.0', strictKzvMode: true } },
        });

        expect(contract.values.strictKzv).toBe(true);
    });
});
