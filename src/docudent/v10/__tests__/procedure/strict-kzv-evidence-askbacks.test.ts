import { describe, expect, it } from 'vitest';

import { matchProcedureGraph } from '../../procedure/resolver/matchProcedureGraph';
import { resolveContractContext } from '../../procedure/resolver/resolveContractContext';
import { getProcedureGraphForTreatment } from '../../procedure/registry/treatments';
import type { ProcedureFacts } from '../../procedure/types';

function contract(strictKzvMode: boolean, facts: ProcedureFacts, treatmentId: string) {
    return resolveContractContext({
        facts,
        treatmentId,
        settings: { practice: { version: '1.0.0', strictKzvMode } },
    });
}

describe('Procedure: strict KZV evidence askbacks', () => {
    it('fuellung: strict mode asks Cp/P evidence set when facts are missing', () => {
        const graph = getProcedureGraphForTreatment('fuellung');
        expect(graph).toBeTruthy();

        const facts: Record<string, unknown> = {
            treatmentId: 'fuellung',
            capping: { performed: 'yes' },
            pulpaOpened: false,
            vitality: 'unknown',
            percussion: 'unknown',
        };

        const procedureFacts: ProcedureFacts = {
            global: { insuranceType: 'GKV' },
            instances: [{ instanceId: 'fuellung-26-1', tooth: '26', facts }],
        };

        const strictResult = matchProcedureGraph(
            facts,
            contract(true, procedureFacts, 'fuellung'),
            graph!
        );

        expect(strictResult.requiredAskbacks).toEqual(
            expect.arrayContaining([
                'medical_vipr',
                'medical_percussion',
                'medical_roentgen_indikation',
                'medical_roentgen_typ',
                'medical_roentgen_zeitpunkt',
                'medical_roentgen_befund',
            ])
        );
    });

    it('fuellung: strict evidence askbacks stay hidden when strict mode is off', () => {
        const graph = getProcedureGraphForTreatment('fuellung');
        expect(graph).toBeTruthy();

        const facts: Record<string, unknown> = {
            treatmentId: 'fuellung',
            capping: { performed: 'yes' },
            pulpaOpened: false,
            vitality: 'unknown',
            percussion: 'unknown',
        };

        const procedureFacts: ProcedureFacts = {
            global: { insuranceType: 'GKV' },
            instances: [{ instanceId: 'fuellung-26-1', tooth: '26', facts }],
        };

        const relaxedResult = matchProcedureGraph(
            facts,
            contract(false, procedureFacts, 'fuellung'),
            graph!
        );

        expect(relaxedResult.requiredAskbacks).not.toEqual(
            expect.arrayContaining([
                'medical_vipr',
                'medical_percussion',
                'medical_roentgen_indikation',
                'medical_roentgen_typ',
                'medical_roentgen_zeitpunkt',
                'medical_roentgen_befund',
            ])
        );
    });

    it('endo: strict mode asks radiology evidence when radiology path is active', () => {
        const graph = getProcedureGraphForTreatment('endo');
        expect(graph).toBeTruthy();

        const facts: Record<string, unknown> = {
            treatmentId: 'endo',
            endo: {
                workingLengthMethod: 'xray',
                wfTechnique: 'warm',
            },
        };

        const procedureFacts: ProcedureFacts = {
            global: { insuranceType: 'GKV' },
            instances: [{ instanceId: 'endo-46-1', tooth: '46', facts }],
        };

        const strictResult = matchProcedureGraph(
            facts,
            contract(true, procedureFacts, 'endo'),
            graph!
        );

        expect(strictResult.requiredAskbacks).toEqual(
            expect.arrayContaining([
                'medical_roentgen_indikation',
                'medical_roentgen_typ',
                'medical_roentgen_zeitpunkt',
                'medical_roentgen_befund',
            ])
        );
    });
});
