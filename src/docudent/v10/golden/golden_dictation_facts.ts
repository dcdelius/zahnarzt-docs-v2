/**
 * Golden Dictation Facts — Forced Unknown Values
 * 
 * GP3: Extended with knowledge pack fact structure.
 * When enabled, these facts are set to 'unknown' to FORCE askbacks.
 * 
 * INVARIANTS:
 * - Only affects testOnly mode, never production
 * - Explicitly listed, no randomness
 * - Guarantees at least 4 askbacks per run (from knowledge pack)
 */

// ═══════════════════════════════════════════════════════════════
// GOLDEN FACTS - Values that force askbacks (aligned with knowledge pack)
// ═══════════════════════════════════════════════════════════════

/**
 * Facts from knowledge pack: fuellung_de_knowledge.v1.json
 * Each entry maps to a specific medical KB rule from GP2.
 */
export const GOLDEN_UNKNOWN_FACTS: Record<string, unknown> = {
    // ── Treatment Context ─────────────────────────────────────
    treatmentId: 'fuellung',
    toothIds: ['36'],
    surfacesByTooth: { '36': ['o'] },

    // ── Material (triggers rule-material-unknown-askback) ────
    materialMentioned: 'unknown',

    // ── Isolation (triggers rule-isolation-unknown-askback) ──
    isolationMentioned: 'unknown',

    // ── Adhesive (triggers rule-adhesive-unknown-composite-askback)
    // Note: Only fires when materialMentioned=komposit
    adhesiveTechnique: undefined,

    // ── Cavity Extent (for layering askback) ─────────────────
    cavityExtentHint: 'medium',

    // ── Layering (triggers rule-layering-unknown-medium-large-askback)
    layeringMentioned: 'unknown',

    // ── Caries Depth (triggers rule-deep-caries-protection-askback)
    cariesDepthHint: 'deep',

    // ── Insurance Context (triggers rule-insurance-context-unknown-askback)
    insuranceContextHint: 'unknown',

    // ── Legacy facts for existing askbacks ───────────────────
    cariesDepth: 'profunda',
    'capping.performed': 'unknown',
    mkvPresent: 'unknown',
    kofferdamMentioned: true,
    kofferdamUsed: 'unknown',
};

/**
 * Golden extraction with komposit material set.
 * This version triggers the adhesive and layering askbacks.
 */
export const GOLDEN_EXTRACTION_COMPOSITE: Record<string, unknown> = {
    treatmentId: 'fuellung',
    toothIds: ['36'],
    surfacesByTooth: { '36': ['o'] },
    materialMentioned: 'komposit', // Set to trigger adhesive/layering asks
    isolationMentioned: 'unknown',
    adhesiveTechnique: undefined,
    cavityExtentHint: 'medium',
    layeringMentioned: 'unknown',
    cariesDepthHint: 'deep',
    insuranceContextHint: 'unknown',
};

/**
 * Golden extraction with all unknowns (maximum askbacks).
 */
export const GOLDEN_EXTRACTION_MAX: Record<string, unknown> = {
    treatmentId: 'fuellung',
    toothIds: ['36'],
    surfacesByTooth: { '36': ['o'] },
    materialMentioned: 'unknown',
    isolationMentioned: 'unknown',
    adhesiveTechnique: undefined,
    cavityExtentHint: 'medium',
    layeringMentioned: 'unknown',
    cariesDepthHint: 'deep',
    insuranceContextHint: 'unknown',
};

// Alias for backwards compatibility
export const GOLDEN_EXTRACTION = GOLDEN_EXTRACTION_MAX;

// ═══════════════════════════════════════════════════════════════
// ASKBACK TRIGGERS (aligned with GP2 rules)
// ═══════════════════════════════════════════════════════════════

/**
 * Lists which askbacks are guaranteed to trigger in golden mode.
 * From knowledge pack + existing rules.
 */
export const GUARANTEED_ASKBACKS = [
    // From knowledge pack (GP2)
    {
        id: 'fuellung_material',
        reason: 'materialMentioned=unknown',
        expectedRule: 'rule-material-unknown-askback',
    },
    {
        id: 'fuellung_isolation',
        reason: 'isolationMentioned=unknown',
        expectedRule: 'rule-isolation-unknown-askback',
    },
    {
        id: 'fuellung_pulpaschutz',
        reason: 'cariesDepthHint=deep',
        expectedRule: 'rule-deep-caries-protection-askback',
    },
    {
        id: 'fuellung_insurance_context',
        reason: 'insuranceContextHint=unknown',
        expectedRule: 'rule-insurance-context-unknown-askback',
        optional: true, // context-only askback
    },
    // Conditional (only when material=komposit)
    {
        id: 'fuellung_adhesive',
        reason: 'materialMentioned=komposit + adhesiveTechnique=unset',
        expectedRule: 'rule-adhesive-unknown-composite-askback',
        conditional: 'materialMentioned=komposit',
    },
    {
        id: 'fuellung_layering',
        reason: 'materialMentioned=komposit + cavityExtent=medium/large + layeringMentioned=unknown',
        expectedRule: 'rule-layering-unknown-medium-large-askback',
        conditional: 'materialMentioned=komposit',
    },
    // Legacy askbacks
    {
        id: 'medical_ueberkappung',
        reason: 'cariesDepth=profunda + capping.performed=unknown',
        expectedRule: 'rule-profunda-requires-ueberkappung-askback',
    },
] as const;

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Apply golden facts to extraction result.
 * Called when testOnly.goldenMode is enabled.
 */
export function applyGoldenFacts(
    extracted: Record<string, unknown>
): Record<string, unknown> {
    return {
        ...extracted,
        // Override with golden facts for askback triggering
        treatmentId: 'fuellung',
        materialMentioned: 'unknown',
        isolationMentioned: 'unknown',
        adhesiveTechnique: undefined,
        cavityExtentHint: 'medium',
        layeringMentioned: 'unknown',
        cariesDepthHint: 'deep',
        insuranceContextHint: 'unknown',
        // Legacy
        cariesDepth: 'profunda',
        'capping.performed': 'unknown',
    };
}

/**
 * Apply golden facts with komposit material set.
 * Forces adhesive and layering askbacks.
 */
export function applyGoldenFactsComposite(
    extracted: Record<string, unknown>
): Record<string, unknown> {
    return {
        ...applyGoldenFacts(extracted),
        materialMentioned: 'komposit',
    };
}

/**
 * Get the minimum expected askback count in golden mode.
 * Counts required askbacks (not optional, not conditional).
 */
export function getMinAskbackCount(): number {
    return GUARANTEED_ASKBACKS.filter(
        a => !('optional' in a) && !('conditional' in a)
    ).length;
}

/**
 * Get all expected askback IDs in golden mode.
 */
export function getExpectedAskbackIds(): string[] {
    return GUARANTEED_ASKBACKS.map(a => a.id);
}

/**
 * Get askback IDs that fire for material=komposit scenario.
 */
export function getCompositeAskbackIds(): string[] {
    return GUARANTEED_ASKBACKS
        .filter(a => !('conditional' in a) || a.conditional?.includes('komposit'))
        .map(a => a.id);
}
