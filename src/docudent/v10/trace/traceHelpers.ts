/**
 * V10 Trace Helpers — V7-Compatible Format Builders
 *
 * These helpers produce the exact "detail" strings V7 tests expect.
 * Format: "{key}={value};{key}={value}..."
 */

// ═══════════════════════════════════════════════════════════════
// TRACE DETAIL BUILDERS
// ═══════════════════════════════════════════════════════════════

/**
 * Create trace detail for input stage.
 * Format: "treatment=...;insurance=...;mkv=..."
 */
export function traceInput(
    treatmentId: string,
    insuranceType: string,
    hasMKV: boolean
): string {
    return `treatment=${treatmentId};insurance=${insuranceType};mkv=${hasMKV}`;
}

/**
 * Create trace detail for extract stage.
 * Format: "engine=...;tooth=...;surfaces=..."
 */
export function traceExtract(
    engine: 'stub' | 'llm' | 'forced',
    tooth: string | null,
    surfaces: string[]
): string {
    return `engine=${engine};tooth=${tooth || 'none'};surfaces=${surfaces.join(',') || 'none'}`;
}

/**
 * Create trace detail for questions stage.
 * Format: "engine=...;count=...;ids=..."
 */
export function traceQuestions(
    engine: string,
    count: number,
    ids: string[]
): string {
    const idSummary = ids.slice(0, 5).join(',') + (ids.length > 5 ? '...' : '');
    return `engine=${engine};count=${count};ids=${idSummary || 'none'}`;
}

/**
 * Create trace detail for gate stage.
 * Format: "canProceed=...;missing=..."
 */
export function traceGate(
    canProceed: boolean,
    missingIds: string[]
): string {
    return `canProceed=${canProceed};missing=${missingIds.join(',') || 'none'}`;
}

/**
 * Create trace detail for render stage.
 * Format: "sections=..."
 */
export function traceRender(sectionIds: string[]): string {
    return `sections=${sectionIds.join(',') || 'none'}`;
}

/**
 * Create trace detail for billing stage.
 * Format: "codes=...;blocked=..."
 */
export function traceBilling(
    codes: string[],
    blocked: string[]
): string {
    const codeSummary = codes.slice(0, 5).join(',') + (codes.length > 5 ? '...' : '');
    return `codes=${codeSummary || 'none'};blocked=${blocked.join(',') || 'none'}`;
}

/**
 * Create trace detail for billing_inputs stage.
 * Format: "treatmentId=...;endo_step=...;..."
 */
export function traceBillingInputs(
    treatmentId: string,
    endoStep: string | undefined,
    canalCount: number | undefined,
    insuranceType: string,
    hasMKV: boolean,
    tooth: string | undefined
): string {
    return `treatmentId=${treatmentId};endo_step=${endoStep || 'none'};canal_count=${canalCount ?? 0};insurance=${insuranceType};mkv=${hasMKV};tooth=${tooth || 'none'}`;
}

/**
 * Create trace detail for billing_result stage.
 * Format: "codes=...;blocked=...;reason=..."
 */
export function traceBillingResult(
    codesCount: number,
    blockedCount: number,
    reason: string | undefined,
    conflicts?: number
): string {
    let result = `codes=${codesCount};blocked=${blockedCount};reason=${reason || 'none'}`;
    if (conflicts !== undefined) {
        result += `;conflicts=${conflicts}`;
    }
    return result;
}

/**
 * Create trace detail for medical_summary stage.
 * Format: "minimalDataset=...;hard=...;soft=...;findings=..."
 */
export function traceMedicalSummary(
    minimalDatasetMet: boolean,
    hardAskbackCount: number,
    softAskbackCount: number,
    findingCount: number
): string {
    return `minimalDataset=${minimalDatasetMet};hard=${hardAskbackCount};soft=${softAskbackCount};findings=${findingCount}`;
}

/**
 * Create trace detail for defaults stage.
 * Format: "practice=...;template=..."
 */
export function traceDefaults(
    practiceKeys: string[],
    templateKeys: string[]
): string {
    return `practice=${practiceKeys.join(',') || 'none'};template=${templateKeys.join(',') || 'none'}`;
}

/**
 * Create trace detail for answers stage.
 * Format: "count=...;ids=..."
 */
export function traceAnswers(count: number, ids: string[]): string {
    const idSummary = ids.slice(0, 5).join(',') + (ids.length > 5 ? '...' : '');
    return `count=${count};ids=${idSummary || 'none'}`;
}

/**
 * Create trace detail for testOnly marker.
 * Format: "overrides=...;skipCombinability=..."
 */
export function traceTestOnly(
    overrides: string[],
    skipCombinability: boolean
): string {
    return `overrides=${overrides.join(',') || 'none'};skipCombinability=${skipCombinability}`;
}

/**
 * Create trace detail for milchzahn gate.
 * Format: "milchzahnUnsupported=...;reason=..."
 */
export function traceMilchzahn(
    unsupported: boolean,
    reason?: string
): string {
    return `milchzahnUnsupported=${unsupported};reason=${reason || 'none'}`;
}

/**
 * Create trace detail for kb_medical stage.
 * Format: "source=...;version=...;hash=..."
 */
export function traceKbMedical(
    source: 'json' | 'firestore' | 'forced',
    version: string,
    hash: string
): string {
    return `source=${source};version=${version};hash=${hash}`;
}

/**
 * Create trace detail for kb_treatment stage.
 * Format: "source=...;treatment=...;version=...;hash=..."
 */
export function traceKbTreatment(
    source: 'json' | 'firestore' | 'firestore_fallback' | 'forced',
    treatmentId: string,
    version: string,
    hash: string
): string {
    return `source=${source};treatment=${treatmentId};version=${version};hash=${hash}`;
}

