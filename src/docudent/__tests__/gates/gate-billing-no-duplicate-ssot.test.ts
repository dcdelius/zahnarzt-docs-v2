/**
 * Gate: Billing No Duplicate SSOT
 *
 * Ensures exactly one unified.json per treatmentId.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Gate: Billing No Duplicate SSOT', () => {
    const basePath = path.join(process.cwd(), 'src/docudent/core/billing/knowledgeBase');

    it('each treatmentId has exactly one unified.json', () => {
        const treatmentsPath = path.join(basePath, 'treatments');
        const treatments = fs.readdirSync(treatmentsPath, { withFileTypes: true })
            .filter(d => d.isDirectory())
            .map(d => d.name);

        for (const treatment of treatments) {
            const unifiedPath = path.join(treatmentsPath, treatment, 'unified.json');
            expect(fs.existsSync(unifiedPath), `Missing unified.json for ${treatment}`).toBe(true);
        }
    });

    it('no duplicate unified.json in behandlungen/', () => {
        const behandlungenPath = path.join(basePath, 'behandlungen');

        if (!fs.existsSync(behandlungenPath)) {
            return; // Already cleaned up
        }

        const files = fs.readdirSync(behandlungenPath);
        const unifiedFiles = files.filter(f => f.includes('unified'));

        // These should be migrated/deleted
        const msg = `Found legacy unified files in behandlungen/: ${unifiedFiles.join(', ')}. ` +
            'These should be deleted after confirming no imports.';

        expect(unifiedFiles.length, msg).toBe(0);
    });

    it('no duplicate treatment definitions', () => {
        const treatmentsPath = path.join(basePath, 'treatments');
        const seenIds = new Set<string>();

        const treatments = fs.readdirSync(treatmentsPath, { withFileTypes: true })
            .filter(d => d.isDirectory())
            .map(d => d.name);

        for (const treatment of treatments) {
            expect(seenIds.has(treatment), `Duplicate treatment: ${treatment}`).toBe(false);
            seenIds.add(treatment);
        }
    });
});
