/**
 * Combinability Truthcases v1
 *
 * 25+ test cases for combinability validation.
 * Each case defines codes and expected verdict.
 */

export interface CombinabilityTruthcase {
    id: string;
    description: string;
    codes: string[];
    insuranceType: 'GKV' | 'PKV' | 'MKV';
    scope: 'session' | 'tooth' | 'multi-tooth';
    teeth?: string[];
    expectedVerdict: 'pass' | 'warn' | 'block';
    expectedConflictCount?: number;
    source: string; // Reference/rationale
}

/**
 * Combinability truthcases for validation.
 */
export const COMBINABILITY_TRUTHCASES: CombinabilityTruthcase[] = [
    // ═══════════════════════════════════════════════════════════════════
    // PASS cases (should be allowed)
    // ═══════════════════════════════════════════════════════════════════
    {
        id: 'pass_001_single_code',
        description: 'Single GOZ code should always pass',
        codes: ['GOZ_2060'],
        insuranceType: 'PKV',
        scope: 'session',
        expectedVerdict: 'pass',
        source: 'Basic GOZ standalone',
    },
    {
        id: 'pass_002_bema_basic',
        description: 'Basic BEMA codes combination',
        codes: ['BEMA_25', 'BEMA_12'],
        insuranceType: 'GKV',
        scope: 'session',
        expectedVerdict: 'pass',
        source: 'Common fuellung codes',
    },
    {
        id: 'pass_003_la_kofferdam',
        description: 'Anesthesia + Kofferdam allowed',
        codes: ['BEMA_40', 'BEMA_12'],
        insuranceType: 'GKV',
        scope: 'session',
        expectedVerdict: 'pass',
        source: 'Standard combination',
    },
    {
        id: 'pass_004_endo_basic',
        description: 'Basic endo codes',
        codes: ['BEMA_32', 'BEMA_31'],
        insuranceType: 'GKV',
        scope: 'session',
        expectedVerdict: 'pass',
        source: 'Endo treatment chain',
    },
    {
        id: 'pass_005_pkv_goz_chain',
        description: 'PKV GOZ fuellung chain',
        codes: ['GOZ_2060', 'GOZ_2040', 'GOZ_0090'],
        insuranceType: 'PKV',
        scope: 'session',
        expectedVerdict: 'pass',
        source: 'Standard PKV fuellung',
    },
    {
        id: 'pass_006_multi_tooth_separate',
        description: 'Same codes on different teeth allowed',
        codes: ['BEMA_25'],
        insuranceType: 'GKV',
        scope: 'multi-tooth',
        teeth: ['36', '46'],
        expectedVerdict: 'pass',
        source: 'Per-tooth billing',
    },
    {
        id: 'pass_007_mkv_basic',
        description: 'MKV basic codes',
        codes: ['GOZ_2060', 'BEMA_25'],
        insuranceType: 'MKV',
        scope: 'session',
        expectedVerdict: 'pass',
        source: 'MKV mixed codes',
    },
    {
        id: 'pass_008_empty_codes',
        description: 'Empty code list should pass',
        codes: [],
        insuranceType: 'GKV',
        scope: 'session',
        expectedVerdict: 'pass',
        source: 'Edge case',
    },
    {
        id: 'pass_009_single_bema',
        description: 'Single BEMA code',
        codes: ['BEMA_25'],
        insuranceType: 'GKV',
        scope: 'session',
        expectedVerdict: 'pass',
        source: 'Basic case',
    },
    {
        id: 'pass_010_fluoridierung',
        description: 'Fluoridierung combination',
        codes: ['BEMA_25', 'GOZ_1040'],
        insuranceType: 'MKV',
        scope: 'session',
        expectedVerdict: 'pass',
        source: 'Fuellung + Fluor',
    },

    // ═══════════════════════════════════════════════════════════════════
    // WARN cases (should warn but not block)
    // ═══════════════════════════════════════════════════════════════════
    {
        id: 'warn_001_frequency_limit',
        description: 'Code near frequency limit',
        codes: ['BEMA_01', 'BEMA_01'],
        insuranceType: 'GKV',
        scope: 'session',
        expectedVerdict: 'warn',
        source: 'Frequency check',
    },
    {
        id: 'warn_002_unusual_combo',
        description: 'Unusual but not forbidden combination',
        codes: ['GOZ_2080', 'GOZ_2060'],
        insuranceType: 'PKV',
        scope: 'session',
        expectedVerdict: 'warn',
        source: 'Rare combination',
    },
    {
        id: 'warn_003_multiple_la',
        description: 'Multiple anesthesia codes',
        codes: ['BEMA_40', 'BEMA_41a'],
        insuranceType: 'GKV',
        scope: 'session',
        expectedVerdict: 'warn',
        source: 'Double LA unusual',
    },

    // ═══════════════════════════════════════════════════════════════════
    // BLOCK cases (must be rejected)
    // ═══════════════════════════════════════════════════════════════════
    {
        id: 'block_001_exclusion_goz',
        description: 'GOZ mutual exclusion',
        codes: ['GOZ_2197', 'GOZ_2060'],
        insuranceType: 'PKV',
        scope: 'session',
        expectedVerdict: 'block',
        expectedConflictCount: 1,
        source: 'GOZ Ausschluss',
    },
    {
        id: 'block_002_same_tooth_conflict',
        description: 'Conflicting codes same tooth',
        codes: ['GOZ_2060', 'GOZ_2080'],
        insuranceType: 'PKV',
        scope: 'tooth',
        teeth: ['36'],
        expectedVerdict: 'block',
        source: 'Same-tooth exclusion',
    },
    {
        id: 'block_003_bema_exclusion',
        description: 'BEMA mutual exclusion',
        codes: ['BEMA_13a', 'BEMA_13b'],
        insuranceType: 'GKV',
        scope: 'session',
        expectedVerdict: 'block',
        source: 'BEMA Ausschluss',
    },
    {
        id: 'block_004_triple_conflict',
        description: 'Three-way conflict',
        codes: ['GOZ_2197', 'GOZ_2060', 'GOZ_2080'],
        insuranceType: 'PKV',
        scope: 'session',
        expectedVerdict: 'block',
        expectedConflictCount: 2,
        source: 'Multiple exclusions',
    },
    {
        id: 'block_005_session_exclusion',
        description: 'Session-level exclusion',
        codes: ['BEMA_01', 'BEMA_04'],
        insuranceType: 'GKV',
        scope: 'session',
        expectedVerdict: 'block',
        source: 'Session exclusion',
    },
    {
        id: 'block_006_quadrant_conflict',
        description: 'Quadrant-level conflict',
        codes: ['GOZ_4000', 'GOZ_4005'],
        insuranceType: 'PKV',
        scope: 'session',
        expectedVerdict: 'block',
        source: 'Quadrant exclusion',
    },
    {
        id: 'block_007_mkv_conflict',
        description: 'MKV specific conflict',
        codes: ['GOZ_2197', 'BEMA_25'],
        insuranceType: 'MKV',
        scope: 'session',
        expectedVerdict: 'block',
        source: 'MKV exclusion',
    },

    // ═══════════════════════════════════════════════════════════════════
    // Multi-tooth specific cases
    // ═══════════════════════════════════════════════════════════════════
    {
        id: 'multi_001_two_teeth_pass',
        description: 'Two teeth with compatible codes',
        codes: ['BEMA_25', 'BEMA_25'],
        insuranceType: 'GKV',
        scope: 'multi-tooth',
        teeth: ['36', '46'],
        expectedVerdict: 'pass',
        source: 'Multi-tooth allowed',
    },
    {
        id: 'multi_002_quadrant_limit',
        description: 'Quadrant treatment limit',
        codes: ['GOZ_4000', 'GOZ_4000', 'GOZ_4000', 'GOZ_4000'],
        insuranceType: 'PKV',
        scope: 'multi-tooth',
        teeth: ['16', '17', '18', '15'],
        expectedVerdict: 'warn',
        source: 'Quadrant overuse',
    },
    {
        id: 'multi_003_cross_quadrant_block',
        description: 'Cross-quadrant exclusion',
        codes: ['GOZ_4070', 'GOZ_4070'],
        insuranceType: 'PKV',
        scope: 'multi-tooth',
        teeth: ['16', '26'],
        expectedVerdict: 'block',
        source: 'Cross-quadrant exclusion',
    },

    // ═══════════════════════════════════════════════════════════════════
    // Edge cases
    // ═══════════════════════════════════════════════════════════════════
    {
        id: 'edge_001_duplicate_code',
        description: 'Duplicate code in list',
        codes: ['BEMA_25', 'BEMA_25'],
        insuranceType: 'GKV',
        scope: 'session',
        expectedVerdict: 'warn',
        source: 'Duplicate detection',
    },
    {
        id: 'edge_002_case_sensitivity',
        description: 'Case handling',
        codes: ['bema_25', 'BEMA_12'],
        insuranceType: 'GKV',
        scope: 'session',
        expectedVerdict: 'pass',
        source: 'Case normalization',
    },

    // ═══════════════════════════════════════════════════════════════════
    // HIGH-PAIN CASES v2 (20 additional realistic cases)
    // ═══════════════════════════════════════════════════════════════════

    // --- ENDO FLOWS (Wurzelkanalbehandlung) ---
    {
        id: 'endo_pass_001_wkb_chain',
        description: 'Complete WKB chain: Trepanation + WL + WF',
        codes: ['BEMA_32', 'BEMA_33', 'BEMA_34'],
        insuranceType: 'GKV',
        scope: 'session',
        expectedVerdict: 'pass',
        source: 'Standard Endo GKV flow',
    },
    {
        id: 'endo_pass_002_wkb_pkv_full',
        description: 'PKV WKB with all steps',
        codes: ['GOZ_2330', 'GOZ_2340', 'GOZ_2350', 'GOZ_2360'],
        insuranceType: 'PKV',
        scope: 'session',
        expectedVerdict: 'pass',
        source: 'Full PKV Endo chain',
    },
    {
        id: 'endo_pass_003_multi_canal',
        description: 'Multi-canal WKB (3+ Kanäle)',
        codes: ['GOZ_2360', 'GOZ_2360', 'GOZ_2360'],
        insuranceType: 'PKV',
        scope: 'session',
        expectedVerdict: 'pass',
        source: 'Multi-canal billing allowed',
    },
    {
        id: 'endo_block_001_wf_ohne_wl',
        description: 'WF ohne WL nicht erlaubt',
        codes: ['BEMA_34'],
        insuranceType: 'GKV',
        scope: 'session',
        expectedVerdict: 'block',
        source: 'WF requires WL first',
    },
    {
        id: 'endo_warn_001_revision',
        description: 'Revisionsbehandlung Warnung',
        codes: ['GOZ_2410', 'GOZ_2330'],
        insuranceType: 'PKV',
        scope: 'session',
        expectedVerdict: 'warn',
        source: 'Revision unusual with primary',
    },

    // --- GOZ CLUSTER CONFLICTS ---
    {
        id: 'goz_block_001_2100_2120',
        description: 'GOZ 2100 + 2120 same tooth',
        codes: ['GOZ_2100', 'GOZ_2120'],
        insuranceType: 'PKV',
        scope: 'tooth',
        teeth: ['36'],
        expectedVerdict: 'block',
        source: 'Inlay/Onlay exclusion',
    },
    {
        id: 'goz_block_002_crown_veneer',
        description: 'Krone + Veneer same tooth',
        codes: ['GOZ_2210', 'GOZ_2220'],
        insuranceType: 'PKV',
        scope: 'tooth',
        teeth: ['11'],
        expectedVerdict: 'block',
        source: 'Crown/Veneer mutual exclusion',
    },
    {
        id: 'goz_pass_001_adjacent',
        description: 'Adjacent teeth different treatments',
        codes: ['GOZ_2100', 'GOZ_2120'],
        insuranceType: 'PKV',
        scope: 'multi-tooth',
        teeth: ['36', '37'],
        expectedVerdict: 'pass',
        source: 'Different teeth allowed',
    },
    {
        id: 'goz_warn_001_many_fillings',
        description: 'Many fillings same session',
        codes: ['GOZ_2060', 'GOZ_2060', 'GOZ_2060', 'GOZ_2060', 'GOZ_2060'],
        insuranceType: 'PKV',
        scope: 'session',
        expectedVerdict: 'warn',
        source: 'Unusual quantity',
    },

    // --- LA + KOFFERDAM ---
    {
        id: 'la_pass_001_infiltr_fuellung',
        description: 'LA Infiltration + Füllung standard',
        codes: ['BEMA_40', 'BEMA_25'],
        insuranceType: 'GKV',
        scope: 'session',
        expectedVerdict: 'pass',
        source: 'Standard LA + treatment',
    },
    {
        id: 'la_pass_002_leitung_endo',
        description: 'LA Leitung + Endo standard',
        codes: ['BEMA_41a', 'BEMA_32', 'BEMA_33'],
        insuranceType: 'GKV',
        scope: 'session',
        expectedVerdict: 'pass',
        source: 'Mandibular block + Endo',
    },
    {
        id: 'kofferdam_pass_001_with_endo',
        description: 'Kofferdam with Endo required',
        codes: ['BEMA_12', 'BEMA_32', 'BEMA_33', 'BEMA_34'],
        insuranceType: 'GKV',
        scope: 'session',
        expectedVerdict: 'pass',
        source: 'Kofferdam mandatory for Endo',
    },
    {
        id: 'la_block_001_triple',
        description: 'Three LA types same session blocked',
        codes: ['BEMA_40', 'BEMA_41a', 'BEMA_42'],
        insuranceType: 'GKV',
        scope: 'session',
        expectedVerdict: 'block',
        source: 'Triple LA exclusion',
    },

    // --- MKV SPECIFIC ---
    {
        id: 'mkv_pass_001_mixed',
        description: 'MKV mixed billing basic',
        codes: ['BEMA_25', 'GOZ_2040'],
        insuranceType: 'MKV',
        scope: 'session',
        expectedVerdict: 'pass',
        source: 'Basic MKV mix',
    },
    {
        id: 'mkv_warn_001_upgrade',
        description: 'MKV upgrade warning',
        codes: ['BEMA_25', 'GOZ_2060'],
        insuranceType: 'MKV',
        scope: 'session',
        expectedVerdict: 'warn',
        source: 'Upgrade path unclear',
    },

    // --- FREQUENCY / LIMITS ---
    {
        id: 'freq_block_001_pzr_double',
        description: 'PZR twice same quarter blocked',
        codes: ['BEMA_107a', 'BEMA_107a'],
        insuranceType: 'GKV',
        scope: 'session',
        expectedVerdict: 'block',
        source: 'PZR frequency limit',
    },
    {
        id: 'freq_warn_001_01_multiple',
        description: 'Multiple 01 unusual',
        codes: ['BEMA_01', 'BEMA_01', 'BEMA_01'],
        insuranceType: 'GKV',
        scope: 'session',
        expectedVerdict: 'warn',
        source: 'Frequency unusual',
    },

    // --- EDGE CASES ---
    {
        id: 'edge_003_empty_tooth',
        description: 'Tooth scope with no tooth specified',
        codes: ['BEMA_25'],
        insuranceType: 'GKV',
        scope: 'tooth',
        expectedVerdict: 'pass',
        source: 'Graceful handling',
    },
    {
        id: 'edge_004_mixed_systems',
        description: 'BEMA + GOZ + GOÄ mix',
        codes: ['BEMA_25', 'GOZ_2060', 'GOÄ_5'],
        insuranceType: 'MKV',
        scope: 'session',
        expectedVerdict: 'pass',
        source: 'Multi-system allowed in MKV',
    },
];

/**
 * Get truthcases by expected verdict.
 */
export function getTruthcasesByVerdict(verdict: 'pass' | 'warn' | 'block'): CombinabilityTruthcase[] {
    return COMBINABILITY_TRUTHCASES.filter(tc => tc.expectedVerdict === verdict);
}

/**
 * Get all truthcase IDs.
 */
export function getAllTruthcaseIds(): string[] {
    return COMBINABILITY_TRUTHCASES.map(tc => tc.id);
}
