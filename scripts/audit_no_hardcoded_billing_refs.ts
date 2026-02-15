#!/usr/bin/env npx ts-node
/**
 * G6: Audit for Hardcoded Billing Refs
 * 
 * Scans codebase for GOZ/BEMA/BEL/GOÄ codes outside allowed locations.
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const BILLING_PATTERN = /\b(GOZ|BEMA|BEL|GOÄ|GOA)_[0-9a-zA-Z_]+\b/g;

const ALLOWED_PATHS = [
    // Billing catalogs (SSOT)
    'src/docudent/core/billing/knowledgeBase/kataloge/*.json',
    'src/docudent/core/billing/knowledgeBase/kataloge/**/*.json',

    // Billing resolver/mappings
    'src/docudent/core/billing/knowledgeBase/treatments/**/*.json',

    // Test fixtures (explicitly allowed)
    'src/docudent/**/__tests__/**/*.ts',
    'src/docudent/**/__fixtures__/**/*',

    // Gate tests (allowed to reference codes for testing)
    'src/docudent/**/gates/**/*.ts',

    // Documentation (allowed for examples)
    'docs/**/*.md',
    'docs/**/*.json',

    // This script itself
    'scripts/audit_no_hardcoded_billing_refs.ts',
];

const EXCLUDE_PATHS = [
    'node_modules',
    'dist',
    'build',
    '.git',
];

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface Violation {
    file: string;
    line: number;
    column: number;
    code: string;
    snippet: string;
}

interface AuditReport {
    run_at: string;
    total_violations: number;
    violations_by_file: Record<string, Violation[]>;
    allowed_paths: string[];
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
    const violations: Violation[] = [];

    // Get all TypeScript and TypeScript React files
    const files = await glob('src/**/*.{ts,tsx}', {
        ignore: EXCLUDE_PATHS.map(p => `**/${p}/**`),
        cwd: process.cwd(),
    });

    for (const file of files) {
        if (isAllowedPath(file)) continue;

        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, lineIndex) => {
            let match;
            while ((match = BILLING_PATTERN.exec(line)) !== null) {
                violations.push({
                    file,
                    line: lineIndex + 1,
                    column: match.index + 1,
                    code: match[0],
                    snippet: line.trim().slice(0, 100),
                });
            }
        });
    }

    // Build report
    const report: AuditReport = {
        run_at: new Date().toISOString(),
        total_violations: violations.length,
        violations_by_file: {},
        allowed_paths: ALLOWED_PATHS,
    };

    violations.forEach(v => {
        if (!report.violations_by_file[v.file]) {
            report.violations_by_file[v.file] = [];
        }
        report.violations_by_file[v.file].push(v);
    });

    // Output
    const outputPath = 'docs/system-atlas/artifacts/billing-decoupling/hardcode.report.json';
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

    console.log(`Audit complete. Found ${violations.length} violations.`);
    console.log(`Report written to: ${outputPath}`);

    if (violations.length > 0) {
        console.log('\nViolations:');
        violations.forEach(v => {
            console.log(`  ${v.file}:${v.line} - ${v.code}`);
        });
        process.exit(1);
    }
}

function isAllowedPath(filePath: string): boolean {
    return ALLOWED_PATHS.some(pattern => {
        const regex = new RegExp(
            '^' + pattern
                .replace(/\*\*/g, '.*')
                .replace(/\*/g, '[^/]*')
                .replace(/\//g, '\\/') + '$'
        );
        return regex.test(filePath);
    });
}

main().catch(console.error);
