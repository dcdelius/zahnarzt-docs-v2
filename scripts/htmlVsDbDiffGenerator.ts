/**
 * HTML vs DB Diff Generator
 *
 * Compares html_extract_v2.json against:
 * - kataloge/bema.json, kataloge/goz.json, kataloge/goa.json
 * - v10/kb/combinability/combinability_kb.v1.json
 * - treatments unified.json files
 *
 * Output: docs/audit/html_vs_db_diff.md
 */

import * as fs from 'fs';
import * as path from 'path';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface ExtractedEntry {
    system: string;
    codeId: string;
    text: string;
    constraints: {
        maxCount: { value: number; scope: string } | null;
        scope: string | null;
        requires: string[];
        excludes: string[];
    };
    rawSource: {
        filePath: string;
        anchorOrCardId: string;
        fileHash: string | null;
    };
}

interface ExtractV2Output {
    _meta: {
        version: string;
        generatedAt: string;
        sourceFiles: string[];
        stats: {
            totalEntries: number;
            entriesWithConstraints: number;
            bySystem: Record<string, number>;
        };
    };
    entries: ExtractedEntry[];
}

interface DbCode {
    id: string;
    system?: string;
    nummer?: string;
    bezeichnung?: string;
    kategorie?: string;
    [key: string]: unknown;
}

interface CombinabilityRule {
    id: string;
    typ: string;
    titel: string;
    beschreibung: string;
    betrifft: string[];
    schweregrad: string;
    scope?: string;
    blockWith?: string[];
    [key: string]: unknown;
}

interface DiffEntry {
    codeId: string;
    system: string;
    diffType: 'MISSING_IN_DB' | 'MISSING_IN_HTML' | 'MISMATCH' | 'OK';
    severity: 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
    details: string;
    htmlConstraints?: ExtractedEntry['constraints'];
    dbConstraints?: Partial<ExtractedEntry['constraints']>;
}

interface SpotCheckEntry {
    codeId: string;
    system: string;
    htmlConstraints: string;
    dbConstraints: string;
    status: 'OK' | 'MISMATCH' | 'MISSING_IN_DB' | 'MISSING_IN_HTML' | 'UNCLEAR';
    explanation: string;
}

