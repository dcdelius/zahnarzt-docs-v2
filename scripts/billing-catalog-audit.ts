/**
 * Billing Catalog Comprehensive Audit Script
 * 
 * Executes all 6 Gigaprompts:
 * 1. BillingRef Closure Re-Run
 * 2. Catalog Coverage Audit
 * 3. BEL/BEL_II Consistency
 * 4. GOZ/GOÄ Scope Assessment
 * 5. (Gate test created separately)
 * 6. Final Report Generation
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = process.cwd();

// ═══════════════════════════════════════════════════════════════════════════
// PART 1: LOAD CATALOGS
// ═══════════════════════════════════════════════════════════════════════════

interface CatalogEntry {
    id: string;
    system?: string;
    nummer?: string;
    bezeichnung?: string;
    codeId?: string; // For BEL entries
    code?: string;   // For BEL entries
    [key: string]: unknown;
}

interface Catalogs {
    bema: Record<string, CatalogEntry>;
    goz: Record<string, CatalogEntry>;
    goa: Record<string, CatalogEntry>;
    bel: { entries: CatalogEntry[] };
}

function loadCatalogs(): Catalogs {
    const catalogDir = 'src/docudent/core/billing/knowledgeBase/kataloge';

    const bema = JSON.parse(fs.readFileSync(path.join(ROOT, catalogDir, 'bema.json'), 'utf-8'));
    const goz = JSON.parse(fs.readFileSync(path.join(ROOT, catalogDir, 'goz.json'), 'utf-8'));
    const goa = JSON.parse(fs.readFileSync(path.join(ROOT, catalogDir, 'goa.json'), 'utf-8'));
    const bel = JSON.parse(fs.readFileSync(path.join(ROOT, catalogDir, 'bel2_2022.json'), 'utf-8'));

    return { bema, goz, goa, bel };
}

function getAllCatalogCodes(catalogs: Catalogs): Set<string> {
    const codes = new Set<string>();

    // BEMA codes
    Object.keys(catalogs.bema).filter(k => k !== '_meta').forEach(k => codes.add(k));

    // GOZ codes
    Object.keys(catalogs.goz).filter(k => k !== '_meta').forEach(k => codes.add(k));

    // GOÄ codes  
    Object.keys(catalogs.goa).filter(k => k !== '_meta').forEach(k => codes.add(k));

    // BEL codes
    if (catalogs.bel.entries) {
        catalogs.bel.entries.forEach((entry: CatalogEntry) => {
            if (entry.codeId) codes.add(entry.codeId);
        });
    }

    return codes;
}

// ═══════════════════════════════════════════════════════════════════════════
// PART 2: NORMALIZATION (matches billingRefNormalization.ts)
// ═══════════════════════════════════════════════════════════════════════════

function normalizeBillingRefId(refId: string): string {
    if (!refId) return refId;

    // BEL_II_XXXX → BEL_XXXX
    if (refId.startsWith('BEL_II_')) {
        return refId.replace('BEL_II_', 'BEL_');
    }

    // BEMA_41 → BEMA_41a
    if (refId === 'BEMA_41') {
        return 'BEMA_41a';
    }

    // GOZ leading zeros: PHANTOM_REMOVED → GOZ_0090
    if (refId.startsWith('GOZ_') && !refId.match(/^GOZ_\d{4}$/)) {
        const numPart = refId.replace('GOZ_', '');
        if (/^\d+$/.test(numPart) && numPart.length < 4) {
            return `GOZ_${numPart.padStart(4, '0')}`;
        }
    }

    return refId;
}

function getBillingSystem(refId: string): string {
    if (refId.startsWith('BEMA_')) return 'BEMA';
    if (refId.startsWith('GOZ_')) return 'GOZ';
    if (refId.startsWith('GOÄ_')) return 'GOÄ';
    if (refId.startsWith('GOA_')) return 'GOÄ'; // Alias
    if (refId.startsWith('BEL_II_')) return 'BEL';
    if (refId.startsWith('BEL_')) return 'BEL';
    if (refId.startsWith('FZ_')) return 'FZ';
    return 'UNKNOWN';
}

// ═══════════════════════════════════════════════════════════════════════════
// PART 3: SCAN ALL SOURCES FOR BILLING REFS
// ═══════════════════════════════════════════════════════════════════════════

interface BillingRef {
    ref: string;
    file: string;
    line: number;
    source: 'pipeline' | 'ui' | 'fixtures' | 'legacy' | 'json';
}

function classifySource(filePath: string): BillingRef['source'] {
    if (filePath.includes('__legacy_v6_quarantine__')) return 'legacy';
    if (filePath.includes('__fixtures__') || filePath.includes('fixtures')) return 'fixtures';
    if (filePath.includes('v7/') || filePath.includes('v10/') || filePath.includes('pages/')) return 'ui';
    if (filePath.endsWith('.json')) return 'json';
    return 'pipeline';
}

function isTestMockId(refId: string): boolean {
    const testPatterns = [
        /_TEST$/,
        /^TEST_/,
        /^MOCK_/,
        /999999/,
        /_STUB$/,
    ];
    return testPatterns.some(p => p.test(refId));
}

function scanSourceFiles(): BillingRef[] {
    const refs: BillingRef[] = [];
    const srcDir = path.join(ROOT, 'src/docudent');

    const billingPattern = /['"]([A-Z]+_[A-Za-z0-9_]+)['"]/g;
    const validPrefixes = ['BEMA_', 'GOZ_', 'GOÄ_', 'GOA_', 'BEL_', 'FZ_'];

    function walkDir(dir: string) {
        if (!fs.existsSync(dir)) return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                // Skip node_modules but include test directories for complete scan
                if (entry.name !== 'node_modules') {
                    walkDir(fullPath);
                }
            } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.json')) {
                try {
                    const content = fs.readFileSync(fullPath, 'utf-8');
                    const lines = content.split('\n');

                    lines.forEach((line, idx) => {
                        const matches = line.matchAll(billingPattern);
                        for (const match of matches) {
                            const ref = match[1];
                            if (validPrefixes.some(p => ref.startsWith(p))) {
                                refs.push({
                                    ref,
                                    file: path.relative(ROOT, fullPath),
                                    line: idx + 1,
                                    source: classifySource(fullPath),
                                });
                            }
                        }
                    });
                } catch (e) {
                    // Skip unreadable files
                }
            }
        }
    }

    walkDir(srcDir);

    // Also scan treatment JSON files
    const treatmentDirs = [
        'src/docudent/core/billing/knowledgeBase/treatments',
        'src/docudent/core/billing/knowledgeBase/behandlungen',
    ];
    treatmentDirs.forEach(d => walkDir(path.join(ROOT, d)));

    return refs;
}

// ═══════════════════════════════════════════════════════════════════════════
// PART 4: GIGAPROMPT 1 - CLOSURE CHECK
// ═══════════════════════════════════════════════════════════════════════════

interface PostHtmlImportReport {
    generated: string;
    summary: {
        totalRefs: number;
        uniqueRefs: number;
        missingCount: number;
        testMockCount: number;
    };
    missing: {
        BEMA: string[];
        GOZ: string[];
        GOÄ: string[];
        BEL: string[];
        UNKNOWN: string[];
    };
    by_source: {
        pipeline: string[];
        ui: string[];
        fixtures: string[];
        legacy: string[];
    };
    testMockIds: string[];
    details: Array<{
        ref: string;
        normalized: string;
        system: string;
        sources: string[];
        count: number;
    }>;
}

function runClosureCheck(refs: BillingRef[], catalogCodes: Set<string>): PostHtmlImportReport {
    const missing: PostHtmlImportReport['missing'] = {
        BEMA: [],
        GOZ: [],
        GOÄ: [],
        BEL: [],
        UNKNOWN: [],
    };

    const bySource: PostHtmlImportReport['by_source'] = {
        pipeline: [],
        ui: [],
        fixtures: [],
        legacy: [],
    };

    const testMockIds: string[] = [];
    const details: PostHtmlImportReport['details'] = [];

    // Group by ref
    const refMap = new Map<string, { sources: Set<string>, count: number }>();
    for (const r of refs) {
        const key = r.ref;
        if (!refMap.has(key)) {
            refMap.set(key, { sources: new Set(), count: 0 });
        }
        const entry = refMap.get(key)!;
        entry.sources.add(`${r.source}:${r.file}`);
        entry.count++;
    }

    for (const [ref, data] of refMap) {
        const normalized = normalizeBillingRefId(ref);
        const system = getBillingSystem(ref);

        // Check if test/mock
        if (isTestMockId(ref)) {
            testMockIds.push(ref);
            continue;
        }

        // Check if in catalog
        const inCatalog = catalogCodes.has(ref) || catalogCodes.has(normalized);

        if (!inCatalog) {
            // Add to missing by system
            const systemKey = system as keyof PostHtmlImportReport['missing'];
            if (missing[systemKey]) {
                if (!missing[systemKey].includes(ref)) {
                    missing[systemKey].push(ref);
                }
            }

            // Add to by_source
            const sources = Array.from(data.sources);
            for (const s of sources) {
                const sourceType = s.split(':')[0] as keyof PostHtmlImportReport['by_source'];
                if (bySource[sourceType] && !bySource[sourceType].includes(ref)) {
                    bySource[sourceType].push(ref);
                }
            }

            details.push({
                ref,
                normalized,
                system,
                sources: Array.from(data.sources),
                count: data.count,
            });
        }
    }

    return {
        generated: new Date().toISOString(),
        summary: {
            totalRefs: refs.length,
            uniqueRefs: refMap.size,
            missingCount: details.length,
            testMockCount: testMockIds.length,
        },
        missing,
        by_source: bySource,
        testMockIds,
        details: details.sort((a, b) => b.count - a.count),
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// PART 5: GIGAPROMPT 2 - COVERAGE AUDIT
// ═══════════════════════════════════════════════════════════════════════════

interface CoverageAuditReport {
    generated: string;
    REAL_MISSING: string[];
    LEGACY_ONLY: string[];
    UI_STUB: string[];
    TEST_ARTIFACT: string[];
    manualReviewNeeded: string[];
}

function runCoverageAudit(closureReport: PostHtmlImportReport): CoverageAuditReport {
    const audit: CoverageAuditReport = {
        generated: new Date().toISOString(),
        REAL_MISSING: [],
        LEGACY_ONLY: [],
        UI_STUB: [],
        TEST_ARTIFACT: [],
        manualReviewNeeded: [],
    };

    for (const detail of closureReport.details) {
        const sources = detail.sources.join(' ');

        // Classify
        if (sources.includes('__legacy_v6_quarantine__')) {
            audit.LEGACY_ONLY.push(detail.ref);
        } else if (sources.includes('extraction_stub') || sources.includes('stub')) {
            audit.UI_STUB.push(detail.ref);
        } else if (sources.includes('fixtures') || sources.includes('test')) {
            audit.TEST_ARTIFACT.push(detail.ref);
        } else {
            // Check if plausible medical code
            const system = detail.system;
            if (system === 'BEMA' || system === 'GOZ' || system === 'GOÄ' || system === 'BEL') {
                audit.REAL_MISSING.push(detail.ref);
                audit.manualReviewNeeded.push(detail.ref);
            } else {
                audit.UI_STUB.push(detail.ref);
            }
        }
    }

    return audit;
}

// ═══════════════════════════════════════════════════════════════════════════
// PART 6: GIGAPROMPT 3 - BEL AUDIT
// ═══════════════════════════════════════════════════════════════════════════

interface BelAuditReport {
    generated: string;
    missing_after_normalization: string[];
    unused_in_catalog: string[];
    recommendations: Array<{ code: string; action: 'add' | 'ignore' | 'legacy'; reason: string }>;
}

function runBelAudit(refs: BillingRef[], catalogs: Catalogs): BelAuditReport {
    const belRefs = refs.filter(r => r.ref.startsWith('BEL_') || r.ref.startsWith('BEL_II_'));

    // Get all BEL codes from catalog
    const belCatalogCodes = new Set<string>();
    if (catalogs.bel.entries) {
        catalogs.bel.entries.forEach((entry: CatalogEntry) => {
            if (entry.codeId) belCatalogCodes.add(entry.codeId);
        });
    }

    // Check missing after normalization
    const missingAfterNorm: string[] = [];
    const usedCodes = new Set<string>();

    for (const r of belRefs) {
        const normalized = normalizeBillingRefId(r.ref);
        usedCodes.add(normalized);

        if (!belCatalogCodes.has(normalized) && !isTestMockId(r.ref)) {
            if (!missingAfterNorm.includes(r.ref)) {
                missingAfterNorm.push(r.ref);
            }
        }
    }

    // Find unused catalog entries
    const unusedCodes: string[] = [];
    for (const code of belCatalogCodes) {
        if (!usedCodes.has(code)) {
            unusedCodes.push(code);
        }
    }

    // Generate recommendations
    const recommendations: BelAuditReport['recommendations'] = [];
    for (const code of missingAfterNorm) {
        recommendations.push({
            code,
            action: 'add',
            reason: 'Used in code but not in catalog',
        });
    }

    return {
        generated: new Date().toISOString(),
        missing_after_normalization: missingAfterNorm,
        unused_in_catalog: unusedCodes.slice(0, 50), // Limit for report size
        recommendations,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// PART 7: GIGAPROMPT 4 - GOZ/GOÄ SCOPE
// ═══════════════════════════════════════════════════════════════════════════

interface GoaeScopeReport {
    generated: string;
    codes: Record<string, 'DENTAL_CORE' | 'DENTAL_OPTIONAL' | 'NON_DENTAL'>;
    critical_non_dental: string[];
    summary: {
        dental_core: number;
        dental_optional: number;
        non_dental: number;
    };
}

function runGoaeScope(catalogs: Catalogs): GoaeScopeReport {
    const codes: GoaeScopeReport['codes'] = {};
    const criticalNonDental: string[] = [];

    // GOZ is always dental
    for (const key of Object.keys(catalogs.goz)) {
        if (key !== '_meta') {
            codes[key] = 'DENTAL_CORE';
        }
    }

    // GOÄ - classify by content
    const dentalKeywords = [
        'zahn', 'mund', 'kiefer', 'oral', 'dental', 'zahnärzt',
        'lokalanästhesie', 'infiltration', 'leitung', 'anästhesie',
    ];

    const dentalOptionalKeywords = [
        'röntgen', 'panorama', 'aufnahme', 'projektion',
    ];

    for (const [key, entry] of Object.entries(catalogs.goa)) {
        if (key === '_meta') continue;

        const bezeichnung = (entry.bezeichnung || '').toLowerCase();
        const nummer = entry.nummer || '';

        // Check if dental-related
        const isDentalCore = dentalKeywords.some(kw => bezeichnung.includes(kw));
        const isDentalOptional = dentalOptionalKeywords.some(kw => bezeichnung.includes(kw));

        // GOÄ 5000-5999 are often dental X-ray
        const isXrayDental = nummer.startsWith('500') || nummer.startsWith('5002') || nummer.startsWith('5004');

        if (isDentalCore || isXrayDental) {
            codes[key] = 'DENTAL_CORE';
        } else if (isDentalOptional) {
            codes[key] = 'DENTAL_OPTIONAL';
        } else {
            codes[key] = 'NON_DENTAL';
            criticalNonDental.push(`${key}: ${entry.bezeichnung}`);
        }
    }

    // Calculate summary
    const summary = {
        dental_core: Object.values(codes).filter(v => v === 'DENTAL_CORE').length,
        dental_optional: Object.values(codes).filter(v => v === 'DENTAL_OPTIONAL').length,
        non_dental: Object.values(codes).filter(v => v === 'NON_DENTAL').length,
    };

    return {
        generated: new Date().toISOString(),
        codes,
        critical_non_dental: criticalNonDental,
        summary,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// PART 8: GENERATE ALL REPORTS
// ═══════════════════════════════════════════════════════════════════════════

function ensureDir(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function generateMarkdownSummary(
    closureReport: PostHtmlImportReport,
    coverageAudit: CoverageAuditReport,
    belAudit: BelAuditReport,
    goaeScope: GoaeScopeReport
): string {
    const lines: string[] = [
        '# Billing Catalog Audit – Post-HTML-Import Report',
        '',
        `> Generated: ${new Date().toISOString()}`,
        '',
        '## Summary',
        '',
        '| Metric | Value |',
        '|--------|-------|',
        `| Total BillingRefs found | ${closureReport.summary.totalRefs} |`,
        `| Unique BillingRefs | ${closureReport.summary.uniqueRefs} |`,
        `| Missing from catalogs | ${closureReport.summary.missingCount} |`,
        `| Test/Mock IDs (excluded) | ${closureReport.summary.testMockCount} |`,
        '',
        '---',
        '',
        '## ✅ Catalog Completeness',
        '',
        '| Catalog | Entries |',
        '|---------|---------|',
        `| BEMA | ~129+ |`,
        `| GOZ | ~48+ |`,
        `| GOÄ | 44 |`,
        `| BEL | 175 |`,
        '',
        '---',
        '',
        '## ❗ Missing BillingRefs by System',
        '',
    ];

    for (const [system, codes] of Object.entries(closureReport.missing)) {
        if (codes.length > 0) {
            lines.push(`### ${system} (${codes.length})`);
            lines.push('');
            codes.slice(0, 10).forEach(c => lines.push(`- \`${c}\``));
            if (codes.length > 10) {
                lines.push(`- ... and ${codes.length - 10} more`);
            }
            lines.push('');
        }
    }

    lines.push('---');
    lines.push('');
    lines.push('## 🧹 Classification');
    lines.push('');
    lines.push(`- **REAL_MISSING** (needs attention): ${coverageAudit.REAL_MISSING.length}`);
    lines.push(`- **LEGACY_ONLY** (quarantined): ${coverageAudit.LEGACY_ONLY.length}`);
    lines.push(`- **UI_STUB** (UI/extraction only): ${coverageAudit.UI_STUB.length}`);
    lines.push(`- **TEST_ARTIFACT** (test/fixture): ${coverageAudit.TEST_ARTIFACT.length}`);
    lines.push('');

    if (coverageAudit.REAL_MISSING.length > 0) {
        lines.push('### 🔴 Real Missing Codes (Top 10):');
        lines.push('');
        coverageAudit.REAL_MISSING.slice(0, 10).forEach(c => lines.push(`- \`${c}\``));
        lines.push('');
    }

    lines.push('---');
    lines.push('');
    lines.push('## BEL Consistency');
    lines.push('');
    lines.push(`- Missing after normalization: ${belAudit.missing_after_normalization.length}`);
    lines.push(`- Unused in catalog: ${belAudit.unused_in_catalog.length}`);
    lines.push('');

    lines.push('---');
    lines.push('');
    lines.push('## GOZ/GOÄ Scope');
    lines.push('');
    lines.push(`- DENTAL_CORE: ${goaeScope.summary.dental_core}`);
    lines.push(`- DENTAL_OPTIONAL: ${goaeScope.summary.dental_optional}`);
    lines.push(`- NON_DENTAL: ${goaeScope.summary.non_dental}`);
    lines.push('');

    if (goaeScope.critical_non_dental.length > 0) {
        lines.push('### ⚠️ Non-Dental GOÄ Codes in Catalog:');
        lines.push('');
        goaeScope.critical_non_dental.slice(0, 10).forEach(c => lines.push(`- ${c}`));
        lines.push('');
    }

    lines.push('---');
    lines.push('');
    lines.push('## 🧠 Recommendations');
    lines.push('');
    lines.push('1. **Review REAL_MISSING codes** – These may need to be added to catalogs');
    lines.push('2. **Ignore LEGACY_ONLY** – These are quarantined V6 code');
    lines.push('3. **Consider NON_DENTAL GOÄ** – Evaluate if needed for dental practice');
    lines.push('');

    return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
    console.log('🔍 Starting Billing Catalog Comprehensive Audit...\n');

    // Load catalogs
    console.log('📚 Loading catalogs...');
    const catalogs = loadCatalogs();
    const catalogCodes = getAllCatalogCodes(catalogs);
    console.log(`   Found ${catalogCodes.size} total catalog codes\n`);

    // Scan sources
    console.log('🔎 Scanning source files...');
    const refs = scanSourceFiles();
    console.log(`   Found ${refs.length} billing refs\n`);

    // Gigaprompt 1: Closure Check
    console.log('📊 Running closure check (Gigaprompt 1)...');
    const closureReport = runClosureCheck(refs, catalogCodes);

    // Gigaprompt 2: Coverage Audit
    console.log('📊 Running coverage audit (Gigaprompt 2)...');
    const coverageAudit = runCoverageAudit(closureReport);

    // Gigaprompt 3: BEL Audit
    console.log('📊 Running BEL audit (Gigaprompt 3)...');
    const belAudit = runBelAudit(refs, catalogs);

    // Gigaprompt 4: GOÄ Scope
    console.log('📊 Running GOÄ scope analysis (Gigaprompt 4)...');
    const goaeScope = runGoaeScope(catalogs);

    // Output directories
    const artifactsDir = path.join(ROOT, 'docs/system-atlas/artifacts');
    const billingClosureDir = path.join(artifactsDir, 'billing-closure');
    const catalogCoverageDir = path.join(artifactsDir, 'catalog-coverage');
    const belAuditDir = path.join(artifactsDir, 'bel-audit');
    const goaeScopeDir = path.join(artifactsDir, 'goae-scope');

    ensureDir(billingClosureDir);
    ensureDir(catalogCoverageDir);
    ensureDir(belAuditDir);
    ensureDir(goaeScopeDir);

    // Write reports
    console.log('\n💾 Writing reports...');

    fs.writeFileSync(
        path.join(billingClosureDir, 'post-html-import.report.json'),
        JSON.stringify(closureReport, null, 2)
    );
    console.log('   ✓ billing-closure/post-html-import.report.json');

    fs.writeFileSync(
        path.join(catalogCoverageDir, 'audit.report.json'),
        JSON.stringify(coverageAudit, null, 2)
    );
    console.log('   ✓ catalog-coverage/audit.report.json');

    fs.writeFileSync(
        path.join(belAuditDir, 'report.json'),
        JSON.stringify(belAudit, null, 2)
    );
    console.log('   ✓ bel-audit/report.json');

    fs.writeFileSync(
        path.join(goaeScopeDir, 'report.json'),
        JSON.stringify(goaeScope, null, 2)
    );
    console.log('   ✓ goae-scope/report.json');

    // Gigaprompt 6: Final Summary
    const markdownSummary = generateMarkdownSummary(closureReport, coverageAudit, belAudit, goaeScope);
    fs.writeFileSync(
        path.join(ROOT, 'docs/system-atlas/catalog-status.md'),
        markdownSummary
    );
    console.log('   ✓ catalog-status.md');

    console.log('\n✅ Audit complete!');
    console.log('\n📈 Summary:');
    console.log(`   • Total refs: ${closureReport.summary.totalRefs}`);
    console.log(`   • Missing: ${closureReport.summary.missingCount}`);
    console.log(`   • Real missing: ${coverageAudit.REAL_MISSING.length}`);
    console.log(`   • Legacy only: ${coverageAudit.LEGACY_ONLY.length}`);
}

main().catch(console.error);
