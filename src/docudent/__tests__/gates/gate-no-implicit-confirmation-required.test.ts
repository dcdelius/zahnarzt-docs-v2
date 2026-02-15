/**
 * GATE: No Implicit Confirmation Required
 * 
 * PURPOSE:
 * Ensure that settings_default facts do NOT require explicit user interaction
 * to flow into documentation, but ARE properly upgraded to user_finalized
 * after finalization for billing eligibility.
 * 
 * RULES:
 * 1. settings_default facts are created automatically from practice standards
 * 2. settings_default facts are reversible before finalization
 * 3. settings_default facts become billing-eligible ONLY after finalization
 * 4. Finalization upgrades settings_default → user_finalized
 * 5. NO extra clicks required for standard documentation
 */

import { describe, it, expect } from 'vitest';
import {
    type Fact,
    type FactStore,
    isBillingEligible,
    upgradeFactForFinalization,
    finalizeFactStore,
    factFromSettingsDefault,
    factFromSettingsPolicy,
    factFromDictation,
    IMMEDIATE_BILLING_SOURCES,
    FINALIZATION_BILLABLE_SOURCES,
} from '../../contracts/facts';
import {
    PRACTICE_GLOBAL_STANDARDS,
    FUELLUNG_STANDARDS,
    createDefaultFacts,
    createFactsFromGlobalStandards,
    createFactsFromTreatmentStandards,
} from '../../contracts/practiceStandards';

