#!/usr/bin/env npx tsx
/**
 * Analog Comment Import V1
 * 
 * Imports Analogleistungen HTML files into CommentCards with system = "ANALOG".
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { parseAnalogHtmlV1, isIndexOrLoginPage, type AnalogCommentCard } from '../src/docudent/core/billing/knowledgeBase/secondary/analogParserV1';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ═══════════════════════════════════════════════════════════════
// FILE DISCOVERY
// ═══════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
    const sourceDir = '/Users/david/dokumaster-ui/src/docudent/Analogleistungen';

    console.log(`\n╔════════════════════════════════════════════════════════════╗`);
    console.log(`║        Analogleistungen Comment Import V1                  ║`);
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
    const cards: AnalogCommentCard[] = [];
    const skippedFiles: Array<{ file: string; reason: string }> = [];
    const failedFiles: Array<{ file: string; error: string }> = [];
    const seenIds = new Set<string>();
    const codeCounts: Record<string, number> = {};
    const crossRefCounts: Record<string, number> = { GOZ: 0, GOAE: 0, BEMA: 0 };
    let dedupeCount = 0;
    let analogHintCount = 0;

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

            const result = parseAnalogHtmlV1(content, relativePath);

            if (result.success && result.card) {
                // Check for duplicates
                if (seenIds.has(result.card.id)) {
                    dedupeCount++;
                } else {
                    seenIds.add(result.card.id);
                    cards.push(result.card);

                    // Track stats
                    codeCounts[result.card.code] = (codeCounts[result.card.code] || 0) + 1;
                    if (result.card.analogHint) analogHintCount++;
                    for (const ref of result.card.crossReferences || []) {
                        crossRefCounts[ref.system] = (crossRefCounts[ref.system] || 0) + 1;
                    }
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
            version: 'v1',
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
            analogHints: analogHintCount,
            crossReferences: crossRefCounts,
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
    console.log(`  📊 Unique Analog Codes: ${uniqueCodes.length}`);
    console.log(`  📐 With §6 Analog:      ${analogHintCount}`);
    console.log(`  🔗 Cross-References:`);
    console.log(`     GOZ: ${crossRefCounts.GOZ}, GOÄ: ${crossRefCounts.GOAE}, BEMA: ${crossRefCounts.BEMA}`);
    console.log('');
    console.log('  🔝 Top 10 Codes:');
    for (const { code, count } of topCodes) {
        console.log(`     ${code}: ${count} entries`);
    }
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
            console.log(`     - ${file.slice(0, 60)}...`);
            console.log(`       Reason: ${error}`);
        }
        console.log('');
    }

    // Write outputs
    const indexPath = path.resolve(__dirname, '../src/docudent/core/billing/knowledgeBase/secondary/commentIndex_analog.json');
    fs.mkdirSync(path.dirname(indexPath), { recursive: true });
    fs.writeFileSync(indexPath, JSON.stringify({
        meta: { version: 'v1', generatedAt: new Date().toISOString(), count: cards.length },
        cards
    }, null, 2) + '\n');
    console.log(`✓ Written: ${indexPath}`);

    const reportPath = path.resolve(__dirname, '../src/docudent/__fixtures__/comment_import_report_analog.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
    console.log(`✓ Written: ${reportPath}`);

    // ═══════════════════════════════════════════════════════════════
    // AUTO-BUILD THIN INDEX
    // ═══════════════════════════════════════════════════════════════
    console.log('\n🔧 Building thin index...');
    try {
        const { execSync } = await import('child_process');
        execSync('npx tsx scripts/build_analog_thin_index.ts', {
            cwd: path.resolve(__dirname, '..'),
            stdio: 'inherit',
        });
    } catch (e) {
        console.error('⚠️  Failed to build thin index:', e);
        console.error('   Run manually: npx tsx scripts/build_analog_thin_index.ts');
    }

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
            title: analogCard.title,
            analogChapter: analogCard.analogChapter,
            analogHint: analogCard.analogHint,
            tags: analogCard.tags?.slice(0, 4),
        }, null, 2));
        console.log('');
    }

    // Card with cross-refs
    const crossRefCard = cards.find(c => (c.crossReferences?.length || 0) > 2);
    if (crossRefCard) {
        console.log('▶ Card with Cross-References:');
        console.log(JSON.stringify({
            id: crossRefCard.id,
            code: crossRefCard.code,
            title: crossRefCard.title,
            crossReferences: crossRefCard.crossReferences?.slice(0, 5),
        }, null, 2));
        console.log('');
    }

    // Card with rich sections
    const richCard = cards.reduce((best, c) => c.sections.length > best.sections.length ? c : best, cards[0]);
    if (richCard) {
        console.log('▶ Card with Rich Commentary:');
        console.log(JSON.stringify({
            id: richCard.id,
            code: richCard.code,
            title: richCard.title,
            sectionsCount: richCard.sections.length,
            sectionKinds: [...new Set(richCard.sections.map(s => s.kind))].slice(0, 5),
            firstSnippet: richCard.sections[0]?.snippet.slice(0, 80) + '...',
        }, null, 2));
    }

    console.log('\n✅ Import complete!\n');
}

main().catch(console.error);
