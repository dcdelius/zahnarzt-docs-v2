/**
 * Füllung Pipeline Test Vector Harness
 * 
 * Runs 10 test vectors through the pipeline to diagnose
 * anesthesia and MKV billing behavior.
 * 
 * RUN: npx vitest run src/docudent/__tests__/fuellung-vector-harness.test.ts
 */

import { describe, it, expect } from 'vitest';
import { inferChipsFromDictation, processChipsToBilling, getTreatmentChips } from '../core/billing/knowledgeBase/logic/treatmentEngine';
import { resolveActiveChipIds, inferChipsFromExtractedData } from '../core/billing/knowledgeBase/logic/chipResolver';
import { generateQuestions } from '../core/questions/questionService';
import type { ExtractedData } from '../core/billing/knowledgeBase/logic/chipResolver';

// ═══════════════════════════════════════════════════════════════
// TEST VECTORS
// ═══════════════════════════════════════════════════════════════

interface TestVector {
    id: string;
    insuranceType: 'GKV' | 'PKV';
    hasMKV: boolean;
    dictation: string;
    expectAnesthesiaQuestion: boolean;
    expectAnesthesiaBilling: boolean;
    expectMKVQuestions: boolean;
    notes: string;
}

const TEST_VECTORS: TestVector[] = [
    {
        id: 'V1',
        insuranceType: 'GKV',
        hasMKV: false,
        dictation: 'Zahn 36, okkluso-distal, Kompositfüllung, Kofferdam, Adhäsiv, ausgearbeitet und poliert.',
        expectAnesthesiaQuestion: false,
        expectAnesthesiaBilling: false,
        expectMKVQuestions: false,
        notes: 'NO anesthesia mentioned → NO anesthesia billing'
    },
    {
        id: 'V2',
        insuranceType: 'GKV',
        hasMKV: false,
        dictation: 'Zahn 14, mesial, Kompositfüllung, ohne Kofferdam, ausgearbeitet.',
        expectAnesthesiaQuestion: false,
        expectAnesthesiaBilling: false,
        expectMKVQuestions: false,
        notes: 'NO anesthesia mentioned'
    },
    {
        id: 'V3',
        insuranceType: 'GKV',
        hasMKV: false,
        dictation: 'Zahn 46, MOD, tiefe Karies, indirekte Überkappung mit CaOH, Komposit.',
        expectAnesthesiaQuestion: false,
        expectAnesthesiaBilling: false,
        expectMKVQuestions: false,
        notes: 'NO anesthesia mentioned; Capping present'
    },
    {
        id: 'V4',
        insuranceType: 'GKV',
        hasMKV: false,
        dictation: 'Zahn 26, Okklusalfüllung, Lokalanästhesie.',
        expectAnesthesiaQuestion: true, // Should ask which type!
        expectAnesthesiaBilling: false, // Until confirmed
        expectMKVQuestions: false,
        notes: 'Anesthesia mentioned but type unclear → should ask!'
    },
    {
        id: 'V5',
        insuranceType: 'GKV',
        hasMKV: false,
        dictation: 'Zahn 47, MOD, Infiltration mit Articain, Komposit, Kofferdam.',
        expectAnesthesiaQuestion: false,
        expectAnesthesiaBilling: true, // Infiltration explicit
        expectMKVQuestions: false,
        notes: 'Infiltration explicit → BEMA_40 expected'
    },
    {
        id: 'V6',
        insuranceType: 'GKV',
        hasMKV: false,
        dictation: 'Zahn 37, okklusal, Leitungsanästhesie, Komposit.',
        expectAnesthesiaQuestion: false,
        expectAnesthesiaBilling: true, // Leitung explicit
        expectMKVQuestions: false,
        notes: 'Leitung explicit → BEMA_41a expected'
    },
    {
        id: 'V7',
        insuranceType: 'GKV',
        hasMKV: true,
        dictation: 'Zahn 36, MOD, Kompositfüllung, Mehrschichttechnik, Kofferdam, ausgearbeitet.',
        expectAnesthesiaQuestion: false,
        expectAnesthesiaBilling: false,
        expectMKVQuestions: true,
        notes: 'MKV + Mehrschichttechnik → MKV questions; NO anesthesia'
    },
    {
        id: 'V8',
        insuranceType: 'GKV',
        hasMKV: true,
        dictation: 'Zahn 11, mesial-inzisal, Komposit, ästhetisch, Mehrkosten vereinbart 120 Euro.',
        expectAnesthesiaQuestion: false,
        expectAnesthesiaBilling: false,
        expectMKVQuestions: true,
        notes: 'MKV with amount; NO anesthesia'
    },
    {
        id: 'V9',
        insuranceType: 'GKV',
        hasMKV: true,
        dictation: 'Zahn 24, distal, Komposit, Adhäsivtechnik.',
        expectAnesthesiaQuestion: false,
        expectAnesthesiaBilling: false,
        expectMKVQuestions: true,
        notes: 'MKV + Adhäsiv mentioned'
    },
    {
        id: 'V10',
        insuranceType: 'PKV',
        hasMKV: false,
        dictation: 'Zahn 36, MOD, Komposit, Kofferdam, Adhäsiv, poliert.',
        expectAnesthesiaQuestion: false,
        expectAnesthesiaBilling: false,
        expectMKVQuestions: false,
        notes: 'PKV - no MKV questions; NO anesthesia'
    }
];

