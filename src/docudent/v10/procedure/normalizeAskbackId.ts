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
        roentgen_indikation: 'radiology_indication',
        roentgen_typ: 'radiology_type',
        roentgen_zeitpunkt: 'radiology_timing',
        roentgen_befund: 'radiology_findings',
        xray_indication: 'radiology_indication',
        xray_type: 'radiology_type',
        xray_timing: 'radiology_timing',
        xray_findings: 'radiology_findings',
    };

    return aliasMap[key] ?? key;
}
