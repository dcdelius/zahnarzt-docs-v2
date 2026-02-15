#!/usr/bin/env npx tsx
/**
 * Atlas Cleanup Script
 * 
 * Enforces artifact policy:
 * - Only _latest/<topic>/ artifacts allowed
 * - Max 10 _history/ snapshots
 * - Updates index.md and index.json
 */

import * as fs from 'fs';
import * as path from 'path';

const ARTIFACTS_DIR = path.join(process.cwd(), 'docs/system-atlas/artifacts');
const MAX_HISTORY = 10;

interface CleanupReport {
    deletedFolders: string[];
    keptHistory: string[];
    latestTopics: string[];
    beforeCount: number;
    afterCount: number;
}

function cleanup(): CleanupReport {
    const report: CleanupReport = {
        deletedFolders: [],
        keptHistory: [],
        latestTopics: [],
        beforeCount: 0,
        afterCount: 0,
    };

    if (!fs.existsSync(ARTIFACTS_DIR)) {
        console.log('No artifacts directory found');
        return report;
    }

    const entries = fs.readdirSync(ARTIFACTS_DIR, { withFileTypes: true });
    report.beforeCount = entries.filter(e => e.isDirectory()).length;

    // Identify folders
    const latestPath = path.join(ARTIFACTS_DIR, '_latest');
    const historyPath = path.join(ARTIFACTS_DIR, '_history');

    // Get _latest topics
    if (fs.existsSync(latestPath)) {
        const latestEntries = fs.readdirSync(latestPath, { withFileTypes: true });
        report.latestTopics = latestEntries
            .filter(e => e.isDirectory())
            .map(e => e.name);
    }

    // Trim _history to MAX_HISTORY
    if (fs.existsSync(historyPath)) {
        const historyEntries = fs.readdirSync(historyPath, { withFileTypes: true })
            .filter(e => e.isDirectory())
            .map(e => e.name)
            .sort()
            .reverse(); // Newest first

        report.keptHistory = historyEntries.slice(0, MAX_HISTORY);
        const toDelete = historyEntries.slice(MAX_HISTORY);

        for (const folder of toDelete) {
            const folderPath = path.join(historyPath, folder);
            console.log(`Deleting old history: ${folder}`);
            fs.rmSync(folderPath, { recursive: true });
            report.deletedFolders.push(`_history/${folder}`);
        }
    }

    // Delete any folders outside _latest and _history
    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name === '_latest' || entry.name === '_history') continue;
        if (entry.name === 'index.md' || entry.name === 'index.json') continue;
        // Legacy folders that should be deleted
        const folderPath = path.join(ARTIFACTS_DIR, entry.name);
        console.log(`Found legacy folder (not deleting for safety): ${entry.name}`);
        // Uncomment to actually delete:
        // fs.rmSync(folderPath, { recursive: true });
        // report.deletedFolders.push(entry.name);
    }

    // Count after
    const afterEntries = fs.readdirSync(ARTIFACTS_DIR, { withFileTypes: true });
    report.afterCount = afterEntries.filter(e => e.isDirectory()).length;

    return report;
}

function updateIndex(report: CleanupReport): void {
    const indexPath = path.join(ARTIFACTS_DIR, 'index.json');
    const indexMdPath = path.join(ARTIFACTS_DIR, 'index.md');

    // Update JSON index
    const index = {
        lastUpdated: new Date().toISOString().split('T')[0],
        policy: {
            latestOnly: '_latest/<topic>/',
            historyMax: MAX_HISTORY,
        },
        topics: report.latestTopics,
        historyCount: report.keptHistory.length,
    };

    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));

    // Update MD index
    const md = `# Artifacts Index

**Last Updated:** ${index.lastUpdated}

## Policy
- Latest artifacts: \`_latest/<topic>/\`
- History snapshots: \`_history/\` (max ${MAX_HISTORY})

## Current Topics

${report.latestTopics.map(t => `- ${t}/`).join('\n')}

## History

${report.keptHistory.length} snapshots retained.
`;

    fs.writeFileSync(indexMdPath, md);
}

// Main
console.log('🧹 Atlas Cleanup Starting...\n');
const report = cleanup();
updateIndex(report);

console.log('\n✅ Cleanup Complete');
console.log(`   Folders before: ${report.beforeCount}`);
console.log(`   Folders after: ${report.afterCount}`);
console.log(`   Deleted: ${report.deletedFolders.length}`);
console.log(`   History kept: ${report.keptHistory.length}/${MAX_HISTORY}`);
console.log(`   Latest topics: ${report.latestTopics.length}`);

// Save report
const reportPath = path.join(ARTIFACTS_DIR, '_latest/atlas/gp6.cleanup.report.json');
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify({
    date: new Date().toISOString(),
    ...report,
}, null, 2));
console.log(`\n📄 Report saved: ${reportPath}`);