// ═══════════════════════════════════════════════════════════════
// HELPER: Parse tooth from dictation
// ═══════════════════════════════════════════════════════════════

function extractTooth(dictation: string): string | undefined {
    const match = dictation.match(/[Zz]ahn\s*(\d+)/);
    return match ? match[1] : undefined;
}

function extractSurfaces(dictation: string): string[] {
    const lower = dictation.toLowerCase();
    const surfaces: string[] = [];
    if (lower.includes('okklusal') || lower.includes('okkl')) surfaces.push('o');
    if (lower.includes('mesial') || lower.includes('mes')) surfaces.push('m');
    if (lower.includes('distal') || lower.includes('dis')) surfaces.push('d');
    if (lower.includes('bukkal') || lower.includes('buk')) surfaces.push('b');
    if (lower.includes('lingual') || lower.includes('ling')) surfaces.push('l');
    if (lower.includes('mod') && surfaces.length === 0) surfaces.push('m', 'o', 'd');
    if (lower.includes('okkluso-distal')) {
        surfaces.length = 0;
        surfaces.push('o', 'd');
    }
    if (lower.includes('mesial-inzisal')) {
        surfaces.length = 0;
        surfaces.push('m', 'i');
    }
    return surfaces.length > 0 ? surfaces : ['o']; // Default to occlusal
}

// ═══════════════════════════════════════════════════════════════
// RUN VECTOR
// ═══════════════════════════════════════════════════════════════

interface VectorResult {
    vectorId: string;
    input: { insuranceType: string; hasMKV: boolean; dictation: string };
    inferredChipsFromDictation: string[];
    resolvedActiveChips: string[];
    questions: { id: string; category: string; question?: string }[];
    billingCodes: string[];
    billingDetails: { code: string; bezeichnung: string }[];
    anesthesiaChipsFound: string[];
    anomalies: string[];
    notes: string[];
}

