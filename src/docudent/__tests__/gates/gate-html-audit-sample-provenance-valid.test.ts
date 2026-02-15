/**
 * Gate Test: HTML Audit Sample Provenance Valid
 *
 * Verifies that a sample of entries have valid rawSource.filePath references.
 */

import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

interface ExtractedEntry {
    system: string;
    codeId: string;
    rawSource: {
        filePath: string;
        anchorOrCardId: string;
        fileHash: string | null;
    };
}

interface ExtractV2Output {
    _meta: {
        version: string;
        stats: {
            totalEntries: number;
        };
    };
    entries: ExtractedEntry[];
}

describe('gate-html-audit-sample-provenance-valid', () => {
    const extractPath = path.join(
        process.cwd(),
        'docs/audit/html_extract_v2.json'
    );

    test('sample of 20 entries have valid provenance structure', () => {
        const data: ExtractV2Output = JSON.parse(
            fs.readFileSync(extractPath, 'utf-8')
        );

        // Deterministic sample: take every N-th entry to get 20
        const step = Math.max(1, Math.floor(data.entries.length / 20));
        const sample: ExtractedEntry[] = [];

        for (let i = 0; i < data.entries.length && sample.length < 20; i += step) {
            sample.push(data.entries[i]);
        }

        expect(sample.length).toBe(20);

        for (const entry of sample) {
            // Each entry must have rawSource
            expect(entry.rawSource).toBeDefined();

            // filePath must be a non-empty string
            expect(typeof entry.rawSource.filePath).toBe('string');
            expect(entry.rawSource.filePath.length).toBeGreaterThan(0);

            // anchorOrCardId must be defined
            expect(entry.rawSource.anchorOrCardId).toBeDefined();
            expect(typeof entry.rawSource.anchorOrCardId).toBe('string');
        }
    });

    test('filePaths point to known HTML source directories or are from known provider', () => {
        const data: ExtractV2Output = JSON.parse(
            fs.readFileSync(extractPath, 'utf-8')
        );

        // Check first 20 entries
        for (const entry of data.entries.slice(0, 20)) {
            const fp = entry.rawSource.filePath;

            // Valid patterns:
            // 1. Starts with known folder (BEMA/, GOZ/, BEL/, KBR/, KFO/, etc.)
            // 2. Contains kommentar.bema-goz.de (wissing-kommentar provider)
            // 3. Is marked as 'unknown'
            const isValid =
                fp === 'unknown' ||
                fp.includes('kommentar.bema-goz.de') ||
                /^(BEMA|GOZ|BEL|KBR|KFO|Gruppe|Befundklassen)\//.test(fp) ||
                fp.includes('.html');

            expect(isValid).toBe(true);
        }
    });

    test('anchorOrCardId follows expected format', () => {
        const data: ExtractV2Output = JSON.parse(
            fs.readFileSync(extractPath, 'utf-8')
        );

        for (const entry of data.entries.slice(0, 20)) {
            const anchor = entry.rawSource.anchorOrCardId;

            // Format should be: SYSTEM:CODE:hash
            // e.g., "ANALOG:ANALOG_Aufbiss_01:eedc999ff350"
            expect(anchor).toMatch(/^[A-Z]+:.+:.+$/);
        }
    });

    test('systems match between entry and anchorOrCardId', () => {
        const data: ExtractV2Output = JSON.parse(
            fs.readFileSync(extractPath, 'utf-8')
        );

        for (const entry of data.entries.slice(0, 20)) {
            const anchorSystem = entry.rawSource.anchorOrCardId.split(':')[0];
            expect(anchorSystem).toBe(entry.system);
        }
    });

    test('fileHash is present for entries with valid filePath', () => {
        const data: ExtractV2Output = JSON.parse(
            fs.readFileSync(extractPath, 'utf-8')
        );

        let withHash = 0;
        let withoutHash = 0;

        for (const entry of data.entries.slice(0, 50)) {
            if (entry.rawSource.filePath !== 'unknown') {
                if (entry.rawSource.fileHash) {
                    withHash++;
                } else {
                    withoutHash++;
                }
            }
        }

        // Most entries should have hashes
        expect(withHash).toBeGreaterThan(withoutHash);
    });
});
