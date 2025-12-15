#!/usr/bin/env npx tsx
/**
 * BEMA Comment Ingestion Deep Audit
 * 
 * Validates BEMA parsing for correctness:
 * - Discovery traversal
 * - Code detection validation
 * - Section classification distribution
 * - Rule extraction quality checks
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { loadBemaCards, getCommentCardsForCode, getStats } from '../src/docudent/core/billing/knowledgeBase/secondary/commentCardStore';
import { getRulesForCode, loadRules, clearRulesCache } from '../src/docudent/core/billing/knowledgeBase/secondary/commentRuleExtractor';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ═══════════════════════════════════════════════════════════════
// DISCOVERY AUDIT
// ═══════════════════════════════════════════════════════════════

const BEMA_SOURCE_DIR = '/Users/david/dokumaster-ui/src/docudent/BEMA';

function findHtmlFiles(dir: string): string[] {
    const files: string[] = [];
    function walk(currentDir: string) {
        if (!fs.existsSync(currentDir)) return;
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);
            if (entry.isDirectory()) {
                walk(fullPath);
            } else if (entry.isFile() && entry.name.endsWith('.html')) {
                files.push(fullPath);
            }
        }
    }
    walk(dir);
    return files.sort();
}

function getFileStats(filePath: string): { size: number; lines: number; hasMainContent: boolean } {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const size = content.length;
        const lines = content.split('\n').length;
        const hasMainContent = /xaver-absatz|xaver-bel-kommentar|class="N101AD"/i.test(content);
        return { size, lines, hasMainContent };
    } catch {
        return { size: 0, lines: 0, hasMainContent: false };
    }
}

// ═══════════════════════════════════════════════════════════════
// CODE DETECTION VALIDATION
// ═══════════════════════════════════════════════════════════════

// Tricky BEMA patterns that need validation
const TRICKY_PATTERNS = [
    { pattern: /Ä\s*\d+/i, name: 'Ä-codes' },
    { pattern: /IP\s*\d+/i, name: 'IP-codes' },
    { pattern: /FU\s*\d+/i, name: 'FU-codes' },
    { pattern: /\d{2,3}[a-d]?\s*[-–]\s*\d{2,3}/i, name: 'Range (should NOT be a code)' },
];

function validateCodeDetection(cards: any[]): {
    byPattern: Record<string, { count: number; samples: string[] }>;
    suspiciousCodes: string[];
} {
    const byPattern: Record<string, { count: number; samples: string[] }> = {};
    const suspiciousCodes: string[] = [];

    for (const card of cards) {
        const code = card.code;

        // Check for suspicious patterns
        if (/\d{2,3}\s*[-–]\s*\d{2,3}/.test(code)) {
            suspiciousCodes.push(`Range-like code: ${code}`);
        }
        if (/^BEMA_\d{4,}$/.test(code)) {
            suspiciousCodes.push(`Unexpectedly long code: ${code}`);
        }

        // Track pattern matches
        for (const { pattern, name } of TRICKY_PATTERNS) {
            if (pattern.test(code)) {
                if (!byPattern[name]) {
                    byPattern[name] = { count: 0, samples: [] };
                }
                byPattern[name].count++;
                if (byPattern[name].samples.length < 5) {
                    byPattern[name].samples.push(code);
                }
            }
        }
    }

    return { byPattern, suspiciousCodes };
}

// ═══════════════════════════════════════════════════════════════
// SECTION CLASSIFICATION AUDIT
// ═══════════════════════════════════════════════════════════════

function auditSectionClassification(cards: any[]): {
    distribution: Record<string, number>;
    anomalies: string[];
} {
    const distribution: Record<string, number> = {};
    const anomalies: string[] = [];

    for (const card of cards) {
        let hasRealContent = false;
        let unknownCount = 0;
        let totalSections = 0;

        for (const section of card.sections || []) {
            const kind = section.kind || 'unknown';
            distribution[kind] = (distribution[kind] || 0) + 1;
            totalSections++;

            if (kind === 'unknown') {
                unknownCount++;
            }
            if (section.snippet && section.snippet.length > 50) {
                hasRealContent = true;
            }
        }

        // Flag anomalies
        if (totalSections === 0) {
            anomalies.push(`${card.code}: No sections`);
        } else if (!hasRealContent) {
            anomalies.push(`${card.code}: No substantial content`);
        } else if (unknownCount === totalSections && totalSections > 1) {
            anomalies.push(`${card.code}: All ${totalSections} sections are 'unknown'`);
        }
    }

    return { distribution, anomalies };
}

// ═══════════════════════════════════════════════════════════════
// RULE EXTRACTION QUALITY
// ═══════════════════════════════════════════════════════════════

function auditRuleExtraction(): {
    bemaRules: any[];
    byType: Record<string, number>;
    samples: Record<string, any[]>;
    qualityMetrics: { unknownPercent: number; totalRules: number };
} {
    clearRulesCache();
    const allRules = loadRules();
    const bemaRules = allRules.filter(r => r.system === 'BEMA');

    const byType: Record<string, number> = {};
    const samples: Record<string, any[]> = {};

    for (const rule of bemaRules) {
        const type = rule.conditionType || 'unknown';
        byType[type] = (byType[type] || 0) + 1;

        if (!samples[type]) {
            samples[type] = [];
        }
        if (samples[type].length < 10) {
            samples[type].push({
                ruleId: rule.ruleId,
                code: rule.codePattern,
                evidenceSnippet: (rule.evidenceSnippet || '').slice(0, 100),
                sourceCardId: rule.sourceCardId,
            });
        }
    }

    const unknownCount = byType['unknown'] || 0;
    const unknownPercent = bemaRules.length > 0
        ? Math.round((unknownCount / bemaRules.length) * 100)
        : 0;

    return {
        bemaRules,
        byType,
        samples,
        qualityMetrics: {
            unknownPercent,
            totalRules: bemaRules.length,
        },
    };
}

// ═══════════════════════════════════════════════════════════════
// GOLDEN CODE REGRESSION
// ═══════════════════════════════════════════════════════════════

const GOLDEN_CODES = ['BEMA_01', 'BEMA_12', 'BEMA_46', 'BEMA_100', 'BEMA_Ä1'];

function auditGoldenCodes(): Record<string, {
    found: boolean;
    sectionsCount: number;
    rulesCount: number;
    topSnippet: string;
    tags: string[];
}> {
    const results: Record<string, any> = {};

    for (const code of GOLDEN_CODES) {
        const cards = getCommentCardsForCode(code, 'BEMA');
        const rules = getRulesForCode(code);

        if (cards.length === 0) {
            results[code] = { found: false, sectionsCount: 0, rulesCount: 0, topSnippet: '', tags: [] };
        } else {
            const card = cards[0];
            const topSnippet = card.sections?.[0]?.snippet?.slice(0, 100) || '';
            results[code] = {
                found: true,
                sectionsCount: card.sections?.length || 0,
                rulesCount: rules.length,
                topSnippet,
                tags: card.tags || [],
            };
        }
    }

    return results;
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║          BEMA COMMENT INGESTION DEEP AUDIT                 ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // 1. Discovery audit
    console.log('🔍 1. Discovery Audit...');
    const htmlFiles = findHtmlFiles(BEMA_SOURCE_DIR);
    const suspiciousFiles: { file: string; reason: string }[] = [];

    for (const file of htmlFiles) {
        const stats = getFileStats(file);
        const relativePath = path.relative(BEMA_SOURCE_DIR, file);

        if (stats.size < 1000) {
            suspiciousFiles.push({ file: relativePath, reason: 'Very small file (<1KB)' });
        } else if (!stats.hasMainContent) {
            suspiciousFiles.push({ file: relativePath, reason: 'No main content detected' });
        }
    }

    console.log(`   Total HTML files: ${htmlFiles.length}`);
    console.log(`   Suspicious files: ${suspiciousFiles.length}`);

    // 2. Load BEMA cards and validate
    console.log('\n🔍 2. Code Detection Validation...');
    const bemaCards = loadBemaCards();
    const codeValidation = validateCodeDetection(bemaCards);

    console.log(`   BEMA cards loaded: ${bemaCards.length}`);
    console.log(`   Detected patterns:`);
    for (const [pattern, data] of Object.entries(codeValidation.byPattern)) {
        console.log(`     ${pattern}: ${data.count} (samples: ${data.samples.slice(0, 3).join(', ')})`);
    }
    if (codeValidation.suspiciousCodes.length > 0) {
        console.log(`   ⚠️ Suspicious codes: ${codeValidation.suspiciousCodes.join(', ')}`);
    } else {
        console.log(`   ✓ No suspicious codes detected`);
    }

    // 3. Section classification audit
    console.log('\n🔍 3. Section Classification Audit...');
    const sectionAudit = auditSectionClassification(bemaCards);

    console.log('   Distribution:');
    for (const [kind, count] of Object.entries(sectionAudit.distribution).sort((a, b) => b[1] - a[1])) {
        console.log(`     ${kind}: ${count}`);
    }
    if (sectionAudit.anomalies.length > 0) {
        console.log(`   ⚠️ Anomalies: ${sectionAudit.anomalies.length}`);
        sectionAudit.anomalies.slice(0, 5).forEach(a => console.log(`     - ${a}`));
    } else {
        console.log(`   ✓ No anomalies detected`);
    }

    // 4. Rule extraction quality
    console.log('\n🔍 4. Rule Extraction Quality...');
    const ruleAudit = auditRuleExtraction();

    console.log(`   Total BEMA rules: ${ruleAudit.qualityMetrics.totalRules}`);
    console.log('   By type:');
    for (const [type, count] of Object.entries(ruleAudit.byType).sort((a, b) => b[1] - a[1])) {
        console.log(`     ${type}: ${count}`);
    }
    console.log(`   Unknown percentage: ${ruleAudit.qualityMetrics.unknownPercent}%`);

    // 5. Golden code regression
    console.log('\n🔍 5. Golden Code Regression...');
    const goldenAudit = auditGoldenCodes();

    for (const [code, data] of Object.entries(goldenAudit)) {
        if (data.found) {
            console.log(`   ✓ ${code}: ${data.sectionsCount} sections, ${data.rulesCount} rules, tags: ${data.tags.join(', ') || 'none'}`);
        } else {
            console.log(`   ❌ ${code}: NOT FOUND`);
        }
    }

    // Generate code detection samples
    const codeSamples: any[] = [];
    const sampleCodes = [...new Set(bemaCards.map(c => c.code))].slice(0, 15);
    for (const code of sampleCodes) {
        const card = bemaCards.find(c => c.code === code);
        if (card) {
            codeSamples.push({
                detectedCode: code,
                evidenceText: card.sections?.[0]?.snippet?.slice(0, 80) || '',
                filePath: card.source?.filePath || '',
            });
        }
    }

    // Write audit results
    const auditReport = {
        meta: {
            timestamp: new Date().toISOString(),
            sourceDir: BEMA_SOURCE_DIR,
        },
        discovery: {
            totalHtmlFiles: htmlFiles.length,
            bemaCardsLoaded: bemaCards.length,
            suspiciousFiles,
        },
        codeDetection: {
            byPattern: codeValidation.byPattern,
            suspiciousCodes: codeValidation.suspiciousCodes,
            samples: codeSamples,
        },
        sectionClassification: sectionAudit,
        ruleExtraction: {
            totalBemaRules: ruleAudit.qualityMetrics.totalRules,
            byType: ruleAudit.byType,
            unknownPercent: ruleAudit.qualityMetrics.unknownPercent,
            samples: ruleAudit.samples,
        },
        goldenCodeRegression: goldenAudit,
    };

    const reportPath = path.resolve(__dirname, '../src/docudent/__fixtures__/bema_comment_audit_v2.json');
    fs.writeFileSync(reportPath, JSON.stringify(auditReport, null, 2) + '\n');
    console.log(`\n✓ Audit report written: ${reportPath}`);

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('AUDIT SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');

    const issues: string[] = [];

    if (suspiciousFiles.length > 10) {
        issues.push(`⚠️ ${suspiciousFiles.length} suspicious files (>10)`);
    }
    if (codeValidation.suspiciousCodes.length > 0) {
        issues.push(`⚠️ ${codeValidation.suspiciousCodes.length} suspicious codes`);
    }
    if (sectionAudit.anomalies.length > 5) {
        issues.push(`⚠️ ${sectionAudit.anomalies.length} section anomalies`);
    }
    if (ruleAudit.qualityMetrics.unknownPercent > 25) {
        issues.push(`⚠️ Unknown rules ${ruleAudit.qualityMetrics.unknownPercent}% (>25%)`);
    }
    if (Object.values(goldenAudit).some(v => !v.found)) {
        issues.push(`⚠️ Some golden codes not found`);
    }

    if (issues.length === 0) {
        console.log('✅ BEMA import is CORRECT - no issues detected');
    } else {
        console.log('⚠️ Issues found:');
        issues.forEach(i => console.log(`   ${i}`));
    }

    console.log('\n✅ Audit complete!\n');
}

main().catch(console.error);