function runVector(vector: TestVector): VectorResult {
    const tooth = extractTooth(vector.dictation);
    const surfaces = extractSurfaces(vector.dictation);

    // Step 1: Infer chips from dictation text
    const inferredChips = inferChipsFromDictation(vector.dictation, 'fuellung', { tooth });

    // Step 2: Build mock extraction
    const extracted: ExtractedData = {
        tooth,
        surfaces,
        diagnosis: 'caries',
        mentioned: {}
    };

    // Step 3: Get resolved active chips (includes defaults from answer map)
    const resolvedChips = resolveActiveChipIds(
        'fuellung',
        extracted,
        new Map(), // No answers yet
        { hasMKV: vector.hasMKV, insuranceType: vector.insuranceType }
    );

    // Merge inferred chips into resolved (simulating pipeline)
    const allActiveChips = [...new Set([...resolvedChips, ...inferredChips])];

    // Step 4: Generate questions
    const questions = generateQuestions(
        { ...extracted } as any,
        vector.insuranceType,
        vector.hasMKV,
        'fuellung',
        new Map(),
        vector.dictation
    );

    // Step 5: Process chips to billing
    const billingResult = processChipsToBilling(
        'fuellung',
        allActiveChips,
        vector.insuranceType,
        vector.hasMKV,
        extracted as any,
        'mittel'
    );

    // Analyze results
    const anesthesiaChips = allActiveChips.filter(c =>
        c.includes('la_') || c.includes('leitung') || c.includes('infiltr') || c.includes('ohne_la')
    );

    const anesthesiaBillingCodes = billingResult.billingCodes.filter(c =>
        c.includes('BEMA_40') || c.includes('BEMA_41') || c.includes('GOZ_0090') || c.includes('GOZ_0100')
    );

    const mkvQuestions = questions.filter(q => q.category === 'mkv');

    // Detect anomalies
    const anomalies: string[] = [];

    if (anesthesiaBillingCodes.length > 0 && !vector.expectAnesthesiaBilling) {
        anomalies.push(`P0: Anesthesia billing ${anesthesiaBillingCodes.join(', ')} appeared WITHOUT explicit dictation evidence`);
    }

    if (anesthesiaBillingCodes.length === 0 && vector.expectAnesthesiaBilling) {
        anomalies.push(`Expected anesthesia billing but none appeared`);
    }

    if (vector.expectAnesthesiaQuestion && !questions.some(q => q.id?.includes('anesthesia') || q.id?.includes('la_'))) {
        anomalies.push(`Expected anesthesia type question but none appeared`);
    }

    if (vector.expectMKVQuestions && mkvQuestions.length === 0) {
        anomalies.push(`Expected MKV questions but none appeared`);
    }

    return {
        vectorId: vector.id,
        input: {
            insuranceType: vector.insuranceType,
            hasMKV: vector.hasMKV,
            dictation: vector.dictation
        },
        inferredChipsFromDictation: inferredChips,
        resolvedActiveChips: resolvedChips,
        questions: questions.map(q => ({ id: q.id, category: q.category, question: q.question?.substring(0, 50) })),
        billingCodes: billingResult.billingCodes,
        billingDetails: billingResult.billingDetails.map(d => ({ code: d.code, bezeichnung: d.bezeichnung })),
        anesthesiaChipsFound: anesthesiaChips,
        anomalies,
        notes: [vector.notes]
    };
}

// ═══════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════

describe('Füllung Pipeline Test Vectors', () => {
    const results: VectorResult[] = [];

    for (const vector of TEST_VECTORS) {
        it(`${vector.id}: ${vector.notes}`, () => {
            const result = runVector(vector);
            results.push(result);

            // Log for debugging
            console.log(`\n=== ${result.vectorId} ===`);
            console.log('Inferred chips:', result.inferredChipsFromDictation);
            console.log('Resolved chips:', result.resolvedActiveChips);
            console.log('Billing codes:', result.billingCodes);
            console.log('Questions:', result.questions.map(q => q.id));
            console.log('Anesthesia chips:', result.anesthesiaChipsFound);
            if (result.anomalies.length > 0) {
                console.log('🚨 ANOMALIES:', result.anomalies);
            }

            // Critical: V1, V2, V3 must NOT have anesthesia billing
            if (['V1', 'V2', 'V3'].includes(vector.id)) {
                const hasAnesthesiaBilling = result.billingCodes.some(c =>
                    c.includes('BEMA_40') || c.includes('BEMA_41') || c.includes('GOZ_0090') || c.includes('GOZ_0100')
                );
                expect(hasAnesthesiaBilling).toBe(false);
            }

            // V5, V6 SHOULD have anesthesia billing
            if (['V5', 'V6'].includes(vector.id)) {
                const hasAnesthesiaBilling = result.billingCodes.some(c =>
                    c.includes('BEMA_40') || c.includes('BEMA_41') || c.includes('GOZ_0090') || c.includes('GOZ_0100')
                );
                expect(hasAnesthesiaBilling).toBe(true);
            }

            // MKV vectors should have MKV questions
            if (vector.hasMKV) {
                const mkvQuestions = result.questions.filter(q => q.category === 'mkv');
                expect(mkvQuestions.length).toBeGreaterThan(0);
            }
        });
    }

    it('SUMMARY: No P0 anomalies in V1-V3', () => {
        const v1v2v3 = results.filter(r => ['V1', 'V2', 'V3'].includes(r.vectorId));
        const allAnomalies = v1v2v3.flatMap(r => r.anomalies);
        const p0Anomalies = allAnomalies.filter(a => a.includes('P0'));

        console.log('\n\n=== FINAL SUMMARY ===');
        console.log('Results:', JSON.stringify(results, null, 2));

        expect(p0Anomalies).toHaveLength(0);
    });
});
