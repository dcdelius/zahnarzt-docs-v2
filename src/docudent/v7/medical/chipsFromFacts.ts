/**
 * V7 Medical Layer — Chips from Facts
 *
 * Emits chip IDs based on confirmed facts.
 * Uses KB canonical chip IDs from unified.json as SSOT.
 *
 * KB Chip Reference:
 * - "cp" = Indirect capping (Cp) - BEMA_25 / GOZ_2330
 * - "p" = Direct capping (P) - BEMA_26 / GOZ_2340
 * - "cp_not_required" = No capping needed
 */

import type { TreatmentFacts } from './types';
import { KB_CHIP_IDS } from './types';

export interface ChipEmission {
    chipId: string;
    source: 'medical_facts';
    reason: string;
}

/**
 * Emit chips based on confirmed medical facts
 *
 * Rules:
 * - If capping.performed === 'yes' → emit 'cp' chip (indirect capping)
 * - If capping.performed === 'no' AND cariesDepth is deep → emit 'cp_not_required'
 * - Direct capping (P) is not handled here; it would come from direct pulp exposure
 *
 * Note: Counseling is text-only in KB (via forensicNotes), no dedicated chip.
 */
export function emitChipsFromFacts(facts: TreatmentFacts): ChipEmission[] {
    const emissions: ChipEmission[] = [];

    // Only process for fuellung
    if (facts.treatmentId !== 'fuellung') {
        return emissions;
    }

    const isDeep = facts.cariesDepth === 'profunda' || facts.cariesDepth === 'pulp_near';

    // Capping chip emission
    if (facts.capping.performed === 'yes') {
        // Indirect capping (Cp)
        emissions.push({
            chipId: KB_CHIP_IDS.CP,
            source: 'medical_facts',
            reason: 'Überkappung durchgeführt (pulpanahe Kavität)',
        });
    } else if (facts.capping.performed === 'no' && isDeep) {
        // Explicitly declined capping for deep cavity
        emissions.push({
            chipId: KB_CHIP_IDS.CP_NOT_REQUIRED,
            source: 'medical_facts',
            reason: 'Überkappung nicht erforderlich',
        });
    }

    // Note: Direct capping (P) would require different trigger (pulp exposure)
    // For now, we only handle Cp in deep filling flow

    return emissions;
}

/**
 * Get just the chip IDs (for integration with existing pipeline)
 */
export function getChipIdsFromFacts(facts: TreatmentFacts): string[] {
    return emitChipsFromFacts(facts).map(e => e.chipId);
}
