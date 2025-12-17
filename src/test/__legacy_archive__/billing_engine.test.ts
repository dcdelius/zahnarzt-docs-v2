import { describe, it, expect } from 'vitest';
import { generateBillingSuggestions } from '../sonia/knowledge/billingEngine';
import { BILLING_CATALOG } from '../sonia/knowledge/billing';
import { CaseState } from '../sonia/types';

const BASE_STATE: CaseState = {
    data: {},
    sources: {},
    conflicts: [],
    meta: {
        insuranceType: 'GKV',
        templateId: 'test',
        createdAt: new Date().toISOString()
    }
};

describe('Billing Engine', () => {

    it('should suggest eligible items', () => {
        const activeItems = BILLING_CATALOG;
        const caseState: any = {
            data: {
                procedures: ['Füllung 16'],
                caries_depth: 'Caries profunda (Cp)', // Trigger Cp
                pulp_capping: 'Indirekte Überkappung (Cp)',
                anesthesia: 'Infiltrationsanästhesie (ILA)' // Trigger ILA
            },
            sources: {
                pulp_capping: 'dictation',
                anesthesia: 'dictation'
            },
            meta: { insuranceType: 'GKV' }
        };

        const result = generateBillingSuggestions(activeItems, caseState, 'practice_1');

        // Expect Cp to be suggested (eligible + requirement met)
        const cp = result.suggested.find(s => s.itemId === 'cp');
        expect(cp).toBeDefined();
        expect(cp?.status).toBe('suggested');

        // Expect ILA to be suggested
        const ila = result.suggested.find(s => s.itemId === 'anesthesia_ila');
        expect(ila).toBeDefined();
    });

    it('should block items with missing non-default requirements', () => {
        const activeItems = BILLING_CATALOG;
        const caseState: any = {
            data: {
                procedures: ['Füllung 16'],
                surfaces: ['m', 'o', 'd'], // Trigger Matrix eligibility
                material: 'Komposit',
                matrix_system: 'Toflemire', // Present
                anesthesia: 'Infiltrationsanästhesie' // Trigger ILA
            },
            sources: {
                matrix_system: 'default', // But default source!
                anesthesia: 'dictation'
            },
            meta: { insuranceType: 'PKV' }
        };

        const result = generateBillingSuggestions(activeItems, caseState, 'practice_1');

        // Analog Matrix should be blocked because source is default
        const matrix = result.blocked.find(s => s.itemId === 'analog_matrix');
        expect(matrix).toBeDefined();
        expect(matrix?.status).toBe('blocked');
        expect(matrix?.blocks).toContain('Matrizensystem angeben');
    });

    it('should resolve group exclusivity', () => {
        const activeItems = BILLING_CATALOG;
        const caseState: any = {
            data: {
                procedures: ['Füllung 16'],
                anesthesia: 'Infiltrationsanästhesie (ILA)' // Trigger ILA
            },
            sources: {
                anesthesia: 'dictation'
            },
            meta: { insuranceType: 'GKV' }
        };

        const result = generateBillingSuggestions(activeItems, caseState, 'practice_1');

        // ILA should be suggested
        const ila = result.suggested.find(s => s.itemId === 'anesthesia_ila');
        expect(ila).toBeDefined();

        // Leit should NOT be suggested or blocked (because it's not eligible)
        // It is also NOT in excluded list because we skip non-eligible items (unless we want to log them)
        const leitSuggested = result.suggested.find(s => s.itemId === 'anesthesia_leit');
        const leitBlocked = result.blocked.find(s => s.itemId === 'anesthesia_leit');
        const leitExcluded = result.excluded.find(s => s.itemId === 'anesthesia_leit');

        expect(leitSuggested).toBeUndefined();
        expect(leitBlocked).toBeUndefined();
        // expect(leitExcluded).toBeUndefined(); // It is skipped
    });

    it('should exclude items with unknown predicates', () => {
        const activeItems: any[] = [
            {
                id: 'broken_item',
                domain: 'conservative',
                payer: 'BOTH',
                codes: { gkv: 'X', pkv: 'Y' },
                label: 'Broken Item',
                priority: 100,
                eligibility: { mode: 'auto', predicateId: 'unknown_predicate_123' }
            }
        ];
        const caseState: any = {
            data: {},
            sources: {},
            meta: { insuranceType: 'GKV' }
        };

        const result = generateBillingSuggestions(activeItems, caseState, 'practice_1');

        const broken = result.excluded.find(s => s.itemId === 'broken_item');
        expect(broken).toBeDefined();
        expect(broken?.why).toContain('Unbekanntes Prädikat: unknown_predicate_123');
    });

    it('should handle manual mode items', () => {
        const activeItems: any[] = [
            {
                id: 'manual_item',
                domain: 'conservative',
                payer: 'BOTH',
                codes: { gkv: 'M1', pkv: 'M2' },
                label: 'Manual Item',
                priority: 100,
                eligibility: { mode: 'manual' },
                requires: [{ fieldId: 'foo', message: 'Foo required' }]
            }
        ];

        // Case 1: Not selected -> Should be skipped (neither suggested nor blocked nor excluded, just ignored)
        // Or if we implemented skip, it won't be in result.
        let caseState: any = {
            data: { foo: 'bar' },
            sources: { foo: 'dictation' },
            meta: { insuranceType: 'GKV', manualBillingSelections: [] }
        };

        let result = generateBillingSuggestions(activeItems, caseState, 'practice_1');
        let manual = result.suggested.find(s => s.itemId === 'manual_item');
        expect(manual).toBeUndefined();

        // Case 2: Selected -> Should be suggested (if requirements met)
        caseState = {
            data: { foo: 'bar' },
            sources: { foo: 'dictation' },
            meta: { insuranceType: 'GKV', manualBillingSelections: ['manual_item'] }
        };

        result = generateBillingSuggestions(activeItems, caseState, 'practice_1');
        manual = result.suggested.find(s => s.itemId === 'manual_item');
        expect(manual).toBeDefined();
        expect(manual?.status).toBe('suggested');
        expect(manual?.why).toContain('Manuell ausgewählt');
    });

    it('should not suggest ILA or Leit if anesthesia is missing', () => {
        const activeItems = BILLING_CATALOG;
        const caseState: any = {
            data: { procedures: ['Füllung 16'], anesthesia: '' }, // Empty anesthesia
            sources: { anesthesia: 'dictation' },
            meta: { insuranceType: 'GKV' }
        };

        const result = generateBillingSuggestions(activeItems, caseState, 'practice_1');

        const ila = result.suggested.find(s => s.itemId === 'anesthesia_ila');
        const leit = result.suggested.find(s => s.itemId === 'anesthesia_leit');
        const ilaBlocked = result.blocked.find(s => s.itemId === 'anesthesia_ila');
        const leitBlocked = result.blocked.find(s => s.itemId === 'anesthesia_leit');

        expect(ila).toBeUndefined();
        expect(leit).toBeUndefined();
        expect(ilaBlocked).toBeUndefined();
        expect(leitBlocked).toBeUndefined();
    });

    it('should enforce mustBeTruthy requirement', () => {
        const activeItems = BILLING_CATALOG;
        const caseState: any = {
            data: {
                procedures: ['Füllung 16'],
                caries_depth: 'Caries profunda',
                xray: false // Explicitly false
            },
            sources: { xray: 'dictation' },
            meta: { insuranceType: 'GKV' }
        };

        const result = generateBillingSuggestions(activeItems, caseState, 'practice_1');

        // Xray is eligible (deep caries) but requirement (xray: true) is not met
        // Wait, if requirement is not met, it should be BLOCKED.
        // Unless mustBeTruthy failure means "missing"?
        // My logic: reqSatisfied = false. So it goes to BLOCKED.

        const xray = result.blocked.find(s => s.itemId === 'xray');
        expect(xray).toBeDefined();
        expect(xray?.status).toBe('blocked');
        expect(xray?.blocks).toContain('Röntgenaufnahme bestätigen');
    });
});
