/**
 * V10 KZV Template Loaders — minimal loading for composer
 */

import { assertKnownTreatment, hasCapability, type TreatmentId } from './treatmentRegistry';

export interface TemplateConfig {
    _meta: { treatmentId?: string; version?: string };
    sections: Array<Record<string, unknown>>;
}

export interface FindingMapConfig {
    _meta: { treatmentId?: string; version?: string };
    fields: Record<string, Record<string, unknown>>;
    sectionOrder?: string[];
    rendering?: Record<string, unknown>;
}

// Static imports (Vite-friendly)
import fuellungTemplate from '../treatments/fuellung/template.json';
import fuellungFindingMap from '../treatments/fuellung/finding_map.json';
import endoTemplate from '../treatments/endo/template.json';
import endoFindingMap from '../treatments/endo/finding_map.json';

const templateConfigs: Record<TreatmentId, TemplateConfig> = {
    fuellung: fuellungTemplate as unknown as TemplateConfig,
    endo: endoTemplate as unknown as TemplateConfig,
};

const findingMapConfigs: Record<TreatmentId, FindingMapConfig> = {
    fuellung: fuellungFindingMap as unknown as FindingMapConfig,
    endo: endoFindingMap as unknown as FindingMapConfig,
};

export function loadTemplateConfig(treatmentId: string): TemplateConfig | null {
    assertKnownTreatment(treatmentId);
    const id = treatmentId as TreatmentId;
    if (!hasCapability(id, 'hasTemplate')) return null;
    return templateConfigs[id];
}

export function loadFindingMapConfig(treatmentId: string): FindingMapConfig | null {
    assertKnownTreatment(treatmentId);
    const id = treatmentId as TreatmentId;
    if (!hasCapability(id, 'hasFindingMap')) return null;
    return findingMapConfigs[id];
}
