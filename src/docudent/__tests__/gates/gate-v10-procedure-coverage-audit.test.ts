/**
 * Gate: Procedure Coverage (per treatment)
 *
 * All KB chips must be emitted by procedure nodes (incl. doc-standard chips).
 */

import { describe, it, expect } from 'vitest';
import { getAllChipIds } from '../../v10/renderer';
import { getProcedureGraphForTreatment } from '../../v10/procedure/registry/treatments';
import { DEFAULT_DOC_CHIPS } from '../../v10/settings/docStandardChips';

const TREATMENTS = ['fuellung', 'endo', 'extraction', 'pzr', 'crown_prep'];

function getStaticEmittedChips(treatmentId: string): Set<string> {
    const graph = getProcedureGraphForTreatment(treatmentId);
    const emitted = new Set<string>();
    if (!graph) return emitted;
    for (const node of graph.nodes) {
        for (const chipId of node.emitChips ?? []) {
            if (chipId) emitted.add(chipId);
        }
    }
    return emitted;
}

describe('gate-v10-procedure-coverage-audit', () => {
    for (const treatmentId of TREATMENTS) {
        it(`coverage audit: ${treatmentId}`, () => {
            const kbChips = getAllChipIds(treatmentId);
            const emitted = getStaticEmittedChips(treatmentId);

            // Dynamic emitters: contract.standard_chips can emit DEFAULT_DOC_CHIPS
            for (const item of DEFAULT_DOC_CHIPS) {
                if (kbChips.includes(item.id)) {
                    emitted.add(item.id);
                }
            }

            const missing = kbChips.filter(id => !emitted.has(id));
            const coverage = kbChips.length > 0
                ? Math.round(((kbChips.length - missing.length) / kbChips.length) * 100)
                : 0;

            console.log(`[AUDIT] ${treatmentId}: coverage=${coverage}% (${kbChips.length - missing.length}/${kbChips.length})`);
            if (missing.length > 0) {
                console.log(`[AUDIT] ${treatmentId} missing chips (static):`, missing.slice(0, 40));
                if (missing.length > 40) {
                    console.log(`[AUDIT] ${treatmentId} missing chips: +${missing.length - 40} more`);
                }
            }

            expect(missing).toEqual([]);
        });
    }
});