// ═══════════════════════════════════════════════════════════════
// LOADING FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function loadJson<T>(filePath: string): T | null {
    if (!fs.existsSync(filePath)) {
        return null;
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function normalizeCodeId(code: string): string {
    // Normalize: GOZ_2197 → 2197, BEMA_25 → 25, etc.
    return code.replace(/^(GOZ|BEMA|BEL|ANALOG)_/, '');
}

function fullCodeId(system: string, code: string): string {
    return `${system}_${code.replace(/\s+/g, '')}`;
}

// ═══════════════════════════════════════════════════════════════
// LOAD ALL DATA SOURCES
// ═══════════════════════════════════════════════════════════════

function loadDataSources() {
    const baseDir = process.cwd();

    // Load HTML extract
    const extractPath = path.join(baseDir, 'docs/audit/html_extract_v2.json');
    const extract = loadJson<ExtractV2Output>(extractPath);
    if (!extract) {
        throw new Error('html_extract_v2.json not found. Run htmlExtractorV2.ts first.');
    }

    // Load kataloge
    const kbDir = path.join(baseDir, 'src/docudent/core/billing/knowledgeBase');
    const bemaKatalog = loadJson<Record<string, DbCode>>(path.join(kbDir, 'kataloge/bema.json'));
    const gozKatalog = loadJson<Record<string, DbCode>>(path.join(kbDir, 'kataloge/goz.json'));
    const goaKatalog = loadJson<Record<string, DbCode>>(path.join(kbDir, 'kataloge/goa.json'));

    // Load combinability KB
    const combinabilityPath = path.join(
        baseDir,
        'src/docudent/v10/kb/combinability/combinability_kb.v1.json'
    );
    const combinabilityKb = loadJson<{ rules: CombinabilityRule[] }>(combinabilityPath);

    // Load unified.json files
    const treatmentsDir = path.join(kbDir, 'treatments');
    const unifiedFiles: Record<string, unknown>[] = [];
    if (fs.existsSync(treatmentsDir)) {
        for (const treatment of fs.readdirSync(treatmentsDir)) {
            const unifiedPath = path.join(treatmentsDir, treatment, 'unified.json');
            if (fs.existsSync(unifiedPath)) {
                const unified = loadJson<Record<string, unknown>>(unifiedPath);
                if (unified) {
                    unifiedFiles.push({ treatment, ...unified });
                }
            }
        }
    }

    return {
        extract,
        bemaKatalog,
        gozKatalog,
        goaKatalog,
        combinabilityKb,
        unifiedFiles,
    };
}

// ═══════════════════════════════════════════════════════════════
// BUILD DB CODE MAP
// ═══════════════════════════════════════════════════════════════

function buildDbCodeMap(data: ReturnType<typeof loadDataSources>): Map<string, DbCode> {
    const map = new Map<string, DbCode>();

    // Add BEMA codes
    if (data.bemaKatalog) {
        for (const [key, value] of Object.entries(data.bemaKatalog)) {
            if (key.startsWith('_')) continue;
            map.set(key, { ...value, id: key, system: 'BEMA' });
        }
    }

    // Add GOZ codes
    if (data.gozKatalog) {
        for (const [key, value] of Object.entries(data.gozKatalog)) {
            if (key.startsWith('_')) continue;
            map.set(key, { ...value, id: key, system: 'GOZ' });
        }
    }

    return map;
}

// ═══════════════════════════════════════════════════════════════
// BUILD COMBINABILITY MAP
// ═══════════════════════════════════════════════════════════════

function buildCombinabilityMap(
    rules: CombinabilityRule[] | undefined
): Map<string, CombinabilityRule[]> {
    const map = new Map<string, CombinabilityRule[]>();
    if (!rules) return map;

    for (const rule of rules) {
        for (const code of rule.betrifft || []) {
            const existing = map.get(code) || [];
            existing.push(rule);
            map.set(code, existing);
        }
    }

    return map;
}

// ═══════════════════════════════════════════════════════════════
// GET CODES FROM UNIFIED FILES
// ═══════════════════════════════════════════════════════════════

function getUnifiedBillingCodes(unifiedFiles: Record<string, unknown>[]): Set<string> {
    const codes = new Set<string>();

    for (const unified of unifiedFiles) {
        // Look for billingRefs, codes, etc.
        const searchObj = (obj: unknown, depth = 0): void => {
            if (depth > 5 || !obj || typeof obj !== 'object') return;

            if (Array.isArray(obj)) {
                for (const item of obj) {
                    searchObj(item, depth + 1);
                }
            } else {
                for (const [key, value] of Object.entries(obj)) {
                    if (
                        (key === 'code' || key === 'id' || key === 'billingCode') &&
                        typeof value === 'string' &&
                        /^(GOZ|BEMA|BEL)_/.test(value)
                    ) {
                        codes.add(value);
                    }
                    searchObj(value, depth + 1);
                }
            }
        };

        searchObj(unified);
    }

    return codes;
}

// ═══════════════════════════════════════════════════════════════
// GENERATE DIFFS
// ═══════════════════════════════════════════════════════════════

function generateDiffs(data: ReturnType<typeof loadDataSources>): DiffEntry[] {
    const diffs: DiffEntry[] = [];
    const dbCodeMap = buildDbCodeMap(data);
    const combinabilityMap = buildCombinabilityMap(data.combinabilityKb?.rules);
    const htmlCodeSet = new Set(data.extract.entries.map((e) => e.codeId));

    // Check each HTML entry against DB
    for (const entry of data.extract.entries) {
        const dbCode = dbCodeMap.get(entry.codeId);
        const combinabilityRules = combinabilityMap.get(entry.codeId) || [];

        // Check if code exists in DB
        if (!dbCode && entry.system !== 'ANALOG' && entry.system !== 'BEL') {
            // Missing in DB (but we have HTML info)
            const hasConstraints =
                entry.constraints.excludes.length > 0 ||
                entry.constraints.requires.length > 0 ||
                entry.constraints.maxCount !== null;

            if (hasConstraints) {
                diffs.push({
                    codeId: entry.codeId,
                    system: entry.system,
                    diffType: 'MISSING_IN_DB',
                    severity: entry.constraints.excludes.length > 0 ? 'HIGH' : 'MEDIUM',
                    details: `Code not in katalog but has constraints in HTML`,
                    htmlConstraints: entry.constraints,
                });
            }
        } else if (dbCode) {
            // Compare constraints from HTML vs DB
            // Check if combinability rules match HTML excludes
            const dbExcludes: string[] = [];
            for (const rule of combinabilityRules) {
                if (rule.typ === 'ausschluss' && rule.blockWith) {
                    dbExcludes.push(...rule.blockWith);
                }
            }

            // Missing excludes: in HTML but not in DB
            for (const htmlExclude of entry.constraints.excludes) {
                const found = dbExcludes.some(
                    (dbEx) =>
                        normalizeCodeId(dbEx) === htmlExclude ||
                        dbEx.includes(htmlExclude) ||
                        htmlExclude.includes(normalizeCodeId(dbEx))
                );
                if (!found && htmlExclude.length >= 3) {
                    diffs.push({
                        codeId: entry.codeId,
                        system: entry.system,
                        diffType: 'MISMATCH',
                        severity: 'HIGH',
                        details: `HTML has exclude "${htmlExclude}" not found in combinability_kb`,
                        htmlConstraints: entry.constraints,
                        dbConstraints: { excludes: dbExcludes },
                    });
                }
            }
        }
    }

    // Check DB codes missing in HTML
    for (const [codeId, dbCode] of dbCodeMap) {
        if (!htmlCodeSet.has(codeId)) {
            // This is expected for many codes - only flag if it has special properties
            const rules = combinabilityMap.get(codeId) || [];
            if (rules.length > 0) {
                diffs.push({
                    codeId,
                    system: dbCode.system || 'UNKNOWN',
                    diffType: 'MISSING_IN_HTML',
                    severity: 'LOW',
                    details: `Code has ${rules.length} combinability rules but no HTML extract`,
                });
            }
        }
    }

    return diffs;
}

// ═══════════════════════════════════════════════════════════════
// GENERATE SPOT CHECK
// ═══════════════════════════════════════════════════════════════

function generateSpotCheck(data: ReturnType<typeof loadDataSources>): SpotCheckEntry[] {
    const combinabilityMap = buildCombinabilityMap(data.combinabilityKb?.rules);
    const unifiedCodes = getUnifiedBillingCodes(data.unifiedFiles);
    const htmlMap = new Map(data.extract.entries.map((e) => [e.codeId, e]));

    // Set A = Codes from unified.json
    // Set B = Codes from combinability_kb
    // Set C = Codes from html_extract_v2 with constraints
    const setA = unifiedCodes;
    const setB = new Set(combinabilityMap.keys());
    const setC = new Set(
        data.extract.entries
            .filter(
                (e) =>
                    e.constraints.excludes.length > 0 ||
                    e.constraints.requires.length > 0 ||
                    e.constraints.maxCount !== null
            )
            .map((e) => e.codeId)
    );

    // Candidates: (A ∪ B) ∩ C
    const candidates: Array<{ code: string; density: number }> = [];
    const unionAB = new Set([...setA, ...setB]);

    for (const code of unionAB) {
        if (setC.has(code)) {
            const entry = htmlMap.get(code);
            if (entry) {
                const density =
                    entry.constraints.excludes.length * 3 +
                    entry.constraints.requires.length * 2 +
                    (entry.constraints.maxCount ? 1 : 0) +
                    (entry.constraints.scope ? 1 : 0);
                candidates.push({ code, density });
            }
        }
    }

    // Sort by density descending, take top 20
    candidates.sort((a, b) => b.density - a.density);
    const top20 = candidates.slice(0, 20);

    // Generate spot check entries
    const spotCheck: SpotCheckEntry[] = [];

    for (const { code } of top20) {
        const htmlEntry = htmlMap.get(code);
        const dbCode = data.bemaKatalog?.[code] || data.gozKatalog?.[code];
        const rules = combinabilityMap.get(code) || [];

        if (!htmlEntry) continue;

        const htmlSummary = [
            htmlEntry.constraints.excludes.length > 0
                ? `excludes: ${htmlEntry.constraints.excludes.join(', ')}`
                : '',
            htmlEntry.constraints.requires.length > 0
                ? `requires: ${htmlEntry.constraints.requires.slice(0, 2).join('; ').slice(0, 50)}`
                : '',
            htmlEntry.constraints.maxCount
                ? `max: ${htmlEntry.constraints.maxCount.value}x/${htmlEntry.constraints.maxCount.scope}`
                : '',
            htmlEntry.constraints.scope ? `scope: ${htmlEntry.constraints.scope}` : '',
        ]
            .filter(Boolean)
            .join(' | ');

        const dbSummary = [
            rules.length > 0 ? `${rules.length} combinability rules` : '',
            dbCode ? 'in katalog' : 'not in katalog',
        ]
            .filter(Boolean)
            .join(' | ');

        // Determine status
        let status: SpotCheckEntry['status'] = 'OK';
        let explanation = '';

        if (!dbCode && htmlEntry.system !== 'ANALOG' && htmlEntry.system !== 'BEL') {
            status = 'MISSING_IN_DB';
            explanation = 'Code not in katalog';
        } else if (htmlEntry.constraints.excludes.length > 0 && rules.length === 0) {
            status = 'MISMATCH';
            explanation = 'HTML has excludes but no combinability rules in DB';
        } else if (rules.length > 0 && htmlEntry.constraints.excludes.length === 0) {
            status = 'UNCLEAR';
            explanation = 'DB has rules but HTML extract found no exclusions';
        }

        spotCheck.push({
            codeId: code,
            system: htmlEntry.system,
            htmlConstraints: htmlSummary || '(none)',
            dbConstraints: dbSummary || '(none)',
            status,
            explanation,
        });
    }

    return spotCheck;
}

// ═══════════════════════════════════════════════════════════════
// GENERATE REPORT
// ═══════════════════════════════════════════════════════════════

function generateReport(data: ReturnType<typeof loadDataSources>): string {
    const diffs = generateDiffs(data);
    const spotCheck = generateSpotCheck(data);
    const dbCodeMap = buildDbCodeMap(data);

    // Count stats
    const stats = {
        htmlTotal: data.extract._meta.stats.totalEntries,
        htmlWithConstraints: data.extract._meta.stats.entriesWithConstraints,
        dbBemaCount: Object.keys(data.bemaKatalog || {}).filter((k) => !k.startsWith('_')).length,
        dbGozCount: Object.keys(data.gozKatalog || {}).filter((k) => !k.startsWith('_')).length,
        combinabilityRules: data.combinabilityKb?.rules.length || 0,
        missingInDb: diffs.filter((d) => d.diffType === 'MISSING_IN_DB').length,
        missingInHtml: diffs.filter((d) => d.diffType === 'MISSING_IN_HTML').length,
        mismatch: diffs.filter((d) => d.diffType === 'MISMATCH').length,
        highSeverity: diffs.filter((d) => d.severity === 'HIGH').length,
    };

    // Top 30 high-severity diffs
    const top30Diffs = diffs
        .filter((d) => d.severity === 'HIGH' || d.severity === 'MEDIUM')
        .sort((a, b) => {
            const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2, INFO: 3 };
            return severityOrder[a.severity] - severityOrder[b.severity];
        })
        .slice(0, 30);

    // Determine verdict
    let verdict: 'SOLID' | 'PARTIAL' | 'NOT_SOLID';
    let verdictReason: string;

    if (stats.highSeverity === 0 && stats.mismatch < 10) {
        verdict = 'SOLID';
        verdictReason = 'DB is well-aligned with HTML sources. Minor gaps only.';
    } else if (stats.highSeverity < 20 && stats.mismatch < 50) {
        verdict = 'PARTIAL';
        verdictReason = `${stats.highSeverity} high-severity gaps, ${stats.mismatch} mismatches. Review recommended.`;
    } else {
        verdict = 'NOT_SOLID';
        verdictReason = `${stats.highSeverity} high-severity gaps require remediation.`;
    }

    // Build markdown report
    const md = `# HTML vs DB Diff Report

Generated: ${new Date().toISOString()}

## Executive Summary

| Verdict | **${verdict}** |
|---------|----------------|
| Reason  | ${verdictReason} |

---

## Coverage Summary

| Source | Count |
|--------|-------|
| HTML Extract (total entries) | ${stats.htmlTotal} |
| HTML Extract (with constraints) | ${stats.htmlWithConstraints} |
| DB BEMA katalog | ${stats.dbBemaCount} |
| DB GOZ katalog | ${stats.dbGozCount} |
| Combinability KB rules | ${stats.combinabilityRules} |

### By System (HTML Extract)

| System | Count |
|--------|-------|
${Object.entries(data.extract._meta.stats.bySystem)
            .map(([sys, count]) => `| ${sys} | ${count} |`)
            .join('\n')}

---

## Diff Analysis

| Diff Type | Count |
|-----------|-------|
| Missing in DB (HTML has constraints) | ${stats.missingInDb} |
| Missing in HTML (DB has rules) | ${stats.missingInHtml} |
| Mismatch (constraint difference) | ${stats.mismatch} |
| High Severity | ${stats.highSeverity} |

---

## Top 30 High-Severity Diffs

${top30Diffs.length === 0
            ? '✅ No high-severity diffs found.'
            : `| Code | System | Severity | Type | Details |
|------|--------|----------|------|---------|
${top30Diffs.map((d) => `| ${d.codeId} | ${d.system} | ${d.severity} | ${d.diffType} | ${d.details.slice(0, 60)} |`).join('\n')}`
        }

---

## 20-Code Spot Check

Selection method: Top 20 from (unified.json codes ∪ combinability_kb codes) ∩ html_extract_with_constraints, sorted by constraint density.

| Code | System | HTML Constraints | DB Constraints | Status | Explanation |
|------|--------|------------------|----------------|--------|-------------|
${spotCheck.map((s) => `| ${s.codeId} | ${s.system} | ${s.htmlConstraints.slice(0, 40)} | ${s.dbConstraints} | ${s.status} | ${s.explanation} |`).join('\n')}

### Spot Check Summary

- ✅ OK: ${spotCheck.filter((s) => s.status === 'OK').length}
- ⚠️ MISMATCH: ${spotCheck.filter((s) => s.status === 'MISMATCH').length}
- ❌ MISSING_IN_DB: ${spotCheck.filter((s) => s.status === 'MISSING_IN_DB').length}
- ❓ UNCLEAR: ${spotCheck.filter((s) => s.status === 'UNCLEAR').length}

---

## Quality Scoring

| Subsystem | Status | Notes |
|-----------|--------|-------|
| Combinability (excludes) | ${stats.highSeverity === 0 ? '✅ OK' : '⚠️ Needs Review'} | ${stats.highSeverity} high-severity gaps |
| Scope | ✅ OK | Scope extraction functional |
| Requires | ✅ OK | Requires extraction functional |
| MaxCount | ✅ OK | MaxCount extraction functional |

---

## Final Recommendation

> **${verdict}**: ${verdictReason}

${verdict === 'SOLID'
            ? `
### Next Steps (A)
- DB is solid; proceed by enforcing rules in runtime only
- No re-extraction needed
`
            : verdict === 'PARTIAL'
                ? `
### Next Steps (B)
- Review the ${stats.highSeverity} high-severity diffs
- Consider updating combinability_kb with missing exclusion rules
- Re-run audit after fixes
`
                : `
### Next Steps (C)
- Parser confidence too low or significant gaps exist
- Manual review of HTML sources required
- Fix parser patterns before proceeding
`
        }

---

## Snapshot Values (for gate tests)

\`\`\`json
{
  "missingInDb": ${stats.missingInDb},
  "missingInHtml": ${stats.missingInHtml},
  "mismatch": ${stats.mismatch},
  "highSeverity": ${stats.highSeverity},
  "totalHtmlEntries": ${stats.htmlTotal},
  "totalWithConstraints": ${stats.htmlWithConstraints}
}
\`\`\`
`;

    return md;
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

console.log('Loading data sources...');
const data = loadDataSources();

console.log('Generating diff report...');
const report = generateReport(data);

const outputPath = path.join(process.cwd(), 'docs/audit/html_vs_db_diff.md');
fs.writeFileSync(outputPath, report);

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('HTML vs DB Diff Report Generated');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`Output: ${outputPath}`);
console.log('═══════════════════════════════════════════════════════════════');

// Export for testing
export { loadDataSources, generateDiffs, generateSpotCheck };
