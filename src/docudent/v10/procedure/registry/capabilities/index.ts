import type { Capability, ProcedureNode } from '../../types';
import { buildProcedureNodesFromBundles } from '../../events/buildProcedureNodes';
import { commonEventBundles } from '../../events/common';

export const capabilityCommonAnesthesia: Capability = {
    id: 'capability.common.anesthesia',
    providesNodes: [
        'common.anesthesia.surface',
        'common.anesthesia.infiltration',
        'common.anesthesia.block',
        'common.anesthesia.ila',
    ],
    providesChips: ['oberflaeche_la', 'la_infiltr', 'la_leitung', 'la_ila'],
    settingsSchemaRef: 'settings.common.anesthesia',
    askbacksRef: 'askbacks.common.anesthesia',
};

export const capabilityCommonIsolation: Capability = {
    id: 'capability.common.isolation',
    providesNodes: ['common.isolation.kofferdam', 'common.isolation.relative'],
    providesChips: ['kofferdam', 'rel_trocken'],
    settingsSchemaRef: 'settings.common.isolation',
    askbacksRef: 'askbacks.common.isolation',
};

export const capabilityNodes: ProcedureNode[] = buildProcedureNodesFromBundles(commonEventBundles);

export const capabilities: Capability[] = [
    capabilityCommonAnesthesia,
    capabilityCommonIsolation,
];
