/**
 * GP6: Catalog Audit Script
 * 
 * Scans codebase for billing refs and checks against catalogs.
 * Run: npx vitest run scripts/billing/catalog_audit.test.ts
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const BILLING_PATTERN = /\b(GOZ|BEMA|BEL|GOÄ|GOA)_[0-9a-zA-Z_]+\b/g;

// Allowed paths for billing codes
const ALLOWED_PATHS = [
    'src/docudent/core/billing/knowledgeBase',
    'src/docudent/core/billing/knowledgeBase/kataloge',
    'src/docudent/core/billing/knowledgeBase/treatments',
    'src/docudent/core/billing/knowledgeBase/logic',
    'src/docudent/core/billing/knowledgeBase/navigation',
    'src/docudent/core/billing',
    'src/docudent/contracts',
    'src/docudent/v10',
    'src/docudent/v10/kb',
    'src/docudent/v10/billing',
    'src/docudent/v10/diagnostics',
    'src/docudent/v10/facts',
    'src/docudent/v10/packs',
];

interface AuditResult {
    file: string;
    code: string;
    allowed: boolean;
}

function auditDirectory(dir: string): AuditResult[] {
    const results: AuditResult[] = [];

    function walkDir(currentDir: string) {
        if (!fs.existsSync(currentDir)) return;

        const entries = fs.readdirSync(currentDir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);

            if (entry.isDirectory()) {
                if (!['node_modules', 'dist', '.git', '__fixtures__', 'behandlungen'].includes(entry.name)) {
                    walkDir(fullPath);
                }
            } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.json')) {
                if (
                    /^FUELLUNG_.*\.json$/i.test(entry.name) ||
                    /_extracted\.json$/i.test(entry.name) ||
                    entry.name === 'HARDCODED_AUDIT.json' ||
                    /^ze_bel_cases_/i.test(entry.name)
                ) {
                    continue;
                }
                const content = fs.readFileSync(fullPath, 'utf-8');
                const matches = content.match(BILLING_PATTERN);

                if (matches) {
                    const isAllowed = ALLOWED_PATHS.some(p => fullPath.includes(p));
                    matches.forEach(code => {
                        results.push({ file: fullPath, code, allowed: isAllowed });
                    });
                }
            }
        }
    }

    walkDir(dir);
    return results;
}

describe('GP6: Catalog Audit', () => {
    it('all billing refs are in allowed locations', () => {
        const results = auditDirectory('src/docudent');
        const violations = results.filter(r => !r.allowed);

        // Filter out test files and docs
        const realViolations = violations.filter(v =>
            !v.file.includes('__tests__') &&
            !v.file.includes('gates') &&
            !v.file.includes('.test.') &&
            !v.file.includes('/qa/') &&
            !v.file.includes('/v5/') &&
            !v.file.includes('/v7/')
        );

        if (realViolations.length > 0) {
            console.log('Violations found:');
            realViolations.forEach(v => console.log(`  ${v.file}: ${v.code}`));
        }

        expect(realViolations).toEqual([]);
    });

    it('generates audit report', () => {
        const results = auditDirectory('src/docudent');
        const violations = results
            .filter(r => !r.allowed)
            .filter(v =>
                !v.file.includes('__tests__') &&
                !v.file.includes('gates') &&
                !v.file.includes('.test.') &&
                !v.file.includes('/qa/') &&
                !v.file.includes('/v5/') &&
                !v.file.includes('/v7/')
            );

        const report = {
            run_at: new Date().toISOString(),
            total_refs_found: results.length,
            in_allowed_paths: results.filter(r => r.allowed).length,
            violations: violations.length,
            by_catalog: {
                GOZ: results.filter(r => r.code.startsWith('GOZ_')).length,
                BEMA: results.filter(r => r.code.startsWith('BEMA_')).length,
                BEL: results.filter(r => r.code.startsWith('BEL_')).length,
                GOA: results.filter(r => r.code.startsWith('GOA_') || r.code.startsWith('GOÄ_')).length,
            },
        };

        // Write report
        const reportPath = 'docs/system-atlas/artifacts/gigaprompt_fuellung_06/catalog_audit.report.json';
        fs.mkdirSync(path.dirname(reportPath), { recursive: true });
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        expect(report.violations).toBe(0);
    });
});
