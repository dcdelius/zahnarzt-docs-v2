import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { runV10WithAutoAnswers } from '../helpers/runV10WithAutoAnswers';
import { gateMissingEventBundles } from '../../procedure/gates/gateMissingEventBundles';
import { gateNoUnknownChipEmitters } from '../../procedure/gates/gateNoUnknownChipEmitters';
import { getProcedureGraphForTreatment } from '../../procedure/registry/treatments';

describe('gate: Endo migration is non-bypassable (procedure SSOT)', () => {
    it('endo unified.json no longer carries defaultActive legacy flags', () => {
        const filePath = path.resolve(
            process.cwd(),
            'src/docudent/core/billing/knowledgeBase/treatments/endo/unified.json'
        );
        const text = fs.readFileSync(filePath, 'utf8');
        expect(text.includes('"defaultActive"')).toBe(false);
    });

    it('endo question bank has no chipActivation side path', () => {
        const filePath = path.resolve(
            process.cwd(),
            'src/docudent/core/billing/knowledgeBase/treatments/endo/question_bank.json'
        );
        const text = fs.readFileSync(filePath, 'utf8');
        expect(text.includes('"chipActivation"')).toBe(false);
    });

    it('endo procedure graph passes event-bundle gate in BLOCK mode', () => {
        const graph = getProcedureGraphForTreatment('endo');
        expect(graph).toBeTruthy();
        const result = gateMissingEventBundles(graph, { logger: () => {}, mode: 'block' });
        expect(result.ok).toBe(true);
        expect(result.blocked).toBe(false);
    });

    it('endo runtime chips pass emitter gate in BLOCK mode', async () => {
        const result = await runV10WithAutoAnswers({
            dictation: 'Endo 46 Trepanation, Arbeitslaenge roentgen, Spuelung NaOCl, Einlage CaOH2, Kofferdam.',
            treatmentId: 'endo',
            insuranceType: 'GKV',
            textLength: 'mittel',
        });

        expect(result.state).toBe('output');
        const instances = result.meta.debug?.instances ?? [];
        expect(instances.length).toBeGreaterThan(0);

        for (const instance of instances) {
            const gate = gateNoUnknownChipEmitters(
                instance.chips.map(chipId => ({ id: chipId, emitter: instance.chipEmitters?.[chipId] })),
                { logger: () => {}, mode: 'block' }
            );
            expect(gate.ok).toBe(true);
            expect(gate.blocked).toBe(false);
        }
    });
});
