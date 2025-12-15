/**
 * Validate Case Pack v2
 * 
 * Validates ze_bel_cases_v2.json with:
 * - FZ pattern validation
 * - BEL existence via lookupBel2
 * - Clinical field validation for CASE_13+ (shared logic, legacy-exempt)
 * 
 * Run: npx tsx scripts/validate_case_pack_v2.ts
 */
import * as fs from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { hasBel2Code } from '../src/docudent/core/billing/knowledgeBase/logic/bel2Catalog';
import { validateClinicalFields, type CaseData } from '../src/docudent/core/billing/knowledgeBase/logic/casePackValidation';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ═══════════════════════════════════════════════════════════════
// PATTERNS
// ═══════════════════════════════════════════════════════════════

const FZ_PATTERN = /^FZ_\d+(\.\d+)*[a-z]?$/;
const BEL_PATTERN = /^BEL_\d{4}$/;

// ═══════════════════════════════════════════════════════════════
// LOAD
// ═══════════════════════════════════════════════════════════════

const casesPath = resolve(__dirname, '../src/docudent/__fixtures__/ze_bel_cases_v2.json');
const casePack = JSON.parse(fs.readFileSync(casesPath, 'utf8'));

interface CaseResult {
    id: string;
    status: 'PASS' | 'FAIL';
    invalidFzCodes: string[];
    missingBelCodes: string[];
    missingFields: string[];
    errors: string[];
}

const results: CaseResult[] = [];
let passCount = 0;
let failCount = 0;
const failCaseIds: string[] = [];
const failReasonsByCase: Record<string, string[]> = {};
const allMissingBel = new Set<string>();
const allInvalidFz = new Set<string>();

for (const c of casePack.cases) {
    const fzCodes: string[] = c.festzuschuss?.fzCodes ?? [];
    const belCodes: string[] = c.bel?.belCodes ?? [];

    const invalidFzCodes = fzCodes.filter(code => !FZ_PATTERN.test(code));
    const missingBelCodes: string[] = [];
    const allErrors: string[] = [];

    // Check BEL existence
    for (const code of belCodes) {
        if (BEL_PATTERN.test(code) && !hasBel2Code(code)) {
            if (!missingBelCodes.includes(code)) {
                missingBelCodes.push(code);
                allMissingBel.add(code);
            }
        }
    }

    // Clinical field validation (shared logic, legacy-exempt)
    const clinicalValidation = validateClinicalFields(c as CaseData);

    // Collect all errors
    if (invalidFzCodes.length > 0) {
        allErrors.push(`invalidFzCodes: ${invalidFzCodes.join(', ')}`);
    }
    if (missingBelCodes.length > 0) {
        allErrors.push(`missingBelCodes: ${missingBelCodes.join(', ')}`);
    }
    allErrors.push(...clinicalValidation.errors);

    invalidFzCodes.forEach(code => allInvalidFz.add(code));

    const hasFailed = allErrors.length > 0;

    if (hasFailed) {
        failCount++;
        failCaseIds.push(c.id);
        failReasonsByCase[c.id] = allErrors;
    } else {
        passCount++;
    }

    results.push({
        id: c.id,
        status: hasFailed ? 'FAIL' : 'PASS',
        invalidFzCodes,
        missingBelCodes,
        missingFields: clinicalValidation.missingFields,
        errors: allErrors,
    });
}

// ═══════════════════════════════════════════════════════════════
// OUTPUT
// ═══════════════════════════════════════════════════════════════

const report = {
    meta: {
        validator: 'CASE_PACK_VALIDATOR_V2',
        inputVersion: 'case-pack-v2',
        caseCount: casePack.cases.length,
        timestamp: new Date().toISOString(),
    },
    summary: {
        pass: passCount,
        fail: failCount,
        failCaseIds,
        failReasonsByCase,
        missingBelCodesUnique: [...allMissingBel].sort(),
        invalidFzCodesUnique: [...allInvalidFz].sort(),
    },
    results,
};

console.log(JSON.stringify(report, null, 2));
