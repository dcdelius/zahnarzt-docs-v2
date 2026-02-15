import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { getBundleMetaForTreatment } from '../../procedure/bundleMeta';
import { DEFAULT_DOC_CHIPS } from '../../settings/docStandardChips';

type UnifiedFile = {
    chips?: Array<{ id: string }>;
};

const TREATMENTS = ['fuellung', 'endo', 'extraction', 'pzr', 'crown_prep'];

function loadUnifiedChips(treatmentId: string): string[] {
    const filePath = path.resolve(
        process.cwd(),
        'src/docudent/core/billing/knowledgeBase/treatments',
        treatmentId,
        'unified.json'
    );
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8')) as UnifiedFile;
    return (data.chips ?? []).map(chip => chip.id).filter(Boolean);
}

function collectBundleCoverage(treatmentId: string): Set<string> {
    const meta = getBundleMetaForTreatment(treatmentId);
    const covered = new Set<string>();
    for (const bundle of meta?.bundles ?? []) {
        for (const id of bundle.chipIds ?? []) covered.add(id);
        for (const id of bundle.textRefIds ?? []) covered.add(id);
        for (const id of bundle.billingRefIds ?? []) covered.add(id);
        if (bundle.chipsFromContractKey === 'standardChips') {
            for (const chip of DEFAULT_DOC_CHIPS) {
                covered.add(chip.id);
            }
        }
    }
    return covered;
}

describe('Gate: Procedure coverage (KB chips → Bundle meta)', () => {
    it('covers all unified chips per treatment', () => {
        for (const treatmentId of TREATMENTS) {
            const unifiedChips = loadUnifiedChips(treatmentId);
            const covered = collectBundleCoverage(treatmentId);
            const missing = unifiedChips.filter(id => !covered.has(id));
            if (missing.length > 0) {
                console.log(`[COVERAGE] ${treatmentId} missing:`, missing);
            }
            expect(missing).toEqual([]);
        }
    });
});
