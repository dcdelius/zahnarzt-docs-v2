import { FILLING_HIGH_PERFORMANCE } from './fillingHighPerformance';
import { TemplateStore } from '../storage/templateStore';

// 1. Define Treatment Types (Comprehensive List)
export interface TreatmentType {
    id: string;
    label: string;
    category: 'conservative' | 'prosthetics' | 'surgery' | 'prophylaxis' | 'admin';
    icon?: string;
    enabledByDefault?: boolean;
}

export const TREATMENT_TYPES: TreatmentType[] = [
    // Conservative / Erhaltend
    { id: 'filling', label: 'Füllungstherapie', category: 'conservative', icon: '🦷', enabledByDefault: true },
    { id: 'endo', label: 'Endodontie', category: 'conservative', icon: '⚡', enabledByDefault: true },
    { id: 'consultation', label: 'Beratung / 01', category: 'admin', icon: '🗣️', enabledByDefault: true },
    { id: 'prophylaxis', label: 'PZR / Prophylaxe', category: 'prophylaxis', icon: '✨', enabledByDefault: true },
    { id: 'pain', label: 'Schmerzbehandlung', category: 'conservative', icon: '🚑', enabledByDefault: true },

    // Prosthetics / Zahnersatz
    { id: 'crown_prep', label: 'Krone (Präp)', category: 'prosthetics', icon: '👑' },
    { id: 'crown_insert', label: 'Krone (Einsetzen)', category: 'prosthetics', icon: '⬇️' },
    { id: 'bridge_prep', label: 'Brücke (Präp)', category: 'prosthetics', icon: '🌉' },
    { id: 'bridge_insert', label: 'Brücke (Einsetzen)', category: 'prosthetics', icon: '⬇️' },
    { id: 'veneer', label: 'Veneers', category: 'prosthetics', icon: '💎' },
    { id: 'prosthesis_total', label: 'Totalprothese', category: 'prosthetics', icon: '🦷' },
    { id: 'prosthesis_partial', label: 'Teilprothese', category: 'prosthetics', icon: '🧩' },
    { id: 'repair', label: 'Reparatur', category: 'prosthetics', icon: '🔧' },

    // Surgery / Chirurgie
    { id: 'extraction', label: 'Extraktion', category: 'surgery', icon: '🔨', enabledByDefault: true },
    { id: 'osteotomy', label: 'Osteotomie', category: 'surgery', icon: '🔪' },
    { id: 'implant_surgery', label: 'Implantat (OP)', category: 'surgery', icon: '🔩' },
    { id: 'implant_prosthetics', label: 'Implantat (Supra)', category: 'prosthetics', icon: '🔩' },
    { id: 'augmentation', label: 'Knochenaufbau', category: 'surgery', icon: '🧱' },
    { id: 'resection', label: 'WSR', category: 'surgery', icon: '✂️' },
    { id: 'abscess', label: 'Abszess', category: 'surgery', icon: '💥' },

    // Paro / PA
    { id: 'pa_status', label: 'PA-Status', category: 'conservative', icon: '📏' },
    { id: 'pa_therapy', label: 'AIT / PMPR', category: 'conservative', icon: '🧹' },
    { id: 'pa_surgery', label: 'Offene Kürettage', category: 'surgery', icon: '🔪' },
    { id: 'upt', label: 'UPT', category: 'prophylaxis', icon: '🔄' },

    // Kids / KFO
    { id: 'kids_check', label: 'Kinder-U', category: 'prophylaxis', icon: '🧸' },
    { id: 'fissure_seal', label: 'Versiegelung', category: 'prophylaxis', icon: '🛡️' },
    { id: 'kfo_check', label: 'KFO-Check', category: 'admin', icon: '😬' },

    // Admin / Other
    { id: 'cmd', label: 'CMD / Schiene', category: 'conservative', icon: '🦴' },
    { id: 'bleaching', label: 'Bleaching', category: 'prophylaxis', icon: '✨' },
    { id: 'misc', label: 'Sonstiges', category: 'admin', icon: '📝' }
];

import { MASTER_FILL_V3_BLUEPRINT } from './master_fill_v3_blueprint';

// 2. Define Built-in Template Registry
// Blueprint template is primary (has actual blueprint content)
export const BUILT_IN_TEMPLATES: Record<string, any> = {
    'master_fill_v3_blueprint': MASTER_FILL_V3_BLUEPRINT,
    'master_fill_v3': FILLING_HIGH_PERFORMANCE,
};

// Backwards compatibility alias
export const TEMPLATES = BUILT_IN_TEMPLATES;

// 3. Accessors (Merging Built-in + Admin)

export const getTemplate = (id: string) => {
    // 1. Check Admin Store (Override)
    const adminTemplate = TemplateStore.getTemplate(id);
    if (adminTemplate) return adminTemplate;

    // 2. Check Built-in
    return BUILT_IN_TEMPLATES[id];
};

export const getTemplateOrThrow = (id: string) => {
    const t = getTemplate(id);
    if (!t) throw new Error(`Template not found in registry: ${id}`);
    return t;
};

// German → English treatment type mapping
const TREATMENT_ID_ALIASES: Record<string, string> = {
    'fuellung': 'filling',
    'extraktion': 'extraction',
    'wurzelbehandlung': 'endo',
    'pzr': 'prophylaxis',
    'beratung': 'consultation',
};

export const getTemplatesForTreatment = (treatmentId: string) => {
    // Normalize German IDs to English catalog IDs
    const normalizedId = TREATMENT_ID_ALIASES[treatmentId] || treatmentId;

    // 1. Built-in - filter for treatment type
    const builtIn = Object.values(BUILT_IN_TEMPLATES).filter(t =>
        t.treatmentType === normalizedId || (normalizedId === 'filling' && t.id?.includes('fill'))
    );

    // 2. Admin (also use normalized ID for consistent filtering)
    const admin = TemplateStore.loadAdminTemplates().filter(t =>
        t.treatmentType === normalizedId || t.treatmentType === treatmentId
    );

    // 3. Merge (Admin overrides Built-in by ID)
    const merged = new Map();
    // Prioritize templates WITH blueprints
    builtIn.filter(t => t.blueprint).forEach(t => merged.set(t.id, t));
    builtIn.filter(t => !t.blueprint).forEach(t => { if (!merged.has(t.id)) merged.set(t.id, t) });
    admin.forEach(t => merged.set(t.id, t));

    return Array.from(merged.values());
};

export const getTreatmentType = (id: string) => TREATMENT_TYPES.find(t => t.id === id);
