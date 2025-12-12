/**
 * V6 Output Service — PURE PASSTHROUGH
 * 
 * This service MUST NOT contain any fachliche Logik:
 * - NO chip inference
 * - NO defaults
 * - NO answer→chip mapping
 * - NO switch-cases for chip IDs
 * 
 * It ONLY orchestrates Engine calls:
 * 1. resolveActiveChipIds() - from chipResolver
 * 2. processChipsToBilling() - from treatmentEngine
 * 3. composeOutput() - from outputComposer
 */

import type {
    ExtractedData,
    InsuranceType,
    TextLength
} from '../hooks/useDocudentV6';

// Engine imports - SINGLE SOURCE OF TRUTH
import {
    processChipsToBilling,
    getTreatmentChips,
    type ChipDefinition
} from '../../core/billing/knowledgeBase/logic/treatmentEngine';

// Chip Resolver - SSOT for chip selection
import {
    resolveActiveChipIds
} from '../../core/billing/knowledgeBase/logic/chipResolver';

// Output Composer - SSOT for output generation
import {
    composeOutput,
    type ComposedOutput,
    type ComposedSection,
    type ComposeOptions
} from '../../core/billing/knowledgeBase/logic/outputComposer';

// Re-export types for UI
export type { ComposedOutput, ComposedSection };

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface GenerateOutputParams {
    extracted: ExtractedData;
    answers: Map<string, any>; // Allow number/boolean answers
    insuranceType: InsuranceType;
    textLength: TextLength;
    hasMKV?: boolean;
    mkvBetrag?: number;
}

// ═══════════════════════════════════════════════════════════════
// MAIN FUNCTION — PURE PASSTHROUGH (NO LOGIC)
// ═══════════════════════════════════════════════════════════════

export async function generateFinalOutput(params: GenerateOutputParams): Promise<ComposedOutput> {
    const { extracted, answers, insuranceType, textLength, hasMKV = false, mkvBetrag } = params;

    console.log('[V6 Output] PASSTHROUGH MODE: Using chipResolver + Engine + Composer');
    console.log('[V6 Output] Input:', {
        extracted,
        answers: Object.fromEntries(answers),
        insuranceType,
        textLength,
        hasMKV
    });

    const treatmentId = 'fuellung'; // TODO: from category selection

    // ═══════════════════════════════════════════════════════════════
    // STEP 1: Resolve active chips via SSOT chipResolver
    // (NO LOGIC HERE — chipResolver uses JSON mappings)
    // ═══════════════════════════════════════════════════════════════
    const activeChipIds = resolveActiveChipIds(
        treatmentId,
        extracted,
        answers,
        { hasMKV, insuranceType }
    );
    console.log('[V6 Output] Resolved chip IDs (from chipResolver):', activeChipIds);

    // ═══════════════════════════════════════════════════════════════
    // STEP 2: Get full chip definitions and process billing
    // (NO LOGIC HERE — treatmentEngine is SSOT)
    // ═══════════════════════════════════════════════════════════════
    const allChips = getTreatmentChips(treatmentId);
    const activeChips: ChipDefinition[] = allChips.filter(c => activeChipIds.includes(c.id));

    const engineResult = processChipsToBilling(
        treatmentId,
        activeChipIds,
        insuranceType,
        hasMKV,
        {
            tooth: extracted.tooth || undefined,
            surfaces: extracted.surfaces || [],
            diagnosis: extracted.diagnosis || undefined
        },
        textLength
    );
    console.log('[V6 Output] Engine result:', engineResult);

    // ═══════════════════════════════════════════════════════════════
    // STEP 3: Build extractedData for composer (facts only, no strings)
    // ═══════════════════════════════════════════════════════════════
    const extractedDataForComposer: Record<string, any> = {
        tooth: extracted.tooth || '?',
        surfaces: extracted.surfaces || [],
        diagnosis: extracted.diagnosis || '?',
        costs: extracted.costs
        // NO fachliche Strings here like "relative Trockenlegung"
        // The composer gets that from chip definitions
    };

    // ═══════════════════════════════════════════════════════════════
    // STEP 4: Compose output via SSOT outputComposer
    // (NO LOGIC HERE — outputComposer uses templates + chip snippets)
    // ═══════════════════════════════════════════════════════════════
    const composeOptions: ComposeOptions = {
        textLength,
        hasMKV,
        // hasAnesthesia REMOVED (Option B) — Composer derives from activeChips
        mkvBetrag
    };

    const composedOutput = composeOutput(
        treatmentId,
        engineResult,
        activeChips,
        extractedDataForComposer,
        insuranceType,
        composeOptions
    );

    console.log('[V6 Output] Composed output:', {
        sectionCount: composedOutput.sections.length,
        billingCodeCount: composedOutput.billingCodes.length,
        warningCount: composedOutput.warnings.length
    });

    return composedOutput;
}
