#!/usr/bin/env npx tsx
/**
 * ANALOG Comment Deep Audit V1
 * 
 * Audits:
 * 1. Discovery vs imported counts sanity
 * 2. Code detection validation (no year false positives)
 * 3. Section kind distribution
 * 4. Rule extraction quality
 * 5. Golden code regression
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { loadAnalogCards } from '../src/docudent/core/billing/knowledgeBase/secondary/commentCardStore';
import { loadRules } from '../src/docudent/core/billing/knowledgeBase/secondary/commentRuleExtractor';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface AuditResult {
    meta: {
        auditVersion: string;
        timestamp: string;
    };
    discovery: {
        htmlFilesFound: number;
        cardsImported: number;
        ratio: number;
        issues: string[];
    };
    codeDetection: {
        totalCodes: number;
        patterns: Record<string, number>;
        suspiciousCodes: string[];
    };
    sectionClassification: {
        distribution: Record<string, number>;
        totalSections: number;
        unknownPercentage: number;
        issues: string[];
    };
    ruleExtraction: {
        totalRules: number;
        byType: Record<string, number>;
        unknownPercentage: number;
        issues: string[];
    };
    goldenCodes: {
        code: string;
        status: 'pass' | 'fail';
        expected: any;
        actual: any;
    }[];
    summary: {
        status: 'OK' | 'WARNING' | 'ERROR';
        issues: string[];
    };
}

// ═══════════════════════════════════════════════════════════════
// DISCOVERY AUDIT
// ═══════════════════════════════════════════════════════════════

function auditDiscovery(): AuditResult['discovery'] {
    const sourceDir = path.resolve(__dirname, '../src/docudent/Analogleistungen');

    // Count HTML files
    let htmlFilesFound = 0;
    if (fs.existsSync(sourceDir)) {
        const entries = fs.readdirSync(sourceDir);
        htmlFilesFound = entries.filter(e => e.endsWith('.html')).length;
    }

    const cards = loadAnalogCards();
    const cardsImported = cards.length;
    const ratio = htmlFilesFound > 0 ? cardsImported / htmlFilesFound : 0;

    const issues: string[] = [];

    // Sanity checks
    if (htmlFilesFound === 0) {
        issues.push('No HTML files found in source directory');
    }
    if (cardsImported === 0) {
        issues.push('No cards imported');
    }
    if (ratio < 0.3) {
        issues.push(`Low import ratio: ${(ratio * 100).toFixed(1)}% (expected >30%)`);
    }
    if (ratio > 0.9) {
        issues.push(`Suspiciously high import ratio: ${(ratio * 100).toFixed(1)}% (may include junk files)`);
    }

    return { htmlFilesFound, cardsImported, ratio, issues };
}

// ═══════════════════════════════════════════════════════════════
// CODE DETECTION AUDIT
// ═══════════════════════════════════════════════════════════════

function auditCodeDetection(): AuditResult['codeDetection'] {
    const cards = loadAnalogCards();
    const patterns: Record<string, number> = {
        'ANALOG_ZE_': 0,
        'ANALOG_Kons_': 0,
        'ANALOG_FAL_': 0,
        'ANALOG_Chir_': 0,
        'ANALOG_Impl_': 0,
        'ANALOG_Paro_': 0,
        'ANALOG_KFO_': 0,
        'ANALOG_Aufbiss_': 0,
        'ANALOG_NODE_': 0,  // Fallback pattern (should be 0)
        'other': 0,
    };

    const suspiciousCodes: string[] = [];

    for (const card of cards) {
        let matched = false;
        for (const prefix of Object.keys(patterns)) {
            if (prefix !== 'other' && card.code.startsWith(prefix)) {
                patterns[prefix]++;
                matched = true;
                break;
            }
        }
        if (!matched) {
            patterns['other']++;
        }

        // Check for year false positives
        if (/20\d{2}/.test(card.code)) {
            suspiciousCodes.push(`${card.code} (contains year-like pattern)`);
        }

        // Check for NODE fallback (indicates detection failure)
        if (card.code.includes('_NODE_')) {
            suspiciousCodes.push(`${card.code} (fallback node_id pattern)`);
        }
    }

    return {
        totalCodes: cards.length,
        patterns,
        suspiciousCodes,
    };
}

// ═══════════════════════════════════════════════════════════════
// SECTION CLASSIFICATION AUDIT
// ═══════════════════════════════════════════════════════════════

function auditSectionClassification(): AuditResult['sectionClassification'] {
    const cards = loadAnalogCards();
    const distribution: Record<string, number> = {};
    let totalSections = 0;

    for (const card of cards) {
        for (const section of card.sections || []) {
            const kind = section.kind || 'unknown';
            distribution[kind] = (distribution[kind] || 0) + 1;
            totalSections++;
        }
    }

    const unknownCount = distribution['unknown'] || 0;
    const unknownPercentage = totalSections > 0 ? (unknownCount / totalSections) * 100 : 0;

    const issues: string[] = [];
    if (unknownPercentage > 90) {
        issues.push(`Very high unknown section rate: ${unknownPercentage.toFixed(1)}%`);
    }
    if (totalSections === 0) {
        issues.push('No sections extracted');
    }

    // Sort distribution by count descending
    const sortedDist: Record<string, number> = {};
    Object.entries(distribution)
        .sort((a, b) => b[1] - a[1])
        .forEach(([k, v]) => sortedDist[k] = v);

    return {
        distribution: sortedDist,
        totalSections,
        unknownPercentage,
        issues,
    };
}

// ═══════════════════════════════════════════════════════════════
// RULE EXTRACTION AUDIT
// ═══════════════════════════════════════════════════════════════

function auditRuleExtraction(): AuditResult['ruleExtraction'] {
    const allRules = loadRules();
    const analogRules = allRules.filter(r => (r.system as string) === 'ANALOG');

    const byType: Record<string, number> = {};
    for (const rule of analogRules) {
        byType[rule.conditionType] = (byType[rule.conditionType] || 0) + 1;
    }

    const unknownCount = byType['unknown'] || 0;
    const unknownPercentage = analogRules.length > 0 ? (unknownCount / analogRules.length) * 100 : 0;

    const issues: string[] = [];
    if (analogRules.length === 0) {
        issues.push('No rules extracted from ANALOG cards');
    }
    if (unknownPercentage > 25) {
        issues.push(`High unknown rule rate: ${unknownPercentage.toFixed(1)}% (threshold: 25%)`);
    }
    if (analogRules.length < 50) {
        issues.push(`Low rule count: ${analogRules.length} (expected >= 50)`);
    }

    // Sort byType
    const sortedByType: Record<string, number> = {};
    Object.entries(byType)
        .sort((a, b) => b[1] - a[1])
        .forEach(([k, v]) => sortedByType[k] = v);

    return {
        totalRules: analogRules.length,
        byType: sortedByType,
        unknownPercentage,
        issues,
    };
}

// ═══════════════════════════════════════════════════════════════
// GOLDEN CODE REGRESSION
// ═══════════════════════════════════════════════════════════════

interface GoldenExpectation {
    code: string;
    minSections: number;
    hasAnalogHint: boolean;
    minCrossRefs: number;
    hasCrossRefSystem: string[];
    minRules: number;
}

const GOLDEN_CODES: GoldenExpectation[] = [
    {
        code: 'ANALOG_ZE_02',
        minSections: 3,
        hasAnalogHint: true,
        minCrossRefs: 2,
        hasCrossRefSystem: ['GOZ'],
        minRules: 0,
    },
    {
        code: 'ANALOG_Kons_04',
        minSections: 5,
        hasAnalogHint: true,
        minCrossRefs: 3,
        hasCrossRefSystem: ['GOZ'],
        minRules: 1,
    },
    {
        code: 'ANALOG_FAL_01',
        minSections: 3,
        hasAnalogHint: true,
        minCrossRefs: 1,
        hasCrossRefSystem: ['GOZ'],
        minRules: 0,
    },
    {
        code: 'ANALOG_Paro_03',
        minSections: 20,
        hasAnalogHint: true,
        minCrossRefs: 5,
        hasCrossRefSystem: ['GOZ'],
        minRules: 2,
    },
    {
        code: 'ANALOG_Impl_02',
        minSections: 3,
        hasAnalogHint: true,
        minCrossRefs: 2,
        hasCrossRefSystem: ['GOZ'],
        minRules: 0,
    },
];

function auditGoldenCodes(): AuditResult['goldenCodes'] {
    const cards = loadAnalogCards();
    const allRules = loadRules();
    const results: AuditResult['goldenCodes'] = [];

    for (const expected of GOLDEN_CODES) {
        const card = cards.find(c => c.code === expected.code) as any;
        const rules = allRules.filter(r => r.codePattern === expected.code);

        if (!card) {
            results.push({
                code: expected.code,
                status: 'fail',
                expected,
                actual: { error: 'Card not found' },
            });
            continue;
        }

        const actual = {
            sectionsCount: card.sections?.length || 0,
            hasAnalogHint: !!card.analogHint,
            crossRefsCount: card.crossReferences?.length || 0,
            crossRefSystems: [...new Set((card.crossReferences || []).map((r: any) => r.system))],
            rulesCount: rules.length,
        };

        let status: 'pass' | 'fail' = 'pass';

        if (actual.sectionsCount < expected.minSections) status = 'fail';
        if (expected.hasAnalogHint && !actual.hasAnalogHint) status = 'fail';
        if (actual.crossRefsCount < expected.minCrossRefs) status = 'fail';
        for (const sys of expected.hasCrossRefSystem) {
            if (!actual.crossRefSystems.includes(sys)) status = 'fail';
        }
        if (actual.rulesCount < expected.minRules) status = 'fail';

        results.push({ code: expected.code, status, expected, actual });
    }

    return results;
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
    console.log(`\n╔════════════════════════════════════════════════════════════╗`);
    console.log(`║          ANALOG COMMENT INGESTION DEEP AUDIT               ║`);
    console.log(`╚════════════════════════════════════════════════════════════╝\n`);

    console.log('🔍 1. Discovery Audit...');
    const discovery = auditDiscovery();
    console.log(`   HTML files: ${discovery.htmlFilesFound}`);
    console.log(`   Cards imported: ${discovery.cardsImported}`);
    console.log(`   Ratio: ${(discovery.ratio * 100).toFixed(1)}%`);
    if (discovery.issues.length > 0) {
        console.log(`   ⚠️  Issues: ${discovery.issues.join(', ')}`);
    } else {
        console.log(`   ✓ No issues`);
    }

    console.log('\n🔍 2. Code Detection Validation...');
    const codeDetection = auditCodeDetection();
    console.log(`   Total codes: ${codeDetection.totalCodes}`);
    console.log('   Patterns:');
    for (const [pattern, count] of Object.entries(codeDetection.patterns)) {
        if (count > 0) console.log(`     ${pattern}: ${count}`);
    }
    if (codeDetection.suspiciousCodes.length > 0) {
        console.log(`   ⚠️  Suspicious: ${codeDetection.suspiciousCodes.join(', ')}`);
    } else {
        console.log(`   ✓ No suspicious codes`);
    }

    console.log('\n🔍 3. Section Classification Audit...');
    const sections = auditSectionClassification();
    console.log(`   Total sections: ${sections.totalSections}`);
    console.log('   Distribution:');
    for (const [kind, count] of Object.entries(sections.distribution).slice(0, 5)) {
        console.log(`     ${kind}: ${count}`);
    }
    console.log(`   Unknown %: ${sections.unknownPercentage.toFixed(1)}%`);
    if (sections.issues.length > 0) {
        console.log(`   ⚠️  Issues: ${sections.issues.join(', ')}`);
    } else {
        console.log(`   ✓ No issues`);
    }

    console.log('\n🔍 4. Rule Extraction Quality...');
    const rules = auditRuleExtraction();
    console.log(`   Total ANALOG rules: ${rules.totalRules}`);
    console.log('   By type:');
    for (const [type, count] of Object.entries(rules.byType)) {
        console.log(`     ${type}: ${count}`);
    }
    console.log(`   Unknown %: ${rules.unknownPercentage.toFixed(1)}%`);
    if (rules.issues.length > 0) {
        console.log(`   ⚠️  Issues: ${rules.issues.join(', ')}`);
    } else {
        console.log(`   ✓ No issues`);
    }

    console.log('\n🔍 5. Golden Code Regression...');
    const goldenCodes = auditGoldenCodes();
    for (const gc of goldenCodes) {
        const icon = gc.status === 'pass' ? '✓' : '✗';
        console.log(`   ${icon} ${gc.code}: ${gc.actual.sectionsCount || 0} sections, ${gc.actual.rulesCount || 0} rules`);
    }

    // Compile summary
    const allIssues = [
        ...discovery.issues,
        ...codeDetection.suspiciousCodes.map(c => `Suspicious code: ${c}`),
        ...sections.issues,
        ...rules.issues,
        ...goldenCodes.filter(g => g.status === 'fail').map(g => `Golden code failed: ${g.code}`),
    ];

    let status: 'OK' | 'WARNING' | 'ERROR' = 'OK';
    if (allIssues.length > 0 && allIssues.length <= 3) status = 'WARNING';
    if (allIssues.length > 3) status = 'ERROR';
    if (goldenCodes.some(g => g.status === 'fail')) status = 'WARNING';

    const report: AuditResult = {
        meta: {
            auditVersion: 'v1',
            timestamp: new Date().toISOString(),
        },
        discovery,
        codeDetection,
        sectionClassification: sections,
        ruleExtraction: rules,
        goldenCodes,
        summary: { status, issues: allIssues },
    };

    // Write report
    const reportPath = path.resolve(__dirname, '../src/docudent/__fixtures__/analog_comment_audit_v1.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
    console.log(`\n✓ Audit report written: ${reportPath}`);

    console.log(`\n═══════════════════════════════════════════════════════════`);
    console.log(`AUDIT SUMMARY`);
    console.log(`═══════════════════════════════════════════════════════════\n`);

    if (status === 'OK') {
        console.log(`✅ ANALOG import is CORRECT - no issues detected\n`);
    } else if (status === 'WARNING') {
        console.log(`⚠️  ANALOG import has WARNINGS:\n`);
        allIssues.forEach(i => console.log(`  - ${i}`));
        console.log('');
    } else {
        console.log(`❌ ANALOG import has ERRORS:\n`);
        allIssues.forEach(i => console.log(`  - ${i}`));
        console.log('');
    }

    console.log('✅ Audit complete!\n');
}

main().catch(console.error);
