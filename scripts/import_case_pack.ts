/**
 * Docudent Importer – Case Pack v1 (Option 1)
 * 
 * Validates and normalizes the case pack against SSOTs.
 * Run: npx tsx scripts/import_case_pack.ts
 */
import { hasBel2Code, normalizeBel2Code } from '../src/docudent/core/billing/knowledgeBase/logic/bel2Catalog';
import casePack from '../src/docudent/__fixtures__/ze_bel_cases_v1.json';
import * as fs from 'fs';

// ═══════════════════════════════════════════════════════════════
// PATTERNS
// ═══════════════════════════════════════════════════════════════

const FZ_PATTERN = /^FZ_\d+(\.\d+)+[a-z]?$/;
const BEL_PATTERN_FULL = /^BEL_\d{4}$/;
const BEL_PATTERN_RAW = /^\d{4}$/;

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface CaseValidation {
    id: string;
    status: 'PASS' | 'FAIL';
    missingBelCodes: string[];
    invalidFzCodes: string[];
    invalidBelCodes: string[];
    notes: string[];
}

interface ImportedCase {
    id: string;
    category: string;
    title: string;
    clinicalScenario: string;
    befundklasse: string;
    festzuschuss: {
        fzCodes: string[];
        notes: string;
    };
    bel: {
        belCodes: string[];
        notes: string;
    };
    edgeCases: string[];
    expectedEngineChecks: string[];
    status: 'PASS' | 'FAIL';
    validationNotes: string[];
}

// ═══════════════════════════════════════════════════════════════
// VALIDATION & NORMALIZATION
// ═══════════════════════════════════════════════════════════════

function normalizeBelCode(code: string): string {
    if (BEL_PATTERN_RAW.test(code)) {
        return `BEL_${code}`;
    }
    return code;
}

function validateCase(caseData: any): { imported: ImportedCase; validation: CaseValidation } {
    const fzCodes: string[] = caseData.festzuschuss?.fzCodes || [];
    const rawBelCodes: string[] = caseData.bel?.belCodes || [];

    // Normalize BEL codes
    const normalizedBelCodes = rawBelCodes.map(normalizeBelCode);

    // Validate FZ codes format
    const invalidFzCodes = fzCodes.filter(code => !FZ_PATTERN.test(code));

    // Validate BEL codes format
    const invalidBelCodes = normalizedBelCodes.filter(
        code => !BEL_PATTERN_FULL.test(code)
    );

    // Check BEL existence
    const missingBelCodes: string[] = [];
    for (const code of normalizedBelCodes) {
        if (BEL_PATTERN_FULL.test(code) && !hasBel2Code(code)) {
            if (!missingBelCodes.includes(code)) {
                missingBelCodes.push(code);
            }
        }
    }

    // Determine status
    const hasFailed =
        invalidFzCodes.length > 0 ||
        invalidBelCodes.length > 0 ||
        missingBelCodes.length > 0;

    const status: 'PASS' | 'FAIL' = hasFailed ? 'FAIL' : 'PASS';

    // Build validation notes
    const validationNotes: string[] = [];
    if (invalidFzCodes.length > 0) {
        validationNotes.push(`Invalid FZ format: ${invalidFzCodes.join(', ')}`);
    }
    if (invalidBelCodes.length > 0) {
        validationNotes.push(`Invalid BEL format: ${invalidBelCodes.join(', ')}`);
    }
    if (missingBelCodes.length > 0) {
        validationNotes.push(`Missing BEL codes: ${missingBelCodes.join(', ')}`);
    }
    if (status === 'PASS') {
        validationNotes.push('All codes validated against SSOTs');
    }

    const imported: ImportedCase = {
        id: caseData.id,
        category: caseData.category,
        title: caseData.title,
        clinicalScenario: caseData.clinicalScenario,
        befundklasse: caseData.befundklasse,
        festzuschuss: {
            fzCodes: fzCodes,
            notes: caseData.festzuschuss?.notes || '',
        },
        bel: {
            belCodes: normalizedBelCodes,
            notes: caseData.bel?.notes || '',
        },
        edgeCases: caseData.edgeCases || [],
        expectedEngineChecks: caseData.expectedEngineChecks || [],
        status,
        validationNotes,
    };

    const validation: CaseValidation = {
        id: caseData.id,
        status,
        missingBelCodes,
        invalidFzCodes,
        invalidBelCodes,
        notes: validationNotes,
    };

    return { imported, validation };
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

const results = casePack.cases.map(validateCase);
const importedCases = results.map(r => r.imported);
const validations = results.map(r => r.validation);

const passCount = validations.filter(v => v.status === 'PASS').length;
const failCount = validations.length - passCount;

// Collect unique issues
const allMissingBel = new Set<string>();
const allInvalidFz = new Set<string>();
const allInvalidBel = new Set<string>();

for (const v of validations) {
    v.missingBelCodes.forEach(c => allMissingBel.add(c));
    v.invalidFzCodes.forEach(c => allInvalidFz.add(c));
    v.invalidBelCodes.forEach(c => allInvalidBel.add(c));
}

// ═══════════════════════════════════════════════════════════════
// OUTPUT: Imported Case Pack
// ═══════════════════════════════════════════════════════════════

const importedCasePack = {
    meta: {
        version: 'case-pack-v1-imported',
        sourceVersion: casePack.meta.version,
        lastImported: new Date().toISOString(),
        importedBy: 'Docudent Importer v1',
    },
    cases: importedCases,
};

fs.writeFileSync(
    'src/docudent/__fixtures__/ze_bel_cases_v1_imported.json',
    JSON.stringify(importedCasePack, null, 4) + '\n'
);

// ═══════════════════════════════════════════════════════════════
// OUTPUT: Import Report
// ═══════════════════════════════════════════════════════════════

const importReport = {
    meta: {
        importer: 'Docudent Importer v1',
        timestamp: new Date().toISOString(),
        sourceFile: 'ze_bel_cases_v1.json',
    },
    summary: {
        pass: passCount,
        fail: failCount,
        total: validations.length,
        missingBelCodesUnique: [...allMissingBel].sort(),
        invalidFzFormatUnique: [...allInvalidFz].sort(),
        invalidBelFormatUnique: [...allInvalidBel].sort(),
    },
    perCase: validations,
};

fs.writeFileSync(
    'src/docudent/__fixtures__/ze_bel_cases_v1_import_report.json',
    JSON.stringify(importReport, null, 4) + '\n'
);

// Console output
console.log(JSON.stringify(importReport, null, 2));
