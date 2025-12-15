/**
 * Case Pack Refiner - Apply BEL patches and validate
 * 
 * Run: npx tsx scripts/refine_case_pack.ts
 */
import { hasBel2Code } from '../src/docudent/core/billing/knowledgeBase/logic/bel2Catalog';
import casePack from '../src/docudent/__fixtures__/ze_bel_cases_v1.json';
import patchData from '../src/docudent/ze_bel_cases_v1_patch_bel2_2022.json';
import * as fs from 'fs';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface OpReplace { op: 'replaceBelCode'; from: string; to: string; }
interface OpDrop { op: 'dropBelCode'; code: string; reason: string; }
type Op = OpReplace | OpDrop;

interface CaseFix {
    caseId: string;
    ops: Op[];
}

interface ChangeApplied {
    op: string;
    from?: string;
    to?: string;
    code?: string;
    matchCount: number;
}

interface CaseValidation {
    id: string;
    status: 'PASS' | 'FAIL_BEL_MISSING' | 'FAIL_REPLACEMENT_INVALID';
    foundBelCodes: string[];
    missingBelCodes: string[];
    changesApplied: ChangeApplied[];
}

// ═══════════════════════════════════════════════════════════════
// APPLY PATCHES
// ═══════════════════════════════════════════════════════════════

const updatedCases = JSON.parse(JSON.stringify(casePack.cases));
const validationResults: CaseValidation[] = [];
const caseFixes = (patchData as any).caseFixes as CaseFix[];

// Build a map of case fixes by ID
const fixMap = new Map<string, CaseFix>();
for (const fix of caseFixes) {
    fixMap.set(fix.caseId, fix);
}

for (const caseData of updatedCases) {
    const fix = fixMap.get(caseData.id);
    const changesApplied: ChangeApplied[] = [];

    if (fix) {
        for (const op of fix.ops) {
            if (op.op === 'replaceBelCode') {
                // First verify replacement code exists
                if (!hasBel2Code(op.to)) {
                    console.error(`FAIL_REPLACEMENT_INVALID: ${op.to} not in catalog`);
                    process.exit(1);
                }

                // Apply replacement
                let matchCount = 0;
                caseData.bel.belCodes = caseData.bel.belCodes.map((code: string) => {
                    if (code === op.from) {
                        matchCount++;
                        return op.to;
                    }
                    return code;
                });

                changesApplied.push({
                    op: 'replaceBelCode',
                    from: op.from,
                    to: op.to,
                    matchCount,
                });
            } else if (op.op === 'dropBelCode') {
                const before = caseData.bel.belCodes.length;
                caseData.bel.belCodes = caseData.bel.belCodes.filter(
                    (code: string) => code !== op.code
                );
                const matchCount = before - caseData.bel.belCodes.length;

                changesApplied.push({
                    op: 'dropBelCode',
                    code: op.code,
                    matchCount,
                });
            }
        }
    }

    // Validate all BEL codes
    const foundBel: string[] = [];
    const missingBel: string[] = [];

    for (const code of caseData.bel.belCodes) {
        if (hasBel2Code(code)) {
            if (!foundBel.includes(code)) foundBel.push(code);
        } else {
            if (!missingBel.includes(code)) missingBel.push(code);
        }
    }

    validationResults.push({
        id: caseData.id,
        status: missingBel.length > 0 ? 'FAIL_BEL_MISSING' : 'PASS',
        foundBelCodes: foundBel,
        missingBelCodes: missingBel,
        changesApplied,
    });
}

// ═══════════════════════════════════════════════════════════════
// OUTPUT: Updated Case Pack
// ═══════════════════════════════════════════════════════════════

const updatedCasePack = {
    meta: {
        ...casePack.meta,
        patchApplied: patchData._meta,
        lastUpdated: new Date().toISOString(),
    },
    cases: updatedCases,
};

fs.writeFileSync(
    'src/docudent/__fixtures__/ze_bel_cases_v1.json',
    JSON.stringify(updatedCasePack, null, 4) + '\n'
);

// ═══════════════════════════════════════════════════════════════
// OUTPUT: Validation Report
// ═══════════════════════════════════════════════════════════════

const passCount = validationResults.filter(r => r.status === 'PASS').length;
const failCount = validationResults.length - passCount;
const allMissing = new Set<string>();
validationResults.forEach(r => r.missingBelCodes.forEach(c => allMissing.add(c)));

const validationReport = {
    meta: {
        validator: 'CASE_PACK_REFINER_V1',
        timestamp: new Date().toISOString(),
        patchApplied: patchData._meta,
    },
    summary: {
        pass: passCount,
        fail: failCount,
        missingBelCodesUnique: [...allMissing].sort(),
    },
    results: validationResults,
};

console.log(JSON.stringify(validationReport, null, 2));
