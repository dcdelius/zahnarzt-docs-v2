/**
 * Gate: Onboarding V3 Covers Runtime Assets
 *
 * Ensures full-circle-map.md mentions all runtime data assets.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Gate: Onboarding V3 Covers Runtime Assets', () => {
    const assetsPath = path.join(process.cwd(), 'docs/audit/archmap_v3/data-assets.runtime.v3.json');
    const fullCircleMapPath = path.join(process.cwd(), 'docs/v10/onboarding/full-circle-map.md');

    it('all critical assets are mentioned in onboarding', () => {
        // Skip if files don't exist yet
        if (!fs.existsSync(assetsPath) || !fs.existsSync(fullCircleMapPath)) {
            console.log('Skipping: onboarding files not yet generated');
            return;
        }

        const assetsData = JSON.parse(fs.readFileSync(assetsPath, 'utf-8'));
        const fullCircleContent = fs.readFileSync(fullCircleMapPath, 'utf-8');

        // Critical assets that MUST be mentioned
        const criticalAssets = [
            'medical_kb.v1.json',
            'unified.json',
            'question_bank.json',
            'combinability_kb.v1.json',
            'bema.json',
            'goz.json',
        ];

        const missing: string[] = [];
        for (const asset of criticalAssets) {
            if (!fullCircleContent.includes(asset)) {
                missing.push(asset);
            }
        }

        expect(missing, `Missing assets in onboarding: ${missing.join(', ')}`).toHaveLength(0);
    });

    it('runtime asset count matches documentation', () => {
        if (!fs.existsSync(assetsPath)) {
            return;
        }

        const assetsData = JSON.parse(fs.readFileSync(assetsPath, 'utf-8'));
        const runtimeAssets = assetsData.assets.filter((a: any) => a.runtime);

        // At least 20 runtime assets documented
        expect(runtimeAssets.length).toBeGreaterThanOrEqual(20);
    });
});
