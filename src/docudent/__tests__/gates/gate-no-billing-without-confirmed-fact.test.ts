/**
 * GATE: No Billing Without Confirmed Fact
 * 
 * PURPOSE:
 * Ensure anesthesia and other confirmation-required billing codes
 * do NOT appear in output unless backed by a confirmed Fact.
 * 
 * RULE:
 * Any emitted billing code corresponding to a confirmation-required chip must have:
 * - source ∈ { 'dictation', 'user', 'settings_policy' }
 * 
 * CHIPS REQUIRING CONFIRMATION:
 * - la_infiltr → BEMA_40, GOZ_0090
 * - la_leitung → BEMA_41a, GOZ_0100
 * 
 * TEST VECTORS:
 * V1: Dictation without anesthesia → NO anesthesia billing
 * V2: Dictation with "Lokalanästhesie" (generic) + no user answer → NO anesthesia billing
 * V3: Dictation with "Infiltration" (explicit) → anesthesia billing OK
 * V4: User answered anesthesia_type → anesthesia billing OK
 */

import { describe, it, expect } from 'vitest';
import {
    CHIPS_REQUIRING_BILLING_CONFIRMATION,
    ALWAYS_BILLING_ELIGIBLE_CHIPS,
    MKV_POLICY_CHIPS,
    buildChipsWithProvenance,
    filterBillingEligibleChips,
    getBillingEligibleChipIds,
    type ChipWithProvenance,
} from '../../core/billing/knowledgeBase/logic/billingEligibilityGuard';
import {
    type Fact,
    factFromDictation,
    factFromUser,
    factInferred,
    ANESTHESIA_FACTS,
} from '../../contracts/facts';

// ═══════════════════════════════════════════════════════════════
// TEST: Anesthesia billing requires confirmed Fact
// ═══════════════════════════════════════════════════════════════

