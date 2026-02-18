/**
 * V10 KZV Template Loaders — minimal loading for composer
 */

import { assertKnownTreatment, hasCapability, type TreatmentId } from './treatmentRegistry';
import {
    loadTemplateConfig as loadCoreTemplateConfig,
    loadFindingMapConfig as loadCoreFindingMapConfig,
} from '@/docudent/core/billing/knowledgeBase/registry/loaders';

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

export function loadTemplateConfig(treatmentId: string): TemplateConfig | null {
    assertKnownTreatment(treatmentId);
    const id = treatmentId as TreatmentId;
    if (!hasCapability(id, 'hasTemplate')) return null;
    return loadCoreTemplateConfig(id) as TemplateConfig | null;
}

export function loadFindingMapConfig(treatmentId: string): FindingMapConfig | null {
    assertKnownTreatment(treatmentId);
    const id = treatmentId as TreatmentId;
    if (!hasCapability(id, 'hasFindingMap')) return null;
    return loadCoreFindingMapConfig(id) as FindingMapConfig | null;
}
