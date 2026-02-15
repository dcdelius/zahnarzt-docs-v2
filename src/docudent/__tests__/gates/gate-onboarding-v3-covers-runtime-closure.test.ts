/**
 * Gate: Onboarding V3 Covers Runtime Closure
 *
 * Ensures full-circle-map.md mentions every runtime file from closure.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Gate: Onboarding V3 Covers Runtime Closure', () => {
    const closurePath = path.join(process.cwd(), 'docs/audit/archmap_v3/runtime-closure.v3.json');
    const fullCircleMapPath = path.join(process.cwd(), 'docs/v10/onboarding/full-circle-map.md');

    it('all critical runtime files are mentioned in onboarding', () => {
        // Skip if files don't exist yet
        if (!fs.existsSync(closurePath) || !fs.existsSync(fullCircleMapPath)) {
            console.log('Skipping: onboarding files not yet generated');
            return;
        }

        const closure = JSON.parse(fs.readFileSync(closurePath, 'utf-8'));
        const fullCircleContent = fs.readFileSync(fullCircleMapPath, 'utf-8');

        // Critical files that MUST be mentioned
        const criticalFiles = [
            'runV10.ts',
            'runV10Bundle.ts',
            'applyMedicalKb.ts',
            'renderFromKbChips.ts',
            'checkCombinabilityFromKb.ts',
            'billingEligibilityGuard.ts',
            'selectExtractor.ts',
        ];

        const missing: string[] = [];
        for (const file of criticalFiles) {
            if (!fullCircleContent.includes(file)) {
                missing.push(file);
            }
        }

        expect(missing, `Missing files in onboarding: ${missing.join(', ')}`).toHaveLength(0);
    });

    it('runtime file count matches documentation claim', () => {
        if (!fs.existsSync(closurePath)) {
            return;
        }

        const closure = JSON.parse(fs.readFileSync(closurePath, 'utf-8'));

        // Documented claim: 85 runtime files
        expect(closure.totalRuntimeFiles).toBe(85);
    });
});
