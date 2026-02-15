export type MaterialCategory =
    | 'composite_universal'
    | 'composite_bulk'
    | 'composite_flowable'
    | 'adhesive_universal'
    | 'adhesive_system'
    | 'etch'
    | 'matrix_sectional'
    | 'matrix_circumferential'
    | 'wedges'
    | 'rubber_dam'
    | 'liners_bases'
    | 'polishing_finishing'
    | 'applicators'
    | 'anesthetic_la';

export interface MaterialCatalogItem {
    id: string;
    category: MaterialCategory;
    label: string; // short UI label
    manufacturer: string;
    productLine?: string;
    notes?: string;
}

export const MATERIAL_CATEGORY_META: Record<MaterialCategory, { label: string; order: number }> = {
    composite_universal: { label: 'Komposit (Universal)', order: 10 },
    composite_bulk: { label: 'Bulk-Fill', order: 20 },
    composite_flowable: { label: 'Flowable / Bulk-Flow', order: 30 },
    adhesive_universal: { label: 'Adhäsiv (Universal)', order: 40 },
    adhesive_system: { label: 'Adhäsiv (Systeme)', order: 50 },
    etch: { label: 'Ätzgel', order: 60 },
    matrix_sectional: { label: 'Matrizen (sektional)', order: 70 },
    matrix_circumferential: { label: 'Matrizen (zirkulär)', order: 80 },
    wedges: { label: 'Keile', order: 90 },
    rubber_dam: { label: 'Kofferdam', order: 100 },
    liners_bases: { label: 'Liner / Base', order: 110 },
    polishing_finishing: { label: 'Finieren / Politur', order: 120 },
    applicators: { label: 'Applikatoren', order: 130 },
    anesthetic_la: { label: 'Lokalanästhetikum', order: 5 },
};

