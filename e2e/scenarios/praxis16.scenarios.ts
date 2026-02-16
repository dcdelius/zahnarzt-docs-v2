/**
 * V10 Praxis-16 Scenario Definitions — SSOT
 * 
 * 16 real-world Praxis dictation scenarios for E2E verification.
 * 
 * CONTRACTS:
 * - askbackIds must match ASKBACK_IDS from askbackIds.ts
 * - No hardcoded billing codes in assertions (prefix/count verification only)
 * - channelization: BEMA_ONLY | GOZ_ONLY | BOTH
 */

export type InsuranceType = 'GKV' | 'PKV' | 'MKV';
export type Phase = 'output' | 'questions' | 'either';
export type Channelization = 'BEMA_ONLY' | 'GOZ_ONLY' | 'BOTH';
export type Combinability = 'ok' | 'warn' | 'block' | 'unknown';

export interface Praxis16Scenario {
    id: string;
    title: string;
    insuranceType: InsuranceType;
    dictation: string;
    expected: {
        phase: Phase;
        instances: number;
        channelization: Channelization;
        addon: boolean;
        askbacks: string[];  // Canonical askback IDs from askbackIds.ts
        askbackMode?: 'strict' | 'diagnostic';
        multiplicity: boolean;  // If true, assert billing count matches instances
        combinability: Combinability;
        negations?: string[];  // Things that MUST NOT appear (e.g., 'kofferdam')
    };
}

// Canonical askback IDs (must match askbackIds.ts)
const ASKBACK = {
    material: 'fuellung_material',
    surfaces: 'medical_surfaces',
    ueberkappung: 'medical_ueberkappung',
    ueberkappungMaterial: 'medical_ueberkappung_material',
    isolation: 'fuellung_isolation',
    mkvJustification: 'fuellung_mkv_justification',
    mkvAmount: 'mkv_betrag',
    mkvConfirmed: 'medical_mkv_confirmed',
    layering: 'fuellung_layering',
};

