import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { getBundleMetaForTreatment } from '../../procedure/bundleMeta';

type TemplateSection = { source?: string; disclosureIds?: string[]; includeDisclosure?: string };

const templatePaths: Record<string, string> = {
    fuellung: path.resolve(__dirname, '../../..', 'core/billing/knowledgeBase/treatments/fuellung/template.json'),
    endo: path.resolve(__dirname, '../../..', 'core/billing/knowledgeBase/treatments/endo/template.json'),
    extraction: path.resolve(__dirname, '../../..', 'core/billing/knowledgeBase/treatments/extraction/template.json'),
    pzr: path.resolve(__dirname, '../../..', 'core/billing/knowledgeBase/treatments/pzr/template.json'),
    crown_prep: path.resolve(__dirname, '../../..', 'core/billing/knowledgeBase/treatments/crown_prep/template.json'),
};

const readTemplateDisclosureIds = (treatmentId: string): Set<string> => {
    const templatePath = templatePaths[treatmentId];
    const raw = fs.readFileSync(templatePath, 'utf-8');
    const template = JSON.parse(raw) as { sections?: TemplateSection[] };
    const ids = new Set<string>();
    for (const section of template.sections ?? []) {
        if (section.source === 'disclosures' && Array.isArray(section.disclosureIds)) {
            for (const id of section.disclosureIds) {
                if (id) ids.add(String(id));
            }
        }
        if (section.includeDisclosure) {
            ids.add(String(section.includeDisclosure));
        }
    }
    return ids;
};

const readBundleDisclosureIds = (treatmentId: string): Set<string> => {
    const meta = getBundleMetaForTreatment(treatmentId);
    const ids = new Set<string>();
    for (const bundle of meta?.bundles ?? []) {
        for (const id of bundle.disclosureIds ?? []) {
            if (id) ids.add(String(id));
        }
    }
    return ids;
};

describe('Bundle meta disclosure coverage', () => {
    const treatments = Object.keys(templatePaths);

    it('covers template disclosure ids for each treatment', () => {
        for (const treatmentId of treatments) {
            const templateDisclosureIds = readTemplateDisclosureIds(treatmentId);
            const bundleDisclosureIds = readBundleDisclosureIds(treatmentId);
            for (const id of templateDisclosureIds) {
                expect(bundleDisclosureIds.has(id)).toBe(true);
            }
        }
    });
});
