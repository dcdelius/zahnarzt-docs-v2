/**
 * Gate Test: HTML Audit Diff Snapshot
 *
 * Verifies that diff counts remain stable via snapshot comparison.
 * Changes to diff counts require explicit snapshot updates.
 */

import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('gate-html-audit-diff-snapshot', () => {
    const diffPath = path.join(process.cwd(), 'docs/audit/html_vs_db_diff.md');

    test('html_vs_db_diff.md exists', () => {
        expect(fs.existsSync(diffPath)).toBe(true);
    });

    test('diff report contains verdict', () => {
        const content = fs.readFileSync(diffPath, 'utf-8');

        // Must contain one of the valid verdicts
        const hasVerdict =
            content.includes('**SOLID**') ||
            content.includes('**PARTIAL**') ||
            content.includes('**NOT_SOLID**');

        expect(hasVerdict).toBe(true);
    });

    test('diff report contains snapshot values section', () => {
        const content = fs.readFileSync(diffPath, 'utf-8');
        expect(content).toContain('## Snapshot Values (for gate tests)');
    });

    test('snapshot values match expected thresholds', () => {
        const content = fs.readFileSync(diffPath, 'utf-8');

        // Extract JSON snapshot from markdown
        const jsonMatch = content.match(/```json\n(\{[\s\S]*?\})\n```/);
        expect(jsonMatch).not.toBeNull();

        const snapshot = JSON.parse(jsonMatch![1]);

        // These are threshold assertions - update if intentionally changing DB
        // Current baseline (2025-12-23):
        expect(snapshot.totalHtmlEntries).toBeGreaterThanOrEqual(300);
        expect(snapshot.totalWithConstraints).toBeGreaterThanOrEqual(200);

        // High severity should stay low (< 20 is acceptable for PARTIAL verdict)
        expect(snapshot.highSeverity).toBeLessThan(20);

        // Mismatch count should stay low
        expect(snapshot.mismatch).toBeLessThan(50);
    });

    test('diff report contains 20-code spot check section', () => {
        const content = fs.readFileSync(diffPath, 'utf-8');
        expect(content).toContain('## 20-Code Spot Check');
        expect(content).toContain('Selection method:');
    });

    test('diff report contains quality scoring section', () => {
        const content = fs.readFileSync(diffPath, 'utf-8');
        expect(content).toContain('## Quality Scoring');
        expect(content).toContain('Combinability');
        expect(content).toContain('Scope');
    });

    test('diff report contains final recommendation', () => {
        const content = fs.readFileSync(diffPath, 'utf-8');
        expect(content).toContain('## Final Recommendation');
        expect(content).toContain('Next Steps');
    });
});
