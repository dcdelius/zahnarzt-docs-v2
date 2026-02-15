/**
 * Wiring Fixture Types
 * 
 * Schema for test fixtures that prove treatment → questions → output wiring
 */

export interface WiringFixture {
    /** Unique fixture identifier */
    id: string;

    /** Human-readable description */
    description: string;

    /** Pipeline input */
    input: {
        treatmentId: 'fuellung' | 'endo' | string;
        insuranceType: 'GKV' | 'PKV';
        hasMKV: boolean;
        dictation: string;
        answers: Record<string, unknown>;
    };

    /** Expected outcomes */
    expect: {
        /** Trace strings that MUST appear (stage:detail substring match) */
        traceIncludes: string[];

        /** Trace strings that MUST NOT appear */
        traceExcludes: string[];

        /** Regex pattern that NO question ID should match */
        noQuestionIdRegex?: string;

        /** Question IDs that MUST be present in initial questions */
        mustQuestionIds?: string[];

        /** After answering these question IDs, canProceed should be true */
        canProceedAfterAnswering?: string[];

        /** Billing codes that MUST NOT appear in output */
        billingMustNotContain?: string[];

        /** Billing codes that MUST appear in output */
        billingMustContain?: string[];

        /** Substrings that MUST appear in output text */
        outputMustContain?: string[];

        /** Substrings that MUST NOT appear in output text */
        outputMustNotContain?: string[];
    };

    /** Minimal valid answers for each question ID to proceed */
    minimalAnswers?: Record<string, unknown>;
}

/**
 * Load all fixtures from directory
 */
export function loadFixtures(): WiringFixture[] {
    // Static imports for test environment
    return [
        // Füllung fixtures
        require('./fuellung_01_standard.json'),
        require('./fuellung_02_infiltration.json'),
        require('./fuellung_03_conduction.json'),
        require('./fuellung_04_mkv_toggle.json'),
        require('./fuellung_05_deviation_kofferdam.json'),
        require('./fuellung_06_patient_info.json'),
        // Endo fixtures
        require('./endo_01_missing_wl_method.json'),
        require('./endo_02_missing_iso_sizes.json'),
        require('./endo_03_persistent_fistula.json'),
        require('./endo_04_canal_not_negotiable.json'),
        require('./endo_05_obturation_postponed.json'),
        require('./endo_06_patient_info.json'),
    ];
}
