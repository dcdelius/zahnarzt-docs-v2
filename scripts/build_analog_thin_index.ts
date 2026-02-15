#!/usr/bin/env npx tsx
/**
 * Build Thin Analog Index
 * 
 * Extracts minimal fields from commentIndex_analog.json for fast runtime loading.
 * Uses async reading with timeout guards to prevent hangs.
 * 
 * Output: commentIndex_analog_thin.json (~10% of original size)
 * 
 * Run: npx tsx scripts/build_analog_thin_index.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ═══════════════════════════════════════════════════════════════
// HARD TIMEOUT GUARD (20s max)
// ═══════════════════════════════════════════════════════════════

const TIMEOUT_MS = 20_000;
const exitTimer = setTimeout(() => {
    console.error('\n❌ TIMEOUT: Build exceeded 20s safety guard');
    process.exit(2);
}, TIMEOUT_MS);
exitTimer.unref();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_PATH = path.resolve(
    __dirname,
    '../src/docudent/core/billing/knowledgeBase/secondary/commentIndex_analog.json'
);

const OUTPUT_PATH = path.resolve(
    __dirname,
    '../src/docudent/core/billing/knowledgeBase/secondary/commentIndex_analog_thin.json'
);

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface FullAnalogCard {
    id: string;
    system: string;
    code: string;
    title: string;
    analogChapter?: string;
    tags?: string[];
    analogHint?: {
        allowed?: boolean;
        paragraph?: string;
        requiresComparison?: boolean;
        referencedCodes?: string[];
    };
    crossReferences?: Array<{
        system: string;
        code: string;
        context?: string;
    }>;
    softRules?: Array<{
        type: string;
        severity?: string;
        payload?: Record<string, unknown>;
    }>;
    sections?: Array<{
        heading?: string;
        snippet: string;
    }>;
}

interface ThinAnalogEntry {
    id: string;
    title?: string;
    chapter?: string;            // From analogChapter - needed for filtering
    tags?: string[];
    hasAnalogHint: boolean;
    referencedCodes?: string[];  // GOZ codes from crossReferences
    topSnippets?: string[];      // Max 3, max 160 chars each
}

interface ThinAnalogIndex {
    meta: {
        version: string;
        generatedAt: string;
        count: number;
        sourceFile: string;
    };
    codes: Record<string, ThinAnalogEntry>;
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function truncateSnippet(text: string, maxLen: number): string {
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen - 3) + '...';
}

// ═══════════════════════════════════════════════════════════════
// MAIN BUILD FUNCTION
// ═══════════════════════════════════════════════════════════════

async function buildThinIndex(): Promise<void> {
    const startTime = Date.now();
    console.log('Building thin analog index...');
    console.log(`Input: ${INPUT_PATH}`);

    // Check input exists
    if (!fs.existsSync(INPUT_PATH)) {
        console.error('❌ Input file not found');
        clearTimeout(exitTimer);
        process.exit(1);
    }

    const inputStats = fs.statSync(INPUT_PATH);
    console.log(`Input size: ${(inputStats.size / 1024).toFixed(2)} KB`);

    // Read file asynchronously with Promise wrapper
    console.log('Loading source file...');
    const loadStart = Date.now();

    const raw = await fs.promises.readFile(INPUT_PATH, 'utf-8');
    console.log(`  ✓ File loaded in ${Date.now() - loadStart}ms`);

    // Parse JSON (this is the potentially slow part)
    console.log('Parsing JSON...');
    const parseStart = Date.now();

    let data: { meta?: any; cards?: FullAnalogCard[] };
    try {
        data = JSON.parse(raw);
    } catch (e) {
        console.error('❌ JSON parse error:', e);
        clearTimeout(exitTimer);
        process.exit(1);
    }
    console.log(`  ✓ Parsed in ${Date.now() - parseStart}ms`);

    const fullCards: FullAnalogCard[] = data.cards || [];
    console.log(`  Found ${fullCards.length} cards`);

    // Build thin index with progress logging
    console.log('Building thin index...');
    const buildStart = Date.now();

    const codes: Record<string, ThinAnalogEntry> = {};
    let processed = 0;

    for (const card of fullCards) {
        // Progress logging every 10 cards
        if (processed > 0 && processed % 10 === 0) {
            console.log(`  [${processed}/${fullCards.length}] cards processed...`);
        }

        // Extract GOZ cross-references only (code only, no context)
        const gozRefs: string[] = [];
        if (card.crossReferences) {
            for (const ref of card.crossReferences) {
                if (ref.system === 'GOZ' && ref.code && !gozRefs.includes(ref.code)) {
                    gozRefs.push(ref.code);
                }
            }
        }

        // Extract top snippets (max 3, max 160 chars each)
        const topSnippets: string[] = [];
        if (card.sections) {
            for (const section of card.sections) {
                if (topSnippets.length >= 3) break;
                if (section.snippet && section.snippet.length > 20) {
                    topSnippets.push(truncateSnippet(section.snippet.trim(), 160));
                }
            }
        }

        const entry: ThinAnalogEntry = {
            id: card.id,
            hasAnalogHint: !!(card.analogHint && card.analogHint.allowed),
        };

        if (card.title) {
            entry.title = card.title;
        }

        if (card.analogChapter) {
            entry.chapter = card.analogChapter;
        }

        if (card.tags && card.tags.length > 0) {
            entry.tags = card.tags;
        }

        if (gozRefs.length > 0) {
            entry.referencedCodes = gozRefs.slice(0, 5); // Limit to 5
        }

        if (topSnippets.length > 0) {
            entry.topSnippets = topSnippets;
        }

        codes[card.code] = entry;
        processed++;
    }

    console.log(`  ✓ Built in ${Date.now() - buildStart}ms`);

    // Sort codes for determinism
    console.log('Sorting keys for determinism...');
    const sortedCodes: Record<string, ThinAnalogEntry> = {};
    const sortedKeys = Object.keys(codes).sort();
    for (const key of sortedKeys) {
        sortedCodes[key] = codes[key];
    }

    const output: ThinAnalogIndex = {
        meta: {
            version: 'v1',
            generatedAt: new Date().toISOString(),
            count: Object.keys(sortedCodes).length,
            sourceFile: 'commentIndex_analog.json',
        },
        codes: sortedCodes,
    };

    // Write output
    console.log('Writing thin index...');
    const writeStart = Date.now();

    const outJson = JSON.stringify(output, null, 2);
    await fs.promises.writeFile(OUTPUT_PATH, outJson, 'utf-8');
    console.log(`  ✓ Written in ${Date.now() - writeStart}ms`);

    // Final stats
    const outputStats = fs.statSync(OUTPUT_PATH);
    const reduction = ((1 - outputStats.size / inputStats.size) * 100).toFixed(1);
    const totalTime = Date.now() - startTime;

    console.log('');
    console.log('='.repeat(60));
    console.log('✓ Thin index created successfully!');
    console.log('='.repeat(60));
    console.log(`  Original: ${(inputStats.size / 1024).toFixed(2)} KB`);
    console.log(`  Thin:     ${(outputStats.size / 1024).toFixed(2)} KB`);
    console.log(`  Reduction: ${reduction}%`);
    console.log(`  Entries: ${Object.keys(sortedCodes).length}`);
    console.log(`  Total time: ${totalTime}ms`);
    console.log(`  Output: ${OUTPUT_PATH}`);

    clearTimeout(exitTimer);
    process.exit(0);
}

// Run
buildThinIndex().catch((err) => {
    console.error('❌ Build failed:', err);
    clearTimeout(exitTimer);
    process.exit(1);
});