// Curated seed list (P0). Not exhaustive; meant as a practical starting point for DE practices.
export const MATERIAL_CATALOG: MaterialCatalogItem[] = [
    // ───────────────────────────────────────────────────────────
    // Composite (universal / packable)
    // ───────────────────────────────────────────────────────────
    { id: 'comp_universal_tetric_evoceram', category: 'composite_universal', manufacturer: 'Ivoclar', label: 'Tetric EvoCeram', notes: 'Universalkomposit (stopfbar).' },
    { id: 'comp_universal_ceramx_universal', category: 'composite_universal', manufacturer: 'Dentsply Sirona', label: 'ceram.x universal', notes: 'Universalkomposit (Compules).' },
    { id: 'comp_universal_grandioso', category: 'composite_universal', manufacturer: 'VOCO', label: 'GrandioSO', notes: 'Hochgefülltes Universalkomposit.' },
    { id: 'comp_universal_filtek_supreme', category: 'composite_universal', manufacturer: 'Solventum (3M)', label: 'Filtek Supreme XTE', notes: 'Universalkomposit (Nano).' },
    { id: 'comp_universal_harmonize', category: 'composite_universal', manufacturer: 'Kerr', label: 'Harmonize', notes: 'Universalkomposit.' },

    // ───────────────────────────────────────────────────────────
    // Bulk-fill (high viscosity)
    // ───────────────────────────────────────────────────────────
    { id: 'comp_bulk_filtek_one', category: 'composite_bulk', manufacturer: 'Solventum (3M)', label: 'Filtek One Bulk Fill', notes: 'Bulk-Fill, hochviskös.' },
    { id: 'comp_bulk_tetric_powerfill', category: 'composite_bulk', manufacturer: 'Ivoclar', label: 'Tetric PowerFill', notes: 'Bulk-Fill, hochviskös.' },
    { id: 'comp_bulk_sonicfill', category: 'composite_bulk', manufacturer: 'Kerr', label: 'SonicFill', notes: 'Sonic-aktiviertes Bulk-Fill-System.' },

    // ───────────────────────────────────────────────────────────
    // Flowable / Bulk-flow
    // ───────────────────────────────────────────────────────────
    { id: 'comp_flow_tetric_evoflow', category: 'composite_flowable', manufacturer: 'Ivoclar', label: 'Tetric EvoFlow', notes: 'Flowable (Basis/kleine Defekte).' },
    { id: 'comp_flow_sdr_plus', category: 'composite_flowable', manufacturer: 'Dentsply Sirona', label: 'SDR flow+', notes: 'Bulk-Fill Flowable (Base).' },
    { id: 'comp_flow_filtek_bulk_flow', category: 'composite_flowable', manufacturer: 'Solventum (3M)', label: 'Filtek Bulk Fill Flowable', notes: 'Bulk-Fill Flowable (Base).' },

    // ───────────────────────────────────────────────────────────
    // Adhesives
    // ───────────────────────────────────────────────────────────
    { id: 'adh_universal_scotchbond_plus', category: 'adhesive_universal', manufacturer: 'Solventum (3M)', label: 'Scotchbond Universal Plus', notes: 'Universaladhäsiv (1-Flasche).' },
    { id: 'adh_universal_adhese', category: 'adhesive_universal', manufacturer: 'Ivoclar', label: 'AdheSE Universal', notes: 'Universaladhäsiv (VivaPen).' },
    { id: 'adh_universal_onecoat7', category: 'adhesive_universal', manufacturer: 'Coltene', label: 'One Coat 7 Universal', notes: 'Universaladhäsiv (1-Flasche).' },
    { id: 'adh_system_clearfil_se', category: 'adhesive_system', manufacturer: 'Kuraray', label: 'CLEARFIL SE Bond', notes: '2-Schritt Self-Etch (sehr verbreitet).' },
    { id: 'adh_system_scotchbond_mp', category: 'adhesive_system', manufacturer: 'Solventum (3M)', label: 'Scotchbond Multi-Purpose', notes: 'Mehrschritt-System (Total-Etch).' },

    // ───────────────────────────────────────────────────────────
    // Etch (phosphoric acid)
    // ───────────────────────────────────────────────────────────
    { id: 'etch_ultraetch_35', category: 'etch', manufacturer: 'Ultradent', label: 'Ultra-Etch 35%', notes: 'Phosphorsäuregel.' },
    { id: 'etch_totaletch_37', category: 'etch', manufacturer: 'Ivoclar', label: 'Total Etch 37%', notes: 'Phosphorsäuregel.' },
    { id: 'etch_omnietch_37', category: 'etch', manufacturer: 'Omnident', label: 'Omni-Etch 37%', notes: 'Phosphorsäuregel.' },

    // ───────────────────────────────────────────────────────────
    // Matrices / wedges
    // ───────────────────────────────────────────────────────────
    { id: 'matrix_sectional_palodent_v3', category: 'matrix_sectional', manufacturer: 'Dentsply Sirona', label: 'Palodent V3', notes: 'Sektionales Matrizensystem.' },
    { id: 'matrix_sectional_garrison_3d', category: 'matrix_sectional', manufacturer: 'Garrison', label: '3D Fusion', notes: 'Sektionales Matrizensystem.' },
    { id: 'matrix_circ_tofflemire_bands', category: 'matrix_circumferential', manufacturer: 'Polydentia', label: 'Tofflemire Matrizen', notes: 'Zirkuläre Matrizenbänder.' },
    { id: 'wedges_garrison', category: 'wedges', manufacturer: 'Garrison', label: 'Keile (Wedges)', notes: 'Keile/Interdentalwedge.' },
    { id: 'wedges_kerr', category: 'wedges', manufacturer: 'Kerr', label: 'Keile (Wedges)', notes: 'Keile/Interdentalwedge.' },

    // ───────────────────────────────────────────────────────────
    // Rubber dam
    // ───────────────────────────────────────────────────────────
    { id: 'rd_hygenic_latex', category: 'rubber_dam', manufacturer: 'Coltene / Hygenic', label: 'Hygenic Dental Dam', notes: 'Kofferdam (Latex).' },
    { id: 'rd_nictone', category: 'rubber_dam', manufacturer: 'Nictone', label: 'Nictone Dental Dam', notes: 'Kofferdam (Latex).' },

    // ───────────────────────────────────────────────────────────
    // Liners / bases
    // ───────────────────────────────────────────────────────────
    { id: 'liner_theracal_lc', category: 'liners_bases', manufacturer: 'BISCO', label: 'TheraCal LC', notes: 'Calcium-Silikat-Liner.' },
    { id: 'liner_ionostar_plus', category: 'liners_bases', manufacturer: 'VOCO', label: 'IonoStar Plus', notes: 'GIZ / Liner/Base je nach Protokoll.' },
    { id: 'liner_biodentine', category: 'liners_bases', manufacturer: 'Septodont', label: 'Biodentine', notes: 'Calcium-Silikat (Überkappung/Liner).' },

    // ───────────────────────────────────────────────────────────
    // Polishing / finishing
    // ───────────────────────────────────────────────────────────
    { id: 'polish_soflex_xt', category: 'polishing_finishing', manufacturer: 'Solventum (3M)', label: 'Sof-Lex XT', notes: 'Scheiben (Finieren/Politur).' },
    { id: 'polish_soflex_strips', category: 'polishing_finishing', manufacturer: 'Solventum (3M)', label: 'Sof-Lex Strips', notes: 'Finierstreifen approximal.' },
    { id: 'polish_enhance', category: 'polishing_finishing', manufacturer: 'Dentsply Sirona', label: 'Enhance', notes: 'Finierer/Polierer (Points/Cups).' },

    // ───────────────────────────────────────────────────────────
    // Applicators / microbrushes
    // ───────────────────────────────────────────────────────────
    { id: 'app_microbrush_x', category: 'applicators', manufacturer: 'Microbrush', label: 'Microbrush X', notes: 'Applikatoren (Bond/Ätz/Desens).' },
    { id: 'app_omnibrush', category: 'applicators', manufacturer: 'Omnident', label: 'Omnibrush', notes: 'Mikropinsel.' },

    // ───────────────────────────────────────────────────────────
    // Local anesthetics (LA)
    // ───────────────────────────────────────────────────────────
    { id: 'la_ultracain_ds', category: 'anesthetic_la', manufacturer: 'Sanofi', label: 'Ultracain D-S', notes: 'Articain 4% + Adrenalin 1:200.000 (typisch).' },
    { id: 'la_ultracain_ds_forte', category: 'anesthetic_la', manufacturer: 'Sanofi', label: 'Ultracain D-S forte', notes: 'Articain 4% + Adrenalin 1:100.000 (typisch).' },
    { id: 'la_ubistesin', category: 'anesthetic_la', manufacturer: '3M ESPE', label: 'Ubistesin', notes: 'Articain 4% + Adrenalin (je nach Variante).' },
    { id: 'la_ubistesin_forte', category: 'anesthetic_la', manufacturer: '3M ESPE', label: 'Ubistesin forte', notes: 'Articain 4% + Adrenalin 1:100.000 (typisch).' },
    { id: 'la_septanest', category: 'anesthetic_la', manufacturer: 'Septodont', label: 'Septanest', notes: 'Articain 4% + Adrenalin (je nach Variante).' },
];

export function listMaterialsByCategory(category: MaterialCategory): MaterialCatalogItem[] {
    return MATERIAL_CATALOG.filter(i => i.category === category);
}

export function getMaterialById(id: string | undefined | null): MaterialCatalogItem | undefined {
    if (!id) return undefined;
    return MATERIAL_CATALOG.find(i => i.id === id);
}

export function getMaterialLabelById(id: string | undefined | null): string | undefined {
    const item = getMaterialById(id);
    if (!item) return undefined;
    return item.label;
}
