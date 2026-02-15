/**
 * Gate Test: Fuellung Billing Complete (GP4)
 *
 * Contract: For all Fuellung truthcases, billingCompleteness.isComplete === true.
 * Every billing code must have a traceable origin from KB (chip.billingRef or surface_mapping).
 *
 * FAIL-FAST: This gate fails if ANY output code has no origin.
 */

import { describe, it, expect } from 'vitest';
import { runV10 } from '../../pipeline/runV10';

// ═══════════════════════════════════════════════════════════════════════════════
// 40 FUELLUNG TRUTHCASES - Using forceExtraction to ensure output state
// ═══════════════════════════════════════════════════════════════════════════════

interface FuellungTruthcase {
    id: string;
    description: string;
    dictation: string;
    insuranceType: 'GKV' | 'PKV' | 'MKV';
    forceExtraction: Record<string, unknown>;  // Required to bypass askbacks
}

const FUELLUNG_TRUTHCASES: FuellungTruthcase[] = [
    // ═══════════════════════════════════════════════════════════════════════════════
    // GKV CASES (1-13) - Skip Milchzahn
    // ═══════════════════════════════════════════════════════════════════════════════
    { id: 'TC01', description: 'GKV O-Fläche ohne LA', dictation: 'Zahn 16 okklusal Kompositfüllung', insuranceType: 'GKV', forceExtraction: { tooth: '16', surfaces: ['o'] } },
    { id: 'TC02', description: 'GKV MO mit LA Infiltration', dictation: 'Zahn 26 mesio-okklusal Kompositfüllung Infiltrationsanästhesie', insuranceType: 'GKV', forceExtraction: { tooth: '26', surfaces: ['m', 'o'], anesthesia: 'infiltr' } },
    { id: 'TC03', description: 'GKV MOD mit Kofferdam', dictation: 'Zahn 36 mod Füllung Kofferdam', insuranceType: 'GKV', forceExtraction: { tooth: '36', surfaces: ['m', 'o', 'd'], kofferdamUsed: true } },
    { id: 'TC04', description: 'GKV Caries profunda mit Cp', dictation: 'Zahn 46 okklusal Caries profunda mit Cp Ca(OH)2', insuranceType: 'GKV', forceExtraction: { tooth: '46', surfaces: ['o'], cariesDepth: 'profunda', cappingPerformed: true, cappingMaterial: 'Ca(OH)₂' } },
    { id: 'TC05', description: 'GKV 4-flächig mit LA Leitung', dictation: 'Zahn 37 modl Kompositfüllung mit LA Leitung', insuranceType: 'GKV', forceExtraction: { tooth: '37', surfaces: ['m', 'o', 'd', 'l'], anesthesia: 'leitung' } },
    { id: 'TC06', description: 'GKV DO-Fläche', dictation: 'Zahn 14 do Kompositfüllung', insuranceType: 'GKV', forceExtraction: { tooth: '14', surfaces: ['d', 'o'] } },
    { id: 'TC07', description: 'GKV B-Fläche', dictation: 'Zahn 24 bukkal Füllung', insuranceType: 'GKV', forceExtraction: { tooth: '24', surfaces: ['b'] } },
    { id: 'TC08', description: 'GKV MOB mit LA und Kofferdam', dictation: 'Zahn 47 mob Füllung Infiltrationsanästhesie Kofferdam', insuranceType: 'GKV', forceExtraction: { tooth: '47', surfaces: ['m', 'o', 'b'], anesthesia: 'infiltr', kofferdamUsed: true } },
    { id: 'TC09', description: 'GKV Frontzahn labial', dictation: 'Zahn 11 labial Kompositfüllung', insuranceType: 'GKV', forceExtraction: { tooth: '11', surfaces: ['l'] } },
    { id: 'TC10', description: 'GKV UK Molar mit Leitung', dictation: 'Zahn 36 mo Leitungsanästhesie Füllung', insuranceType: 'GKV', forceExtraction: { tooth: '36', surfaces: ['m', 'o'], anesthesia: 'leitung' } },
    { id: 'TC11', description: 'GKV Cp mit MTA', dictation: 'Zahn 16 o profunda direkte Überkappung MTA', insuranceType: 'GKV', forceExtraction: { tooth: '16', surfaces: ['o'], cariesDepth: 'profunda', cappingPerformed: true, cappingMaterial: 'MTA' } },
    { id: 'TC12', description: 'GKV 5-flächig', dictation: 'Zahn 36 modbl Füllung', insuranceType: 'GKV', forceExtraction: { tooth: '36', surfaces: ['m', 'o', 'd', 'b', 'l'] } },
    { id: 'TC13', description: 'GKV mit Fluoridierung', dictation: 'Zahn 16 o Kompositfüllung Fluoridierung', insuranceType: 'GKV', forceExtraction: { tooth: '16', surfaces: ['o'] } },

    // ═══════════════════════════════════════════════════════════════════════════════
    // PKV CASES (14-23)
    // ═══════════════════════════════════════════════════════════════════════════════
    { id: 'TC14', description: 'PKV MO Komposit', dictation: 'Zahn 15 mo Kompositfüllung adhäsiv', insuranceType: 'PKV', forceExtraction: { tooth: '15', surfaces: ['m', 'o'] } },
    { id: 'TC15', description: 'PKV MOD mit LA und Kofferdam', dictation: 'Zahn 36 mod Kompositfüllung Infiltrationsanästhesie Kofferdam', insuranceType: 'PKV', forceExtraction: { tooth: '36', surfaces: ['m', 'o', 'd'], anesthesia: 'infiltr', kofferdamUsed: true } },
    { id: 'TC16', description: 'PKV Cp mit MTA', dictation: 'Zahn 16 o Caries profunda direkte Überkappung MTA', insuranceType: 'PKV', forceExtraction: { tooth: '16', surfaces: ['o'], cariesDepth: 'profunda', cappingPerformed: true, cappingMaterial: 'MTA' } },
    { id: 'TC17', description: 'PKV Mehrschicht', dictation: 'Zahn 26 mod Kompositfüllung Mehrschichttechnik adhäsiv', insuranceType: 'PKV', forceExtraction: { tooth: '26', surfaces: ['m', 'o', 'd'], adhesiveTechnique: true } },
    { id: 'TC18', description: 'PKV 4-flächig', dictation: 'Zahn 37 modl Kompositfüllung', insuranceType: 'PKV', forceExtraction: { tooth: '37', surfaces: ['m', 'o', 'd', 'l'] } },
    { id: 'TC19', description: 'PKV O-Fläche', dictation: 'Zahn 46 o Kompositfüllung', insuranceType: 'PKV', forceExtraction: { tooth: '46', surfaces: ['o'] } },
    { id: 'TC20', description: 'PKV DOL', dictation: 'Zahn 17 dol Füllung adhäsiv', insuranceType: 'PKV', forceExtraction: { tooth: '17', surfaces: ['d', 'o', 'l'] } },
    { id: 'TC21', description: 'PKV Frontzahn mesial', dictation: 'Zahn 21 mesial Kompositfüllung', insuranceType: 'PKV', forceExtraction: { tooth: '21', surfaces: ['m'] } },
    { id: 'TC22', description: 'PKV P direkte Überkappung', dictation: 'Zahn 16 o Pulpaeröffnung P Biodentine', insuranceType: 'PKV', forceExtraction: { tooth: '16', surfaces: ['o'], pulpaOpened: true, cappingMaterial: 'Biodentine' } },
    { id: 'TC23', description: 'PKV OB-Fläche', dictation: 'Zahn 14 ob Kompositfüllung', insuranceType: 'PKV', forceExtraction: { tooth: '14', surfaces: ['o', 'b'] } },

    // ═══════════════════════════════════════════════════════════════════════════════
    // MKV CASES (24-40) - Skip Milchzahn
    // ═══════════════════════════════════════════════════════════════════════════════
    { id: 'TC24', description: 'MKV nurKasse', dictation: 'Zahn 36 mod Kompositfüllung nur Kasse', insuranceType: 'MKV', forceExtraction: { tooth: '36', surfaces: ['m', 'o', 'd'], nurKasse: true } },
    { id: 'TC25', description: 'MKV mit Mehrkosten bestätigt', dictation: 'Zahn 36 mod Kompositfüllung Mehrschichttechnik', insuranceType: 'MKV', forceExtraction: { tooth: '36', surfaces: ['m', 'o', 'd'], mehrkostenConfirmed: true, adhesiveTechnique: true } },
    { id: 'TC26', description: 'MKV LA bleibt BEMA', dictation: 'Zahn 36 mod Kompositfüllung Infiltrationsanästhesie', insuranceType: 'MKV', forceExtraction: { tooth: '36', surfaces: ['m', 'o', 'd'], anesthesia: 'infiltr', mehrkostenConfirmed: true } },
    { id: 'TC27', description: 'MKV Kofferdam bleibt BEMA', dictation: 'Zahn 36 mod Kompositfüllung Kofferdam', insuranceType: 'MKV', forceExtraction: { tooth: '36', surfaces: ['m', 'o', 'd'], kofferdamUsed: true, mehrkostenConfirmed: true } },
    { id: 'TC28', description: 'MKV O-Fläche', dictation: 'Zahn 16 o Kompositfüllung', insuranceType: 'MKV', forceExtraction: { tooth: '16', surfaces: ['o'] } },
    { id: 'TC29', description: 'MKV MO-Fläche', dictation: 'Zahn 26 mo Füllung', insuranceType: 'MKV', forceExtraction: { tooth: '26', surfaces: ['m', 'o'] } },
    { id: 'TC30', description: 'MKV Cp Ca(OH)2', dictation: 'Zahn 36 o profunda Cp Ca(OH)2', insuranceType: 'MKV', forceExtraction: { tooth: '36', surfaces: ['o'], cariesDepth: 'profunda', cappingPerformed: true, cappingMaterial: 'Ca(OH)₂' } },
    { id: 'TC31', description: 'MKV 4-flächig', dictation: 'Zahn 37 modl Füllung', insuranceType: 'MKV', forceExtraction: { tooth: '37', surfaces: ['m', 'o', 'd', 'l'] } },
    { id: 'TC32', description: 'MKV mit LA Leitung', dictation: 'Zahn 46 mod Füllung Leitungsanästhesie', insuranceType: 'MKV', forceExtraction: { tooth: '46', surfaces: ['m', 'o', 'd'], anesthesia: 'leitung' } },
    { id: 'TC33', description: 'MKV Frontzahn', dictation: 'Zahn 11 mesial Füllung', insuranceType: 'MKV', forceExtraction: { tooth: '11', surfaces: ['m'] } },
    { id: 'TC34', description: 'MKV ohne Mehrkosten', dictation: 'Zahn 16 mo Füllung', insuranceType: 'MKV', forceExtraction: { tooth: '16', surfaces: ['m', 'o'], mehrkostenConfirmed: false } },
    { id: 'TC35', description: 'MKV MOB mit allem', dictation: 'Zahn 36 mob Füllung LA Kofferdam Mehrschichttechnik', insuranceType: 'MKV', forceExtraction: { tooth: '36', surfaces: ['m', 'o', 'b'], anesthesia: 'leitung', kofferdamUsed: true, mehrkostenConfirmed: true } },
    { id: 'TC36', description: 'MKV DOL', dictation: 'Zahn 47 dol Füllung', insuranceType: 'MKV', forceExtraction: { tooth: '47', surfaces: ['d', 'o', 'l'] } },
    { id: 'TC37', description: 'MKV kein Phantom-Zahn', dictation: 'Zahn 36 mod Kompositfüllung 120 Euro', insuranceType: 'MKV', forceExtraction: { tooth: '36', surfaces: ['m', 'o', 'd'] } },
    { id: 'TC38', description: 'MKV 5-flächig', dictation: 'Zahn 36 modbl Füllung', insuranceType: 'MKV', forceExtraction: { tooth: '36', surfaces: ['m', 'o', 'd', 'b', 'l'] } },
    { id: 'TC39', description: 'MKV B-Fläche', dictation: 'Zahn 24 bukkal Füllung', insuranceType: 'MKV', forceExtraction: { tooth: '24', surfaces: ['b'] } },
    { id: 'TC40', description: 'MKV D-Fläche', dictation: 'Zahn 14 distal Füllung', insuranceType: 'MKV', forceExtraction: { tooth: '14', surfaces: ['d'] } },
];