describe('GATE: No Billing Without Confirmed Fact', () => {

    describe('Anesthesia chips require confirmation', () => {

        it('BLOCKS la_infiltr when only inferred (no confirmed Fact)', () => {
            const chips: ChipWithProvenance[] = [
                { chipId: 'la_infiltr', source: 'inferred', evidence: 'tooth position heuristic' },
                { chipId: 'exkavation', source: 'default' },
            ];

            const confirmedFacts = new Map<string, Fact>();
            // No anesthesia_type Fact → should block la_infiltr

            const eligible = getBillingEligibleChipIds(chips, false, confirmedFacts);

            expect(eligible).toContain('exkavation'); // Always eligible
            expect(eligible).not.toContain('la_infiltr'); // Blocked
        });

        it('BLOCKS la_leitung when only inferred', () => {
            const chips: ChipWithProvenance[] = [
                { chipId: 'la_leitung', source: 'inferred' },
            ];

            const eligible = getBillingEligibleChipIds(chips, false, new Map());

            expect(eligible).not.toContain('la_leitung');
        });

        it('ALLOWS la_infiltr when Fact source is dictation', () => {
            const chips: ChipWithProvenance[] = [
                { chipId: 'la_infiltr', source: 'dictation', evidence: 'Infiltration mit Articain' },
            ];

            // Confirmed Fact from dictation
            const confirmedFacts = new Map<string, Fact>([
                [ANESTHESIA_FACTS.KEY, factFromDictation(
                    ANESTHESIA_FACTS.KEY,
                    ANESTHESIA_FACTS.VALUES.INFILTRATION,
                    'Infiltration mit Articain',
                    'la_infiltr'
                )]
            ]);

            const eligible = getBillingEligibleChipIds(chips, false, confirmedFacts);

            expect(eligible).toContain('la_infiltr');
        });

        it('ALLOWS la_leitung when user answered anesthesia_type', () => {
            const chips: ChipWithProvenance[] = [
                { chipId: 'la_leitung', source: 'user' },
            ];

            // Confirmed Fact from user answer
            const confirmedFacts = new Map<string, Fact>([
                [ANESTHESIA_FACTS.KEY, factFromUser(
                    ANESTHESIA_FACTS.KEY,
                    ANESTHESIA_FACTS.VALUES.CONDUCTION,
                    'la_leitung'
                )]
            ]);

            const eligible = getBillingEligibleChipIds(chips, false, confirmedFacts);

            expect(eligible).toContain('la_leitung');
        });
    });

    describe('Always-eligible chips pass through', () => {

        it('exkavation, komposit_basic, finishing are always eligible', () => {
            const chips: ChipWithProvenance[] = [
                { chipId: 'exkavation', source: 'default' },
                { chipId: 'komposit_basic', source: 'default' },
                { chipId: 'finishing', source: 'default' },
            ];

            const eligible = getBillingEligibleChipIds(chips, false, new Map());

            expect(eligible).toContain('exkavation');
            expect(eligible).toContain('komposit_basic');
            expect(eligible).toContain('finishing');
        });

        it('kofferdam is always eligible when active', () => {
            const chips: ChipWithProvenance[] = [
                { chipId: 'kofferdam', source: 'dictation' },
            ];

            const eligible = getBillingEligibleChipIds(chips, false, new Map());

            expect(eligible).toContain('kofferdam');
        });
    });

    describe('MKV policy chips', () => {

        it('mehrschicht is eligible when hasMKV=true', () => {
            const chips: ChipWithProvenance[] = [
                { chipId: 'mehrschicht', source: 'settings_policy' },
            ];

            const eligible = getBillingEligibleChipIds(chips, true, new Map());

            expect(eligible).toContain('mehrschicht');
        });

        it('mehrschicht is NOT eligible when hasMKV=false', () => {
            const chips: ChipWithProvenance[] = [
                { chipId: 'mehrschicht', source: 'settings_policy' },
            ];

            const eligible = getBillingEligibleChipIds(chips, false, new Map());

            expect(eligible).not.toContain('mehrschicht');
        });
    });

    describe('V4 scenario: Generic anesthesia inference', () => {

        it('BLOCKS billing when only generic "Lokalanästhesie" inferred without type', () => {
            // Simulates V4: "Zahn 26, Okklusalfüllung, Lokalanästhesie."
            // inferChipsFromDictation infers la_infiltr based on tooth position
            // But no explicit type was stated

            const chips: ChipWithProvenance[] = [
                { chipId: 'la_infiltr', source: 'inferred', evidence: 'tooth 26 (OK) → default infiltr' },
                { chipId: 'exkavation', source: 'default' },
                { chipId: 'komposit_basic', source: 'default' },
            ];

            // anesthesia_type Fact exists but is INFERRED, not confirmed
            const confirmedFacts = new Map<string, Fact>([
                [ANESTHESIA_FACTS.KEY, factInferred(
                    ANESTHESIA_FACTS.KEY,
                    ANESTHESIA_FACTS.VALUES.INFILTRATION,
                    'tooth 26 (OK) → default infiltr',
                    'la_infiltr'
                )]
            ]);

            const eligible = getBillingEligibleChipIds(chips, false, confirmedFacts);

            // Anesthesia should be BLOCKED
            expect(eligible).not.toContain('la_infiltr');

            // Other chips still eligible
            expect(eligible).toContain('exkavation');
            expect(eligible).toContain('komposit_basic');
        });

        it('ALLOWS billing when user confirms anesthesia_type after inference', () => {
            const chips: ChipWithProvenance[] = [
                { chipId: 'la_infiltr', source: 'user' }, // User confirmed
                { chipId: 'exkavation', source: 'default' },
            ];

            const confirmedFacts = new Map<string, Fact>([
                [ANESTHESIA_FACTS.KEY, factFromUser(
                    ANESTHESIA_FACTS.KEY,
                    ANESTHESIA_FACTS.VALUES.INFILTRATION,
                    'la_infiltr'
                )]
            ]);

            const eligible = getBillingEligibleChipIds(chips, false, confirmedFacts);

            expect(eligible).toContain('la_infiltr');
            expect(eligible).toContain('exkavation');
        });
    });

    describe('buildChipsWithProvenance', () => {

        it('assigns correct source priorities', () => {
            const chips = buildChipsWithProvenance(
                ['exkavation', 'komposit_basic'],  // alwaysOn → default
                ['la_infiltr'],                     // extracted → dictation
                ['vitality_pos'],                   // answered → user
                ['mehrschicht'],                    // mkvPolicy → settings_policy
                'Infiltration durchgeführt'
            );

            const find = (id: string) => chips.find(c => c.chipId === id);

            expect(find('exkavation')?.source).toBe('default');
            expect(find('la_infiltr')?.source).toBe('dictation');
            expect(find('vitality_pos')?.source).toBe('user');
            expect(find('mehrschicht')?.source).toBe('settings_policy');
        });

        it('user answers override dictation for same chip', () => {
            const chips = buildChipsWithProvenance(
                [],
                ['la_infiltr'],  // From dictation
                ['la_infiltr'],  // Also answered by user
                [],
                ''
            );

            const laChip = chips.find(c => c.chipId === 'la_infiltr');
            expect(laChip?.source).toBe('user'); // User wins
        });
    });
});
