export interface BlockDefinition {
    id: string;
    label: string;
    description?: string;
}

export const BLOCK_REGISTRY: Record<string, BlockDefinition> = {
    'anesthesia': { id: 'anesthesia', label: 'Anästhesie' },
    'isolation': { id: 'isolation', label: 'Trockenlegung' },
    'conditioning': { id: 'conditioning', label: 'Konditionierung' },
    'matrix_system': { id: 'matrix_system', label: 'Matrizensystem' },
    'technique': { id: 'technique', label: 'Füllungstechnik' },
    'occlusion': { id: 'occlusion', label: 'Okklusion' }, // Not in original groups list but used in prompt
    'finish': { id: 'finish', label: 'Nachbehandlung' }, // Not in original groups list but used in prompt
    'caries_depth': { id: 'caries_depth', label: 'Kariesexkavation' },
    'pulp_capping': { id: 'pulp_capping', label: 'Pulpaschutz' },
    'bmf': { id: 'bmf', label: 'Besondere Maßnahmen' },
    'fluoridation': { id: 'fluoridation', label: 'Fluoridierung' },
    'xray': { id: 'xray', label: 'Röntgen' },
    // Generic fallback
    'default': { id: 'default', label: 'Sonstiges' }
};

export function getBlockLabel(groupId: string): string {
    return BLOCK_REGISTRY[groupId]?.label || groupId;
}
