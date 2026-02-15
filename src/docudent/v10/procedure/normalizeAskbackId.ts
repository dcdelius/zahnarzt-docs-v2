export function normalizeAskbackId(id: string): string {
    let key = id
        .replace(/::tooth:\d+$/, '')
        .replace(/^medical_/, '')
        .replace(/^askback-/, '')
        .replace(/^ab_/, '')
        .replace(/-/g, '_')
        .replace(/^fuellung_/, '')
        .replace(/^endo_/, '');

    const aliasMap: Record<string, string> = {
        adhesive: 'adhesive_technique',
        adhesive_technik: 'adhesive_technique',
        vipr: 'vitality',
        perk: 'percussion',
        perkussion: 'percussion',
    };

    return aliasMap[key] ?? key;
}