describe('GATE: No Implicit Confirmation Required', () => {

    describe('Settings Default Facts', () => {

        it('settings_default facts are created automatically (no user action)', () => {
            // Practice standards should create facts automatically
            const globalFacts = createFactsFromGlobalStandards();

            expect(globalFacts.length).toBeGreaterThan(0);
            expect(globalFacts.every(f => f.source === 'settings_default')).toBe(true);

            // Should include standard documentation items
            const factKeys = globalFacts.map(f => f.key);
            expect(factKeys).toContain('aufklaerung');
            expect(factKeys).toContain('bisskontrolle');
        });

        it('treatment standards are created automatically for fuellung', () => {
            const facts = createFactsFromTreatmentStandards('fuellung');

            expect(facts.length).toBeGreaterThan(0);

            const factKeys = facts.map(f => f.key);
            expect(factKeys).toContain('isolation');
            expect(factKeys).toContain('finishing');
        });

        it('MKV standards use settings_policy (not settings_default)', () => {
            const facts = createFactsFromTreatmentStandards('fuellung', true); // hasMKV=true

            const mkvFact = facts.find(f => f.key === 'mkv_technique');
            expect(mkvFact).toBeDefined();
            expect(mkvFact?.source).toBe('settings_policy');
        });

        it('createDefaultFacts combines global + treatment standards', () => {
            const allFacts = createDefaultFacts('fuellung', false);

            // Should have both global and treatment facts
            const factKeys = allFacts.map(f => f.key);
            expect(factKeys).toContain('aufklaerung'); // Global
            expect(factKeys).toContain('isolation');    // Treatment
        });
    });

    describe('Billing Eligibility Before Finalization', () => {

        it('settings_default is NOT immediately billing-eligible', () => {
            const fact = factFromSettingsDefault('isolation', 'kofferdam', 'Standard', 'kofferdam');

            // Before finalization, settings_default is NOT billable
            expect(isBillingEligible(fact, false)).toBe(false);
        });

        it('dictation is immediately billing-eligible', () => {
            const fact = factFromDictation('isolation', 'kofferdam', 'Patient dictated', 'kofferdam');

            expect(isBillingEligible(fact, false)).toBe(true);
        });

        it('settings_policy is immediately billing-eligible', () => {
            const fact = factFromSettingsPolicy('mkv_technique', 'mehrschicht', 'MKV policy', 'mehrschicht');

            expect(isBillingEligible(fact, false)).toBe(true);
        });
    });

    describe('Finalization Upgrades Settings Default', () => {

        it('upgradeFactForFinalization changes settings_default → user_finalized', () => {
            const original = factFromSettingsDefault('isolation', 'kofferdam', 'Standard');

            const upgraded = upgradeFactForFinalization(original);

            expect(upgraded.source).toBe('user_finalized');
            expect(upgraded.key).toBe(original.key);
            expect(upgraded.value).toBe(original.value);
        });

        it('upgradeFactForFinalization does NOT change other sources', () => {
            const dictation = factFromDictation('isolation', 'kofferdam', 'Dictated');
            const policy = factFromSettingsPolicy('mkv', 'yes', 'Policy');

            expect(upgradeFactForFinalization(dictation).source).toBe('dictation');
            expect(upgradeFactForFinalization(policy).source).toBe('settings_policy');
        });

        it('settings_default becomes billing-eligible AFTER finalization', () => {
            const fact = factFromSettingsDefault('isolation', 'kofferdam', 'Standard', 'kofferdam');

            // Before: NOT billable
            expect(isBillingEligible(fact, false)).toBe(false);

            // After finalization: billable
            expect(isBillingEligible(fact, true)).toBe(true);
        });

        it('finalizeFactStore upgrades all settings_default facts', () => {
            const facts = new Map<string, Fact>([
                ['isolation', factFromSettingsDefault('isolation', 'kofferdam', 'Standard')],
                ['aufklaerung', factFromSettingsDefault('aufklaerung', true, 'Standard')],
                ['anesthesia', factFromDictation('anesthesia', 'infiltr', 'Dictated')],
            ]);

            const store: FactStore = {
                facts,
                treatmentId: 'fuellung',
                insuranceType: 'GKV',
                hasMKV: false,
                finalized: false,
            };

            const finalized = finalizeFactStore(store);

            expect(finalized.finalized).toBe(true);
            expect(finalized.facts.get('isolation')?.source).toBe('user_finalized');
            expect(finalized.facts.get('aufklaerung')?.source).toBe('user_finalized');
            expect(finalized.facts.get('anesthesia')?.source).toBe('dictation'); // Unchanged
        });
    });

    describe('No Extra Clicks Required', () => {

        it('PRACTICE_GLOBAL_STANDARDS are all reversible', () => {
            const allReversible = PRACTICE_GLOBAL_STANDARDS.every(s => s.reversible === true);
            expect(allReversible).toBe(true);
        });

        it('FUELLUNG_STANDARDS have correct reversible flags', () => {
            // Isolation (kofferdam) should be reversible
            const isolation = FUELLUNG_STANDARDS.find(s => s.factKey === 'isolation');
            expect(isolation?.reversible).toBe(true);

            // Exkavation is NOT reversible (always done)
            const exkavation = FUELLUNG_STANDARDS.find(s => s.factKey === 'exkavation');
            expect(exkavation?.reversible).toBe(false);
        });

        it('all standards have billingIntent defined', () => {
            const allDefined = [...PRACTICE_GLOBAL_STANDARDS, ...FUELLUNG_STANDARDS]
                .every(s => ['none', 'documentation_only', 'billable'].includes(s.billingIntent));
            expect(allDefined).toBe(true);
        });
    });

    describe('Source Priority', () => {

        it('IMMEDIATE_BILLING_SOURCES includes correct sources', () => {
            expect(IMMEDIATE_BILLING_SOURCES).toContain('dictation');
            expect(IMMEDIATE_BILLING_SOURCES).toContain('user');
            expect(IMMEDIATE_BILLING_SOURCES).toContain('settings_policy');
            expect(IMMEDIATE_BILLING_SOURCES).toContain('user_finalized');

            expect(IMMEDIATE_BILLING_SOURCES).not.toContain('settings_default');
            expect(IMMEDIATE_BILLING_SOURCES).not.toContain('inferred');
            expect(IMMEDIATE_BILLING_SOURCES).not.toContain('default');
        });

        it('FINALIZATION_BILLABLE_SOURCES includes only settings_default', () => {
            expect(FINALIZATION_BILLABLE_SOURCES).toContain('settings_default');
            expect(FINALIZATION_BILLABLE_SOURCES).toHaveLength(1);
        });
    });
});