// ═══════════════════════════════════════════════════════════════════════════════
// GATE TEST: BILLING COMPLETE
// ═══════════════════════════════════════════════════════════════════════════════

describe('Gate: Fuellung Billing Complete (GP4)', () => {
    describe('Contract: billingCompleteness.isComplete === true for all truthcases', () => {
        for (const tc of FUELLUNG_TRUTHCASES) {
            it(`${tc.id}: ${tc.description}`, async () => {
                const answers = buildAnswersForTruthcase(tc);
                const result = await runV10({
                    dictation: tc.dictation,
                    treatmentId: 'fuellung',
                    insuranceType: tc.insuranceType,
                    textLength: 'mittel',
                    answers,
                    testOnly: {
                        enabled: true,
                        forceExtraction: tc.forceExtraction,
                    },
                });

                // === Gate 1: Must reach output state ===
                if (result.state !== 'output') {
                    console.error(`[${tc.id}] Wrong state:`, result.state, result.error ?? result.questions?.map(q => q.id));
                }
                expect(result.state).toBe('output');

                if (result.state === 'output') {
                    const billingCodes = result.output.billingCodes;
                    const billingCompleteness = result.meta.billingCompleteness;

                    // === Gate 2: billingCompleteness must exist ===
                    expect(billingCompleteness).toBeDefined();

                    if (billingCompleteness) {
                        // === Gate 3: isComplete must be true ===
                        if (!billingCompleteness.isComplete) {
                            console.error(`[${tc.id}] INCOMPLETE:`, billingCompleteness.missing);
                        }
                        expect(billingCompleteness.isComplete).toBe(true);

                        // === Gate 4: Every billing code has origin ===
                        const originCodes = new Set(billingCompleteness.origins.map(o => o.code));
                        for (const code of billingCodes) {
                            if (!originCodes.has(code)) {
                                console.error(`[${tc.id}] Missing origin for:`, code);
                            }
                            expect(originCodes.has(code)).toBe(true);
                        }

                        // === Gate 5: droppedCodes in origins if present ===
                        const droppedCodes = result.meta.combinability?.droppedCodes ?? [];
                        for (const dropped of droppedCodes) {
                            expect(billingCodes).not.toContain(dropped);
                            const droppedOrigin = billingCompleteness.origins.find(
                                o => o.code === dropped && o.origin === 'dropped_by_combinability'
                            );
                            expect(droppedOrigin).toBeDefined();
                        }

                        console.log(`[${tc.id}] ✓ Complete: ${billingCodes.length} codes`);
                    }
                }
            });
        }
    });

    // === Summary test ===
    it('Summary: All 40 truthcases covered', () => {
        expect(FUELLUNG_TRUTHCASES.length).toBe(40);
    });
});

