/**
 * Procedure Coverage Audit
 *
 * Compares KB chips (unified.json) with Bundle-Meta coverage.
 * Coverage sources: chipIds + textRefIds + billingRefIds.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { getBundleMetaForTreatment } from '../../src/docudent/v10/procedure/bundleMeta';
import { DEFAULT_DOC_CHIPS } from '../../src/docudent/v10/settings/docStandardChips';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');

type KbChip = { id: string; category?: string };

const TREATMENTS = [
    { id: 'fuellung', kb: 'fuellung' },
    { id: 'endo', kb: 'endo' },
    { id: 'extraction', kb: 'extraction' },
    { id: 'pzr', kb: 'pzr' },
    { id: 'crown_prep', kb: 'crown_prep' },
];

function readKbChips(treatmentKb: string): KbChip[] {
    const kbPath = path.join(ROOT, 'src/docudent/core/billing/knowledgeBase/treatments', treatmentKb, 'unified.json');
    const raw = fs.readFileSync(kbPath, 'utf8');
    const kb = JSON.parse(raw);
    return (kb.chips ?? []).filter(Boolean);
}

function collectBundleChipIds(treatmentId: string): Set<string> {
    const meta = getBundleMetaForTreatment(treatmentId);
    const ids = new Set<string>();
    for (const bundle of meta?.bundles ?? []) {
        for (const id of bundle.chipIds ?? []) ids.add(String(id));
        for (const id of bundle.textRefIds ?? []) ids.add(String(id));
        for (const id of bundle.billingRefIds ?? []) ids.add(String(id));
    }
    return ids;
}

function groupByCategory(chips: KbChip[]): Record<string, string[]> {
    const groups: Record<string, string[]> = {};
    for (const chip of chips) {
        const key = chip.category ?? 'uncategorized';
        if (!groups[key]) groups[key] = [];
        groups[key].push(chip.id);
    }
    return groups;
}

function main() {
    const date = new Date().toISOString().slice(0, 10);
    const standardDocChipIds = new Set(DEFAULT_DOC_CHIPS.map(item => item.id));

    const lines: string[] = [
        '# Procedure Coverage Report',
        '',
        `Stand: ${date}`,
        '',
        'Coverage = Bundle‑Meta `chipIds` + `textRefIds` + `billingRefIds`.',
        'Default‑Dokuchips (`contract.standard_chips`) gelten als Coverage.',
        '',
    ];

    for (const treatment of TREATMENTS) {
        const kbChips = readKbChips(treatment.kb);
        const kbChipIds = new Set(kbChips.map(c => c.id));
        const covered = collectBundleChipIds(treatment.id);
        const missing = kbChips.filter(c => !covered.has(c.id) && !standardDocChipIds.has(c.id));
        const coveredByStandard = kbChips
            .filter(c => !covered.has(c.id) && standardDocChipIds.has(c.id))
            .map(c => c.id);
        const extra = Array.from(covered).filter(id => !kbChipIds.has(id));

        lines.push(`## ${treatment.id}`);
        lines.push(`- KB chips: ${kbChips.length}`);
        lines.push(`- Covered chips: ${covered.size}`);
        lines.push(`- Missing chips: ${missing.length}`);
        lines.push(`- Extra (nicht in KB): ${extra.length}`);
        lines.push('');

        if (coveredByStandard.length > 0) {
            lines.push('### Covered via Standard‑Chips (Settings)');
            lines.push(...coveredByStandard.sort().map(id => `- ${id}`));
            lines.push('');
        }

        if (missing.length > 0) {
            lines.push('### Missing by category');
            const grouped = groupByCategory(missing);
            for (const [category, ids] of Object.entries(grouped)) {
                lines.push(`- ${category}: ${ids.length}`);
                lines.push(...ids.sort().map(id => `  - ${id}`));
            }
            lines.push('');
        }

        if (extra.length > 0) {
            lines.push('### Extra (Bundle‑Meta, nicht in KB)');
            lines.push(...extra.sort().map(id => `- ${id}`));
            lines.push('');
        }
    }

    const reportPath = path.join(ROOT, 'docs/system-atlas/procedure', `coverage-report-${date}.md`);
    fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');
    console.log(`Wrote: ${reportPath}`);
}

main();
