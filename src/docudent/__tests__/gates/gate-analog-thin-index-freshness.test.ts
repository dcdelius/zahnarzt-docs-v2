/**
 * GATE: Thin Index Freshness
 * 
 * CI gate to ensure thin index is up-to-date with source file.
 * Fails if:
 * - Thin index is missing
 * - Source file is newer than thin index
 * - Count mismatch between source and thin
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SECONDARY_DIR = path.resolve(
    __dirname,
    '../../core/billing/knowledgeBase/secondary'
);

const FULL_INDEX_PATH = path.join(SECONDARY_DIR, 'commentIndex_analog.json');
const THIN_INDEX_PATH = path.join(SECONDARY_DIR, 'commentIndex_analog_thin.json');

describe('GATE: Analog Thin Index Freshness', () => {
    describe('File Existence', () => {
        it('thin index file exists', () => {
            expect(
                fs.existsSync(THIN_INDEX_PATH),
                'Thin index missing! Run: npx tsx scripts/build_analog_thin_index.ts'
            ).toBe(true);
        });

        it('source index file exists', () => {
            expect(fs.existsSync(FULL_INDEX_PATH)).toBe(true);
        });
    });

    describe('Freshness', () => {
        it('thin index is not older than source', () => {
            if (!fs.existsSync(FULL_INDEX_PATH) || !fs.existsSync(THIN_INDEX_PATH)) {
                return; // Skip if files don't exist
            }

            const fullMtime = fs.statSync(FULL_INDEX_PATH).mtime.getTime();
            const thinMtime = fs.statSync(THIN_INDEX_PATH).mtime.getTime();

            expect(
                thinMtime >= fullMtime - 1000, // Allow 1s tolerance
                `Thin index is stale! Source modified after thin index.\n` +
                `Run: npx tsx scripts/build_analog_thin_index.ts`
            ).toBe(true);
        });

        it('card count matches between source and thin', () => {
            if (!fs.existsSync(FULL_INDEX_PATH) || !fs.existsSync(THIN_INDEX_PATH)) {
                return;
            }

            const fullRaw = fs.readFileSync(FULL_INDEX_PATH, 'utf-8');
            const fullData = JSON.parse(fullRaw);
            const fullCount = (fullData.cards || []).length;

            const thinRaw = fs.readFileSync(THIN_INDEX_PATH, 'utf-8');
            const thinData = JSON.parse(thinRaw);
            const thinCount = Object.keys(thinData.codes || {}).length;

            expect(
                thinCount,
                `Card count mismatch: source=${fullCount}, thin=${thinCount}`
            ).toBe(fullCount);
        });
    });

    describe('No Large JSON in Runtime', () => {
        it('analogResolver does not import full commentIndex', () => {
            const resolverPath = path.resolve(
                __dirname,
                '../../core/billing/knowledgeBase/logic/analogResolver.ts'
            );

            if (!fs.existsSync(resolverPath)) return;

            const content = fs.readFileSync(resolverPath, 'utf-8');

            // Should NOT have direct import of full index
            // Should use thin index only
            expect(content).toContain('commentIndex_analog_thin.json');

            // Should not have fallback to full index at runtime
            // (only thin index should be used)
            const lines = content.split('\n');
            let inFallbackBlock = false;
            let fallbackUsesFullIndex = false;

            for (const line of lines) {
                if (line.includes('Fallback to full index')) {
                    inFallbackBlock = true;
                }
                if (inFallbackBlock && line.includes('readFileSync')) {
                    fallbackUsesFullIndex = true;
                    break;
                }
            }

            // We now should NOT have a fallback to full index
            expect(fallbackUsesFullIndex).toBe(false);
        });
    });

    describe('Copyright Protection', () => {
        it('thin index snippets do not exceed 160 chars', () => {
            if (!fs.existsSync(THIN_INDEX_PATH)) return;

            const raw = fs.readFileSync(THIN_INDEX_PATH, 'utf-8');
            const data = JSON.parse(raw);

            for (const [code, entry] of Object.entries(data.codes || {})) {
                const snippets = (entry as any).topSnippets || [];
                for (const snippet of snippets) {
                    expect(
                        snippet.length,
                        `Snippet in ${code} exceeds 160 chars`
                    ).toBeLessThanOrEqual(160);
                }
            }
        });

        it('thin index does not contain full sections', () => {
            if (!fs.existsSync(THIN_INDEX_PATH)) return;

            const raw = fs.readFileSync(THIN_INDEX_PATH, 'utf-8');

            // Should NOT contain 'sections' key
            expect(raw).not.toContain('"sections"');

            // Should NOT contain long paragraphs (>300 chars in single string)
            const data = JSON.parse(raw);
            const jsonStr = JSON.stringify(data);
            const longStrings = jsonStr.match(/"[^"]{300,}"/g) || [];

            expect(
                longStrings.length,
                `Found ${longStrings.length} strings >300 chars: ${longStrings[0]?.slice(0, 50)}...`
            ).toBe(0);
        });
    });
});
