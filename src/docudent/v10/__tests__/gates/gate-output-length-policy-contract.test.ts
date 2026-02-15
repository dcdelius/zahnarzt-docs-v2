import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

type Snippets = { kurz?: string; mittel?: string; lang?: string };

const TREATMENTS = ['fuellung', 'endo', 'extraction', 'pzr', 'crown_prep'] as const;

function assertLengthMonotonic(snippets: Snippets, label: string) {
    expect(snippets.kurz, `${label}: missing kurz`).toBeDefined();
    expect(snippets.mittel, `${label}: missing mittel`).toBeDefined();
    expect(snippets.lang, `${label}: missing lang`).toBeDefined();
    expect((snippets.kurz ?? '').length, `${label}: kurz > mittel`).toBeLessThanOrEqual((snippets.mittel ?? '').length);
    expect((snippets.mittel ?? '').length, `${label}: mittel > lang`).toBeLessThanOrEqual((snippets.lang ?? '').length);
}

describe('gate: deterministic output length policy (chips + disclosures)', () => {
    it('all treatment chips define kurz/mittel/lang with monotonic length', () => {
        for (const treatmentId of TREATMENTS) {
            const filePath = path.resolve(
                process.cwd(),
                'src/docudent/core/billing/knowledgeBase/treatments',
                treatmentId,
                'unified.json'
            );
            const json = JSON.parse(fs.readFileSync(filePath, 'utf8')) as { chips?: Array<{ id: string; textSnippets?: Snippets }> };
            for (const chip of json.chips ?? []) {
                assertLengthMonotonic(chip.textSnippets ?? {}, `${treatmentId}:${chip.id}`);
            }
        }
    });

    it('all disclosures define kurz/mittel/lang with monotonic length', () => {
        const filePath = path.resolve(
            process.cwd(),
            'src/docudent/core/billing/knowledgeBase/disclosures/standard_disclosures.json'
        );
        const json = JSON.parse(fs.readFileSync(filePath, 'utf8')) as { disclosures?: Array<{ id: string; textSnippets?: Snippets }> };
        for (const disclosure of json.disclosures ?? []) {
            assertLengthMonotonic(disclosure.textSnippets ?? {}, `disclosure:${disclosure.id}`);
        }
    });
});