function buildAnswersForTruthcase(tc: FuellungTruthcase): Map<string, string> {
    const dictLower = tc.dictation.toLowerCase();
    const force = tc.forceExtraction as Record<string, unknown>;

    const isProfunda = force.cariesDepth === 'profunda' || dictLower.includes('profunda');
    const hasKofferdam = force.kofferdamUsed === true || dictLower.includes('kofferdam');
    const hasCapping = force.cappingPerformed === true || dictLower.includes('überkapp') || /\bcp\b/.test(dictLower);
    const wantsDirect = dictLower.includes('direkt') || dictLower.includes('pulpaeröffnung') || dictLower.includes('pulpa');

    const ueberkappung =
        wantsDirect ? 'direkt' :
        hasCapping ? 'indirekt' :
        'nein';

    const ueberkappungMaterial = dictLower.includes('mta') ? 'MTA' : 'Ca(OH)₂';

    const mkvConfirmed =
        tc.insuranceType !== 'MKV' ? 'nur_kasse' :
        force.nurKasse === true || force.mehrkostenConfirmed === false || dictLower.includes('nur kasse') ? 'nur_kasse' :
        'mehrkosten';

    const mkvAmount =
        typeof force.mkvAmount === 'number' ? String(force.mkvAmount) :
        typeof force.mkvAmount === 'string' ? force.mkvAmount :
        undefined;

    const layering = dictLower.includes('mehrschicht') ? 'yes' : 'no';

    const entries: Array<[string, string]> = [
        ['medical_mkv_confirmed', mkvConfirmed],
        ['mkv_confirmed', mkvConfirmed],
        ['medical_caries_depth', isProfunda ? 'profunda' : 'normal'],
        ['medical_ueberkappung', ueberkappung],
        ['medical_ueberkappung_material', ueberkappungMaterial],
        ['fuellung_material', dictLower.includes('amalgam') ? 'Amalgam' : 'Komposit'],
        ['fuellung_isolation', hasKofferdam ? 'kofferdam' : 'keine'],
        ['fuellung_layering', layering],
        ['fuellung_adhesive', 'yes'],
        ['medical_vipr', 'positiv'],
        ['medical_perk', 'negativ'],
    ];

    if (tc.insuranceType === 'MKV') {
        entries.push(['fuellung_mkv_justification', 'Ästhetik']);
        if (mkvConfirmed === 'mehrkosten') {
            entries.push(['mkv_betrag', mkvAmount ?? '120']);
        }
    }

    return new Map(entries);
}
