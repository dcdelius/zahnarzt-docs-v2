/**
 * Case Pack Validator - Validates ze_bel_cases_v1.json against SSOTs
 * 
 * Run: npx tsx scripts/validate_case_pack.ts
 */
import { hasBel2Code, lookupBel2 } from '../src/docudent/core/billing/knowledgeBase/logic/bel2Catalog';
import casePack from '../src/docudent/__fixtures__/ze_bel_cases_v1.json';

// ═══════════════════════════════════════════════════════════════
// KNOWN FZ CODES (from Festzuschuss system 2025)
// ═══════════════════════════════════════════════════════════════
const KNOWN_FZ_CODES = new Set([
    // BK 1 - Kronen
    'FZ_1.1', 'FZ_1.2', 'FZ_1.3', 'FZ_1.4', 'FZ_1.5',
    // BK 2 - Brücken
    'FZ_2.1', 'FZ_2.2', 'FZ_2.3', 'FZ_2.4', 'FZ_2.5', 'FZ_2.6', 'FZ_2.7',
    // BK 3 - Prothesen (Modellguss/Teleskop)
    'FZ_3.1', 'FZ_3.2', 'FZ_3.2a', 'FZ_3.2b',
    // BK 4 - Interimsprothese
    'FZ_4.1', 'FZ_4.2', 'FZ_4.3', 'FZ_4.4', 'FZ_4.5', 'FZ_4.6', 'FZ_4.7', 'FZ_4.8',
    // BK 5 - Prothesen
    'FZ_5.1', 'FZ_5.2', 'FZ_5.3', 'FZ_5.4',
    // BK 6 - Wiederherstellung
    'FZ_6.0', 'FZ_6.1', 'FZ_6.2', 'FZ_6.3', 'FZ_6.4', 'FZ_6.5', 'FZ_6.5.1',
    'FZ_6.6', 'FZ_6.7', 'FZ_6.8', 'FZ_6.8.1', 'FZ_6.9',
    // BK 7 - Totalprothese
    'FZ_7.1', 'FZ_7.2', 'FZ_7.3', 'FZ_7.4', 'FZ_7.5', 'FZ_7.6', 'FZ_7.7',
]);

const FZ_REGEX = /^FZ_\d+(\.\d+)?(\.\d+)?[a-z]?$/;

interface CaseResult {
    id: string;
    caseStatus: 'PASS' | 'FAIL_BEL_MISSING' | 'FAIL_FZ_UNKNOWN' | 'FAIL_FZ_FORMAT';
    fz: {
        validFormat: boolean;
        unknownFzCodes: string[];
        warnings: string[];
    };
    bel: {
        missingBelCodes: string[];
        foundBelCodes: string[];
        notes: string;
    };
    recommendedNextStep: 'KEEP' | 'FIX_BEL_CODES' | 'EXTEND_BEL_CATALOG' | 'REVIEW_FZ_COMBO';
}

interface ValidationOutput {
    meta: {
        validator: string;
        inputVersion: string;
        caseCount: number;
        timestamp: string;
        summary: {
            pass: number;
            fail: number;
            failReasons: Record<string, number>;
            missingBelCodesUnique: string[];
            unknownFzCodesUnique: string[];
        };
    };
    results: CaseResult[];
}

// ═══════════════════════════════════════════════════════════════
// VALIDATION LOGIC
// ═══════════════════════════════════════════════════════════════

function validateCase(caseData: any): CaseResult {
    const fzCodes: string[] = caseData.festzuschuss?.fzCodes || [];
    const belCodes: string[] = caseData.bel?.belCodes || [];

    // FZ Validation
    const invalidFormatFz = fzCodes.filter(code => !FZ_REGEX.test(code));
    const unknownFz = fzCodes.filter(code => !KNOWN_FZ_CODES.has(code));
    const warnings: string[] = [];

    // Check FZ_3.2a max 2x rule
    const fz32aCount = fzCodes.filter(c => c === 'FZ_3.2a').length;
    if (fz32aCount > 2) {
        warnings.push('max2-per-kiefer rule risk: FZ_3.2a appears ' + fz32aCount + ' times');
    }

    // Check multi-FZ in BK6 repair
    const bk6Codes = fzCodes.filter(c => c.startsWith('FZ_6.'));
    if (bk6Codes.length > 1 && caseData.category === 'REPAIR') {
        warnings.push('combo review: multiple BK6 codes in repair case');
    }

    // BEL Validation
    const missingBel: string[] = [];
    const foundBel: string[] = [];

    for (const code of belCodes) {
        if (hasBel2Code(code)) {
            foundBel.push(code);
        } else {
            missingBel.push(code);
        }
    }

    // Determine status
    let status: CaseResult['caseStatus'] = 'PASS';
    let nextStep: CaseResult['recommendedNextStep'] = 'KEEP';

    if (invalidFormatFz.length > 0) {
        status = 'FAIL_FZ_FORMAT';
        nextStep = 'REVIEW_FZ_COMBO';
    } else if (unknownFz.length > 0) {
        status = 'FAIL_FZ_UNKNOWN';
        nextStep = 'REVIEW_FZ_COMBO';
    } else if (missingBel.length > 0) {
        status = 'FAIL_BEL_MISSING';
        nextStep = missingBel.some(c => c.match(/^BEL_[2-8]\d{3}$/)) ? 'EXTEND_BEL_CATALOG' : 'FIX_BEL_CODES';
    }

    return {
        id: caseData.id,
        caseStatus: status,
        fz: {
            validFormat: invalidFormatFz.length === 0,
            unknownFzCodes: unknownFz,
            warnings,
        },
        bel: {
            missingBelCodes: [...new Set(missingBel)],
            foundBelCodes: [...new Set(foundBel)],
            notes: missingBel.length > 0 ? `${missingBel.length} BEL codes not in catalog` : 'All BEL codes found',
        },
        recommendedNextStep: nextStep,
    };
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

const results: CaseResult[] = casePack.cases.map(validateCase);

const passCount = results.filter(r => r.caseStatus === 'PASS').length;
const failCount = results.length - passCount;

const failReasons: Record<string, number> = {};
const allMissingBel = new Set<string>();
const allUnknownFz = new Set<string>();

for (const r of results) {
    if (r.caseStatus !== 'PASS') {
        failReasons[r.caseStatus] = (failReasons[r.caseStatus] || 0) + 1;
    }
    r.bel.missingBelCodes.forEach(c => allMissingBel.add(c));
    r.fz.unknownFzCodes.forEach(c => allUnknownFz.add(c));
}

const output: ValidationOutput = {
    meta: {
        validator: 'CASE_PACK_VALIDATOR_V1',
        inputVersion: casePack.meta.version,
        caseCount: casePack.meta.caseCount,
        timestamp: new Date().toISOString(),
        summary: {
            pass: passCount,
            fail: failCount,
            failReasons,
            missingBelCodesUnique: [...allMissingBel].sort(),
            unknownFzCodesUnique: [...allUnknownFz].sort(),
        },
    },
    results,
};

console.log(JSON.stringify(output, null, 2));
