#!/usr/bin/env npx tsx
/**
 * GOZ Comment Import V2
 * 
 * Enhanced GOZ HTML import with:
 * - GOZ-specific section classification
 * - §6 Analog detection
 * - Cross-reference extraction
 * - Enhanced soft rule detection
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { parseGozHtmlV2, isIndexOrLoginPage, type GozCommentCard } from '../src/docudent/core/billing/knowledgeBase/secondary/gozParserV2';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ═══════════════════════════════════════════════════════════════
// FILE DISCOVERY
// ═══════════════════════════════════════════════════════════════

function findHtmlFiles(dir: string): string[] {
    const files: string[] = [];

    function walk(currentDir: string) {
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

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
    const sourceDir = '/Users/david/dokumaster-ui/src/docudent/GOZ';

    console.log(`\n╔════════════════════════════════════════════════════════════╗`);
    console.log(`║        GOZ Comment Import V2                               ║`);
    console.log(`╚════════════════════════════════════════════════════════════╝\n`);
    console.log(`Source: ${sourceDir}\n`);

    // Find files
    console.log('🔍 Scanning for HTML files...');
    const files = findHtmlFiles(sourceDir);
    console.log(`   Found ${files.length} HTML files\n`);

    if (files.length === 0) {
        console.log('No HTML files found.');
        return;
    }

    // Process files
    const cards: GozCommentCard[] = [];
    const skippedFiles: Array<{ file: string; reason: string }> = [];
    const failedFiles: Array<{ file: string; error: string }> = [];
    const seenIds = new Set<string>();
    const codeCounts: Record<string, number> = {};
    let dedupeCount = 0;
    let analogCount = 0;
    let crossRefCount = 0;

    console.log('📝 Processing files...');
    for (const file of files) {
        const relativePath = path.relative(sourceDir, file);

        try {
            const content = fs.readFileSync(file, 'utf8');

            // Check if index/login page
            const skipCheck = isIndexOrLoginPage(relativePath, content);
            if (skipCheck.skip) {
                skippedFiles.push({ file: relativePath, reason: skipCheck.reason });
                continue;
            }

            const result = parseGozHtmlV2(content, relativePath);

            if (result.success && result.card) {
                // Check for duplicates
                if (seenIds.has(result.card.id)) {
                    dedupeCount++;
                } else {
                    seenIds.add(result.card.id);
                    cards.push(result.card);

                    // Track stats
                    codeCounts[result.card.code] = (codeCounts[result.card.code] || 0) + 1;
                    if (result.card.analogHint) analogCount++;
                    if (result.card.crossReferences?.length) crossRefCount++;
                }
            } else {
                failedFiles.push({ file: relativePath, error: result.error || 'Unknown error' });
            }
        } catch (err) {
            failedFiles.push({ file: relativePath, error: `Exception: ${err}` });
        }
    }

    // Sort cards for determinism
    cards.sort((a, b) => a.id.localeCompare(b.id));

    // Calculate stats
    const uniqueCodes = Object.keys(codeCounts).sort();
    const topCodes = Object.entries(codeCounts)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 10)
        .map(([code, count]) => ({ code, count }));

    // Build report
    const report = {
        meta: {
            version: 'v2',
            timestamp: new Date().toISOString(),
            sourceDir,
        },
        discovery: {
            totalFiles: files.length,
            filesProcessed: cards.length + dedupeCount,
            filesSkipped: skippedFiles,
            filesFailed: failedFiles,
        },
        summary: {
            totalCards: cards.length,
            dedupeCount,
            uniqueCodes: uniqueCodes.length,
            analogHints: analogCount,
            crossReferences: crossRefCount,
        },
        topCodes,
        uniqueCodes,
    };

    // Print summary
    console.log(`\n╔════════════════════════════════════════════════════════════╗`);
    console.log(`║                    IMPORT SUMMARY                          ║`);
    console.log(`╚════════════════════════════════════════════════════════════╝\n`);
    console.log(`  📂 Total Files:      ${files.length}`);
    console.log(`  ✅ Processed:        ${cards.length + dedupeCount}`);
    console.log(`  ⏭️  Skipped:          ${skippedFiles.length}`);
    console.log(`  ❌ Failed:           ${failedFiles.length}`);
    console.log(`  🔄 Deduplicated:     ${dedupeCount}`);
    console.log(`  💾 Unique Cards:     ${cards.length}`);
    console.log('');
    console.log(`  📊 Unique GOZ Codes: ${uniqueCodes.length}`);
    console.log(`  📐 With §6 Analog:   ${analogCount}`);
    console.log(`  🔗 With Cross-Refs:  ${crossRefCount}`);
    console.log('');
    console.log('  🔝 Top 10 Codes:');
    for (const { code, count } of topCodes) {
        console.log(`     ${code}: ${count} entries`);
    }
    console.log('');
    console.log('  📋 All GOZ Codes:');
    console.log(`     ${uniqueCodes.join(', ')}`);
    console.log('');

    if (skippedFiles.length > 0) {
        console.log(`  ⏭️  Skipped Files (${skippedFiles.length}):`);
        const byReason: Record<string, number> = {};
        for (const { reason } of skippedFiles) {
            byReason[reason] = (byReason[reason] || 0) + 1;
        }
        for (const [reason, count] of Object.entries(byReason).sort((a, b) => b[1] - a[1])) {
            console.log(`     - ${reason}: ${count}`);
        }
        console.log('');
    }

    if (failedFiles.length > 0) {
        console.log(`  ❌ Failed Files (showing first 5):`);
        for (const { file, error } of failedFiles.slice(0, 5)) {
            console.log(`     - ${file.slice(0, 50)}...`);
            console.log(`       Reason: ${error}`);
        }
        console.log('');
    }

    // Write outputs
    const indexPath = path.resolve(__dirname, '../src/docudent/core/billing/knowledgeBase/secondary/commentIndex_goz_v2.json');
    fs.mkdirSync(path.dirname(indexPath), { recursive: true });
    fs.writeFileSync(indexPath, JSON.stringify({
        meta: { version: 'v2', generatedAt: new Date().toISOString(), count: cards.length },
        cards
    }, null, 2) + '\n');
    console.log(`✓ Written: ${indexPath}`);

    const reportPath = path.resolve(__dirname, '../src/docudent/__fixtures__/comment_import_report_goz_v2.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
    console.log(`✓ Written: ${reportPath}`);

    // Show example cards
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('EXAMPLE CARDS');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Card with analog hint
    const analogCard = cards.find(c => c.analogHint);
    if (analogCard) {
        console.log('▶ Card with §6 Analog Reference:');
        console.log(JSON.stringify({
            id: analogCard.id,
            code: analogCard.code,
            analogHint: analogCard.analogHint,
            tags: analogCard.tags?.slice(0, 3),
        }, null, 2));
        console.log('');
    }

    // Card with maxCount rule
    const maxCountCard = cards.find(c => c.softRules?.some(r => r.type === 'maxCountHint'));
    if (maxCountCard) {
        console.log('▶ Card with maxCount Rule:');
        const maxRule = maxCountCard.softRules?.find(r => r.type === 'maxCountHint');
        console.log(JSON.stringify({
            id: maxCountCard.id,
            code: maxCountCard.code,
            maxCountRule: maxRule,
            tags: maxCountCard.tags?.slice(0, 3),
        }, null, 2));
        console.log('');
    }

    // Card with rich commentary (most sections)
    const richCard = cards.reduce((best, c) => c.sections.length > best.sections.length ? c : best, cards[0]);
    if (richCard) {
        console.log('▶ Card with Rich Commentary:');
        console.log(JSON.stringify({
            id: richCard.id,
            code: richCard.code,
            sectionsCount: richCard.sections.length,
            sectionKinds: richCard.sections.map(s => s.kind).slice(0, 5),
            firstSnippet: richCard.sections[0]?.snippet.slice(0, 100) + '...',
            tags: richCard.tags?.slice(0, 3),
        }, null, 2));
    }

    console.log('\n✅ Import complete!\n');
}

main().catch(console.error);
