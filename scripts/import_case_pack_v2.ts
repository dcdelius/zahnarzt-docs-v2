/**
 * Import Case Pack v2
 * 
 * Validates and normalizes ze_bel_cases_v2.json with:
 * - FZ pattern validation
 * - BEL existence via lookupBel2
 * - Clinical field validation for CASE_13+ (shared logic, legacy-exempt)
 * 
 * FAIL on any validation error (consistent with validator).
 * 
 * Run: npx tsx scripts/import_case_pack_v2.ts
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
const BEL_RAW_PATTERN = /^\d{4}$/;

// ═══════════════════════════════════════════════════════════════
// LOAD
// ═══════════════════════════════════════════════════════════════

const casesPath = resolve(__dirname, '../src/docudent/__fixtures__/ze_bel_cases_v2.json');
const casePack = JSON.parse(fs.readFileSync(casesPath, 'utf8'));

interface CaseValidation {
    id: string;
    status: 'PASS' | 'FAIL';
    missingBelCodes: string[];
    invalidFzCodes: string[];
    missingFields: string[];
    errors: string[];
}

function normalizeBelCode(code: string): string {
    if (BEL_RAW_PATTERN.test(code)) {
        return `BEL_${code}`;
    }
    return code;
}

const validations: CaseValidation[] = [];
const importedCases: any[] = [];
let passCount = 0;
let failCount = 0;
const failCaseIds: string[] = [];
const failReasonsByCase: Record<string, string[]> = {};
const allMissingBel = new Set<string>();
const allInvalidFz = new Set<string>();

for (const c of casePack.cases) {
    const fzCodes: string[] = c.festzuschuss?.fzCodes ?? [];
    const rawBelCodes: string[] = c.bel?.belCodes ?? [];

    // Normalize BEL codes
    const normalizedBelCodes = rawBelCodes.map(normalizeBelCode);

    // Validate FZ codes
    const invalidFzCodes = fzCodes.filter(code => !FZ_PATTERN.test(code));
    invalidFzCodes.forEach(code => allInvalidFz.add(code));

    // Validate BEL existence
    const missingBelCodes: string[] = [];
    for (const code of normalizedBelCodes) {
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
    const allErrors: string[] = [];
    if (invalidFzCodes.length > 0) {
        allErrors.push(`invalidFzCodes: ${invalidFzCodes.join(', ')}`);
    }
    if (missingBelCodes.length > 0) {
        allErrors.push(`missingBelCodes: ${missingBelCodes.join(', ')}`);
    }
    allErrors.push(...clinicalValidation.errors);

    // Determine status: FAIL on any error
    const hasFailed = allErrors.length > 0;
    const status: 'PASS' | 'FAIL' = hasFailed ? 'FAIL' : 'PASS';

    if (hasFailed) {
        failCount++;
        failCaseIds.push(c.id);
        failReasonsByCase[c.id] = allErrors;
    } else {
        passCount++;
    }

    const imported = {
        ...c,
        bel: {
            ...c.bel,
            belCodes: normalizedBelCodes,
        },
        status,
        validationNotes: allErrors.length > 0
            ? allErrors
            : ['All codes validated against SSOTs'],
    };

    importedCases.push(imported);
    validations.push({
        id: c.id,
        status,
        missingBelCodes,
        invalidFzCodes,
        missingFields: clinicalValidation.missingFields,
        errors: allErrors,
    });
}

// ═══════════════════════════════════════════════════════════════
// OUTPUT: Imported Case Pack
// ═══════════════════════════════════════════════════════════════

const importedCasePack = {
    meta: {
        version: 'case-pack-v2-imported',
        sourceVersion: casePack.meta.version,
        lastImported: new Date().toISOString(),
        importedBy: 'Docudent Importer v2',
    },
    cases: importedCases,
};

const importedPath = resolve(__dirname, '../src/docudent/__fixtures__/ze_bel_cases_v2_imported.json');
fs.writeFileSync(importedPath, JSON.stringify(importedCasePack, null, 4) + '\n');
console.log(`✓ Written: ${importedPath}`);

// ═══════════════════════════════════════════════════════════════
// OUTPUT: Import Report
// ═══════════════════════════════════════════════════════════════

const importReport = {
    meta: {
        importer: 'Docudent Importer v2',
        timestamp: new Date().toISOString(),
        sourceFile: 'ze_bel_cases_v2.json',
    },
    summary: {
        pass: passCount,
        fail: failCount,
        failCaseIds,
        failReasonsByCase,
        total: validations.length,
        missingBelCodesUnique: [...allMissingBel].sort(),
        invalidFzCodesUnique: [...allInvalidFz].sort(),
    },
    perCase: validations,
};

const reportPath = resolve(__dirname, '../src/docudent/__fixtures__/ze_bel_cases_v2_import_report.json');
fs.writeFileSync(reportPath, JSON.stringify(importReport, null, 4) + '\n');
console.log(`✓ Written: ${reportPath}`);

console.log('\nSUMMARY:');
console.log(`  Pass: ${passCount}`);
console.log(`  Fail: ${failCount}`);
if (failCaseIds.length > 0) {
    console.log(`  Fail IDs: ${failCaseIds.join(', ')}`);
}