export const PRAXIS_16_SCENARIOS: Praxis16Scenario[] = [
    // ═══════════════════════════════════════════════════════════════
    // BASIC CHANNELIZATION (A01-A04)
    // ═══════════════════════════════════════════════════════════════
    {
        id: 'A01',
        title: 'GKV Simple Filling',
        insuranceType: 'GKV',
        dictation: 'Füllung Zahn 36 okklusal, Komposit, Kofferdam angelegt.',
        expected: {
            phase: 'questions',
            instances: 1,
            channelization: 'BEMA_ONLY',
            addon: false,
            askbacks: [ASKBACK.mkvConfirmed],
            multiplicity: false,
            combinability: 'ok',
        },
    },
    {
        id: 'A02',
        title: 'PKV Simple Filling',
        insuranceType: 'PKV',
        dictation: 'Kompositfüllung Zahn 15 mesial-okklusal, adhäsive Befestigung.',
        expected: {
            phase: 'questions',
            instances: 1,
            channelization: 'GOZ_ONLY',
            addon: false,
            askbacks: [ASKBACK.isolation, ASKBACK.layering],
            multiplicity: false,
            combinability: 'ok',
        },
    },
    {
        id: 'A03',
        title: 'MKV mit Mehrkosten',
        insuranceType: 'MKV',
        dictation: 'Füllung Zahn 26 okklusal-distal, Komposit, Mehrkosten vereinbart.',
        expected: {
            phase: 'questions',
            instances: 1,
            channelization: 'BOTH',
            addon: true,
            askbacks: [ASKBACK.isolation, ASKBACK.layering, ASKBACK.mkvJustification],
            multiplicity: false,
            combinability: 'warn',
        },
    },
    {
        id: 'A04',
        title: 'MKV nur Kasse',
        insuranceType: 'MKV',
        dictation: 'Füllung Zahn 46 okklusal, nur Kasse, kein Mehrkosten.',
        expected: {
            phase: 'questions',
            instances: 1,
            channelization: 'BEMA_ONLY',
            addon: false,
            askbacks: [ASKBACK.isolation, ASKBACK.material],
            multiplicity: false,
            combinability: 'ok',
        },
    },

    // ═══════════════════════════════════════════════════════════════
    // ASKBACK TRIGGERS (A05-A07)
    // ═══════════════════════════════════════════════════════════════
    {
        id: 'A05',
        title: 'Askback: Material fehlt',
        insuranceType: 'GKV',
        dictation: 'Füllung Zahn 37 okklusal.',
        expected: {
            phase: 'questions',
            instances: 1,
            channelization: 'BEMA_ONLY',
            addon: false,
            askbacks: [ASKBACK.isolation, ASKBACK.material],
            multiplicity: false,
            combinability: 'ok',
        },
    },
    {
        id: 'A06',
        title: 'Askback: Profunda/Capping',
        insuranceType: 'GKV',
        dictation: 'Füllung Zahn 36 okklusal, profunda, Komposit.',
        expected: {
            phase: 'questions',
            instances: 1,
            channelization: 'BEMA_ONLY',
            addon: false,
            askbacks: [ASKBACK.ueberkappung, ASKBACK.isolation, ASKBACK.mkvConfirmed],
            multiplicity: false,
            combinability: 'ok',
        },
    },
    {
        id: 'A07',
        title: 'Askback: Surfaces ambiguous',
        insuranceType: 'PKV',
        dictation: 'Kompositfüllung Zahn 24 approximal, adhäsive Befestigung.',
        expected: {
            phase: 'questions',
            instances: 1,
            channelization: 'GOZ_ONLY',
            addon: false,
            askbacks: [ASKBACK.surfaces, ASKBACK.isolation],
            multiplicity: false,
            combinability: 'ok',
        },
    },

    // ═══════════════════════════════════════════════════════════════
    // MULTI-TOOTH (A08-A10)
    // ═══════════════════════════════════════════════════════════════
    {
        id: 'A08',
        title: 'Multi-Tooth GKV',
        insuranceType: 'GKV',
        dictation: 'Füllung Zahn 36 okklusal Komposit; Füllung Zahn 46 okklusal Komposit.',
        expected: {
            phase: 'questions',
            instances: 2,
            channelization: 'BEMA_ONLY',
            addon: false,
            askbacks: [ASKBACK.isolation, ASKBACK.mkvConfirmed],
            multiplicity: true,
            combinability: 'ok',
        },
    },
    {
        id: 'A09',
        title: 'Multi-Tooth PKV',
        insuranceType: 'PKV',
        dictation: 'Kompositfüllung 15 mesial, danach Füllung 16 okklusal-distal.',
        expected: {
            phase: 'questions',
            instances: 2,
            channelization: 'GOZ_ONLY',
            addon: false,
            askbacks: [ASKBACK.isolation, ASKBACK.layering],
            multiplicity: true,
            combinability: 'ok',
        },
    },
    {
        id: 'A10',
        title: 'Multi-Tooth MKV',
        insuranceType: 'MKV',
        dictation: 'Füllung Zahn 36 und 46 jeweils okklusal, Komposit, Mehrkosten.',
        expected: {
            phase: 'questions',
            instances: 2,
            channelization: 'BOTH',
            addon: true,
            askbacks: [ASKBACK.mkvJustification, ASKBACK.mkvAmount],
            multiplicity: true,
            combinability: 'ok',
        },
    },

    // ═══════════════════════════════════════════════════════════════
    // NEGATION (A11)
    // ═══════════════════════════════════════════════════════════════
    {
        id: 'A11',
        title: 'Negation: ohne Kofferdam',
        insuranceType: 'GKV',
        dictation: 'Füllung Zahn 35 okklusal, Komposit, ohne Kofferdam, relative Trockenlegung.',
        expected: {
            phase: 'questions',
            instances: 1,
            channelization: 'BEMA_ONLY',
            addon: false,
            askbacks: [ASKBACK.isolation, ASKBACK.mkvConfirmed],
            multiplicity: false,
            combinability: 'ok',
            negations: ['kofferdam'],  // Must NOT have kofferdam billing
        },
    },

    // ═══════════════════════════════════════════════════════════════
    // COMBINABILITY EDGE CASES (A12-A13)
    // ═══════════════════════════════════════════════════════════════
    {
        id: 'A12',
        title: 'Combinability PASS (PKV, no GOZ_2197 emission)',
        insuranceType: 'PKV',
        dictation: 'Kompositfüllung Zahn 26 mod, adhäsive Befestigung, mehrfaches Abnehmen und Neuanlegen des Kofferdams.',
        expected: {
            phase: 'questions',
            instances: 1,
            channelization: 'GOZ_ONLY',
            addon: false,
            askbacks: [ASKBACK.layering],
            multiplicity: false,
            combinability: 'ok',
        },
    },
    {
        id: 'A13',
        title: 'Combinability PASS (PKV, no GOZ_2197 emission)',
        insuranceType: 'PKV',
        dictation: 'Große Kompositfüllung Zahn 36 okklusal-mesial-distal, adhäsive Befestigung nochmals separat abgerechnet.',
        expected: {
            phase: 'either',
            instances: 1,
            channelization: 'GOZ_ONLY',
            addon: false,
            askbacks: [],
            multiplicity: false,
            combinability: 'ok',
        },
    },

    // ═══════════════════════════════════════════════════════════════
    // COMPLEX CASES (A14-A16)
    // ═══════════════════════════════════════════════════════════════
    {
        id: 'A14',
        title: 'Complex + LA Leitung',
        insuranceType: 'GKV',
        dictation: 'Füllung Zahn 47 mesial-okklusal-distal, Komposit, Leitungsanästhesie Unterkiefer rechts, Kofferdam.',
        expected: {
            phase: 'questions',
            instances: 1,
            channelization: 'BEMA_ONLY',
            addon: false,
            askbacks: [ASKBACK.layering, ASKBACK.mkvConfirmed],
            multiplicity: false,
            combinability: 'ok',
        },
    },
    {
        id: 'A15',
        title: 'Profunda with explicit capping',
        insuranceType: 'GKV',
        dictation: 'Füllung Zahn 16 okklusal, profunda, indirekte Überkappung mit Kalziumhydroxid, Komposit.',
        expected: {
            phase: 'questions',
            instances: 1,
            channelization: 'BEMA_ONLY',
            addon: false,
            askbacks: [ASKBACK.ueberkappung, ASKBACK.ueberkappungMaterial, ASKBACK.isolation, ASKBACK.mkvConfirmed],
            multiplicity: false,
            combinability: 'ok',
        },
    },
    {
        id: 'A16',
        title: 'Isolation unclear (L2 optional)',
        insuranceType: 'MKV',
        dictation: 'Füllung Zahn 45 okklusal-bukkal, Komposit, Mehrkosten vereinbart.',
        expected: {
            phase: 'either',  // May or may not trigger isolation askback
            instances: 1,
            channelization: 'BOTH',
            addon: true,
            askbacks: [ASKBACK.isolation, ASKBACK.layering, ASKBACK.mkvJustification],
            multiplicity: false,
            combinability: 'warn',
        },
    },
];

export default PRAXIS_16_SCENARIOS;
