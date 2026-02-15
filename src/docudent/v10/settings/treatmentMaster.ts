/**
 * Treatment Master Registry
 * 
 * Central source of truth for all dental treatments.
 * Structure matches existing definition.json pattern.
 * Medical/billing details to be added per treatment.
 * 
 * Target sources for verification:
 * - KZBV: BEMA (Stand 01.01.2026)
 * - KZBV/BMJ: GOZ (2012)
 * - G-BA Richtlinien (e.g. PAR)
 */

// ═══════════════════════════════════════════════════════════════
// TREATMENT CATEGORIES
// ═══════════════════════════════════════════════════════════════

export const TREATMENT_CATEGORIES = {
    konservierend: { label: 'Konservierend', order: 1 },
    endodontie: { label: 'Endodontie', order: 2 },
    chirurgie: { label: 'Chirurgie', order: 3 },
    parodontologie: { label: 'Parodontologie', order: 4 },
    prophylaxe: { label: 'Prophylaxe', order: 5 },
    prothetik_fest: { label: 'Prothetik (festsitzend)', order: 6 },
    prothetik_heraus: { label: 'Prothetik (herausnehmbar)', order: 7 },
    aesthetik: { label: 'Ästhetik', order: 8 },
    funktion: { label: 'Funktionstherapie', order: 9 },
    kinderzahn: { label: 'Kinderzahnheilkunde', order: 10 },
    diagnostik: { label: 'Diagnostik', order: 11 },
    notfall: { label: 'Notfall', order: 12 },
} as const;

export type TreatmentCategory = keyof typeof TREATMENT_CATEGORIES;

// ═══════════════════════════════════════════════════════════════
// TREATMENT DEFINITION TYPE
// ═══════════════════════════════════════════════════════════════

export interface TreatmentDefinition {
    id: string;
    version: string;
    label: string;
    labelShort: string;
    category: TreatmentCategory;
    icon?: string;

    /** Keywords for detection from dictation */
    detection: {
        keywords: string[];
        conditions?: Record<string, unknown>;
    };

    /** Workflow phases */
    workflow: {
        phases: Array<{
            id: string;
            label: string;
            steps: string[];
        }>;
    };

    /** Required documentation fields */
    documentation: {
        required: Array<{ field: string; label: string }>;
        recommended?: Array<{ field: string; label: string }>;
        forensic?: Array<{ field: string; label: string }>;
    };

    /** User-configurable defaults */
    configurableDefaults?: string[];
}

// ═══════════════════════════════════════════════════════════════
// TREATMENT DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export const TREATMENT_DEFINITIONS: Record<string, TreatmentDefinition> = {

    // ─────────────────────────────────────────────────────────────
    // KONSERVIEREND
    // ─────────────────────────────────────────────────────────────

    fuellung: {
        id: 'fuellung',
        version: '1.0.0',
        label: 'Füllung / Restauration',
        labelShort: 'Füllung',
        category: 'konservierend',
        icon: 'fill',
        detection: {
            keywords: ['füllung', 'fuellung', 'filling', 'komposit', 'kavität', 'karies'],
        },
        workflow: {
            phases: [
                { id: 'vorbereitung', label: 'Vorbereitung', steps: ['Diagnosestellung', 'Aufklärung', 'Anästhesie'] },
                { id: 'praeparation', label: 'Präparation', steps: ['Trockenlegung', 'Kariesexkavation', 'Kavitätenkontrolle'] },
                { id: 'restauration', label: 'Restauration', steps: ['Überkappung (wenn nötig)', 'Adhäsivtechnik', 'Schichtung', 'Lichthärtung'] },
                { id: 'finishing', label: 'Finishing', steps: ['Ausarbeitung', 'Okklusionskontrolle', 'Politur'] },
            ],
        },
        documentation: {
            required: [
                { field: 'tooth', label: 'Zahnnummer' },
                { field: 'surfaces', label: 'Flächen' },
                { field: 'diagnosis', label: 'Diagnose' },
                { field: 'material', label: 'Material' },
            ],
            recommended: [
                { field: 'isolation', label: 'Trockenlegung' },
                { field: 'capping', label: 'Überkappung' },
                { field: 'adhesiveSystem', label: 'Adhäsivsystem' },
            ],
        },
        configurableDefaults: ['material', 'isolation', 'adhesive', 'anesthesia'],
    },

    ueberkappung: {
        id: 'ueberkappung',
        version: '1.0.0',
        label: 'Überkappung',
        labelShort: 'Cp/P',
        category: 'konservierend',
        icon: 'shield',
        detection: {
            keywords: ['überkappung', 'cp', 'capping', 'pulpanah', 'pulpaeröffnung', 'biodentin', 'mta'],
        },
        workflow: {
            phases: [
                { id: 'diagnose', label: 'Diagnose', steps: ['Kariesexkavation', 'Pulpazustand prüfen'] },
                { id: 'therapie', label: 'Therapie', steps: ['Blutstillung (bei direkt)', 'Überkappungsmaterial applizieren', 'Abdeckung'] },
            ],
        },
        documentation: {
            required: [
                { field: 'tooth', label: 'Zahnnummer' },
                { field: 'cappingType', label: 'Art (direkt/indirekt)' },
                { field: 'material', label: 'Material (Ca(OH)2, MTA, Biodentin)' },
            ],
            recommended: [
                { field: 'diagnosis', label: 'Diagnose / Pulpastatus' },
                { field: 'isolation', label: 'Trockenlegung' },
                { field: 'followUp', label: 'Kontrolle / Recall' },
            ],
            forensic: [
                { field: 'pulpaOpen', label: 'Pulpa eröffnet?' },
                { field: 'bleedingControlled', label: 'Blutung kontrolliert?' },
            ],
        },
        configurableDefaults: ['cappingMaterial'],
    },

    // ─────────────────────────────────────────────────────────────
    // ENDODONTIE
    // ─────────────────────────────────────────────────────────────

    endo: {
        id: 'endo',
        version: '1.0.0',
        label: 'Wurzelkanalbehandlung',
        labelShort: 'Endo',
        category: 'endodontie',
        icon: 'tooth-root',
        detection: {
            keywords: ['endo', 'wurzelkanal', 'wurzelbehandlung', 'wk', 'trepanation', 'aufbereitung', 'wurzelfüllung'],
        },
        workflow: {
            phases: [
                { id: 'eroeffnung', label: 'Eröffnung', steps: ['Anästhesie', 'Kofferdam', 'Trepanation', 'Kanaldarstellung'] },
                { id: 'aufbereitung', label: 'Aufbereitung', steps: ['Arbeitslänge (elektrisch/Rö)', 'Aufbereitung (maschinell/manuell)', 'Spülung (NaOCl, EDTA)'] },
                { id: 'fuellung', label: 'Füllung', steps: ['Trocknung', 'Wurzelfüllung (Guttapercha)', 'Kontrolle (Rö)'] },
                { id: 'aufbau', label: 'Aufbau', steps: ['Adhäsiver Aufbau', 'Postendodontische Versorgung'] },
            ],
        },
        documentation: {
            required: [
                { field: 'tooth', label: 'Zahnnummer' },
                { field: 'canalCount', label: 'Kanalanzahl' },
                { field: 'workingLength', label: 'Arbeitslängen' },
                { field: 'diagnosis', label: 'Diagnose (Pulpitis/Gangrän)' },
            ],
            recommended: [
                { field: 'irrigationProtocol', label: 'Spülprotokoll' },
                { field: 'wfTechnique', label: 'WF-Technik (kalt/warm)' },
                { field: 'einlage', label: 'Med. Einlage' },
            ],
            forensic: [
                { field: 'xrayPreOp', label: 'Rö präop' },
                { field: 'xrayPostOp', label: 'Rö postop' },
                { field: 'wlMethod', label: 'AL-Methode' },
            ],
        },
        configurableDefaults: ['irrigationProtocol', 'wlMethod', 'wfTechnique', 'defaultEinlage'],
    },

    // ─────────────────────────────────────────────────────────────
    // CHIRURGIE
    // ─────────────────────────────────────────────────────────────

    extraction: {
        id: 'extraction',
        version: '1.0.0',
        label: 'Zahnextraktion',
        labelShort: 'Extraktion',
        category: 'chirurgie',
        icon: 'extraction',
        detection: {
            keywords: ['extraktion', 'x', 'zahn ziehen', 'entfernung', 'ex'],
        },
        workflow: {
            phases: [
                { id: 'vorbereitung', label: 'Vorbereitung', steps: ['Diagnostik', 'Röntgen', 'Aufklärung', 'Anästhesie'] },
                { id: 'eingriff', label: 'Eingriff', steps: ['Syndesmotomie', 'Luxation', 'Extraktion'] },
                { id: 'wundversorgung', label: 'Wundversorgung', steps: ['Alveolenkontrolle', 'Glätten Knochenkanten', 'Kompression/Naht'] },
            ],
        },
        documentation: {
            required: [
                { field: 'tooth', label: 'Zahnnummer' },
                { field: 'indication', label: 'Indikation' },
                { field: 'anesthesia', label: 'Anästhesie' },
            ],
            recommended: [
                { field: 'complications', label: 'Komplikationen' },
                { field: 'woundClosure', label: 'Wundverschluss' },
            ],
            forensic: [
                { field: 'xray', label: 'Röntgenbefund' },
                { field: 'aufklaerung', label: 'Aufklärung erfolgt' },
            ],
        },
        configurableDefaults: ['anesthesia'],
    },

    osteotomie: {
        id: 'osteotomie',
        version: '1.0.0',
        label: 'Operative Zahnentfernung',
        labelShort: 'Osteotomie',
        category: 'chirurgie',
        icon: 'scalpel',
        detection: {
            keywords: ['osteotomie', 'ost', 'operativ', 'aufklappung', 'weisheitszahn', '8er'],
        },
        workflow: {
            phases: [
                { id: 'vorbereitung', label: 'Vorbereitung', steps: ['Diagnostik (OPG/DVT)', 'Nervverlaufprüfung', 'Aufklärung schriftlich', 'Anästhesie'] },
                { id: 'eingriff', label: 'Eingriff', steps: ['Schnittführung', 'Mukoperiostlappen', 'Osteotomie', 'Zahnteilung (wenn nötig)', 'Entfernung'] },
                { id: 'wundversorgung', label: 'Wundversorgung', steps: ['Wundrevision', 'Glätten Knochen', 'Nahtverschluss'] },
            ],
        },
        documentation: {
            required: [
                { field: 'tooth', label: 'Zahnnummer' },
                { field: 'indication', label: 'Indikation (retiniert/verlagert)' },
                { field: 'technique', label: 'OP-Technik' },
                { field: 'suture', label: 'Nahtmaterial' },
            ],
            recommended: [
                { field: 'flapType', label: 'Lappen / Schnittfuehrung' },
                { field: 'toothSectioning', label: 'Zahnteilung (ja/nein)' },
                { field: 'postOpInstructions', label: 'PostOP-Anweisungen' },
            ],
            forensic: [
                { field: 'preOpXray', label: 'Präop Röntgen' },
                { field: 'nerveProximity', label: 'Nervnähe dokumentiert' },
                { field: 'writtenConsent', label: 'Schriftliche Aufklärung' },
            ],
        },
        configurableDefaults: ['anesthesia', 'sutureMaterial'],
    },

    wsr: {
        id: 'wsr',
        version: '1.0.0',
        label: 'Wurzelspitzenresektion',
        labelShort: 'WSR',
        category: 'chirurgie',
        icon: 'surgery',
        detection: {
            keywords: ['wsr', 'wurzelspitzenresektion', 'apicoektomie', 'apikale chirurgie'],
        },
        workflow: {
            phases: [
                { id: 'vorbereitung', label: 'Vorbereitung', steps: ['Diagnostik', 'Aufklärung', 'Anästhesie'] },
                { id: 'eingriff', label: 'Eingriff', steps: ['Aufklappung', 'Osteotomie', 'Resektion', 'Retrograde Füllung'] },
                { id: 'wundverschluss', label: 'Wundverschluss', steps: ['Revision', 'Naht'] },
            ],
        },
        documentation: {
            required: [
                { field: 'tooth', label: 'Zahnnummer' },
                { field: 'resectionLength', label: 'Resektionslänge' },
                { field: 'retrofilling', label: 'Retrograde Füllung' },
            ],
            recommended: [
                { field: 'preOpXray', label: 'Präop Röntgen' },
                { field: 'postOpXray', label: 'PostOP Röntgen' },
                { field: 'complications', label: 'Komplikationen' },
            ],
            forensic: [
                { field: 'consent', label: 'Aufklaerung / Einwilligung' },
            ],
        },
        configurableDefaults: ['retrofillingMaterial'],
    },

    implant: {
        id: 'implant',
        version: '1.0.0',
        label: 'Implantation',
        labelShort: 'Implant',
        category: 'chirurgie',
        icon: 'implant',
        detection: {
            keywords: ['implant', 'implantat', 'insertion', 'implantation'],
        },
        workflow: {
            phases: [
                { id: 'planung', label: 'Planung', steps: ['DVT', '3D-Planung', 'Bohrschablone'] },
                { id: 'eingriff', label: 'Eingriff', steps: ['Aufklappung', 'Pilotbohrung', 'Aufbereitung', 'Implantatinsertion', 'Deckschraube'] },
                { id: 'wundverschluss', label: 'Wundverschluss', steps: ['Naht', 'Röntgenkontrolle'] },
            ],
        },
        documentation: {
            required: [
                { field: 'region', label: 'Implantatregion' },
                { field: 'system', label: 'Implantatsystem' },
                { field: 'dimensions', label: 'Durchmesser/Länge' },
                { field: 'torque', label: 'Eindrehmoment' },
            ],
            recommended: [
                { field: 'planning', label: 'Planung (DVT/Schablone)' },
                { field: 'boneQuality', label: 'Knochenqualitaet / Augmentation' },
                { field: 'healingProtocol', label: 'Einheilung (offen/geschlossen)' },
            ],
            forensic: [
                { field: 'consent', label: 'Aufklaerung / Einwilligung' },
                { field: 'xray', label: 'Roe-Kontrolle dokumentiert' },
            ],
        },
        configurableDefaults: ['implantSystem'],
    },

    // ─────────────────────────────────────────────────────────────
    // PARODONTOLOGIE
    // ─────────────────────────────────────────────────────────────

    parodontologie: {
        id: 'parodontologie',
        version: '1.0.0',
        label: 'PAR-Behandlung',
        labelShort: 'PAR',
        category: 'parodontologie',
        icon: 'gums',
        detection: {
            keywords: ['par', 'parodontitis', 'parodontose', 'tasche', 'scaling', 'root planing'],
        },
        workflow: {
            phases: [
                { id: 'diagnostik', label: 'Diagnostik', steps: ['PAR-Status', 'Parodontales Aufklärungsgespräch (ATG)'] },
                { id: 'vorbehandlung', label: 'Vorbehandlung', steps: ['Mundhygieneunterweisung (MHU)', 'Supragingival PZR'] },
                { id: 'ait', label: 'Antiinfektiöse Therapie', steps: ['AIT geschlossen (Scaling/Root Planing)', 'Ggf. AB-Therapie'] },
                { id: 'evaluation', label: 'Evaluation', steps: ['Befundevaluation (BEV) nach 3-6 Monaten'] },
                { id: 'upt', label: 'UPT', steps: ['Unterstützende PAR-Therapie (2 Jahre)', 'Nachsorge je nach Grad'] },
            ],
        },
        documentation: {
            required: [
                { field: 'parStatus', label: 'PAR-Status (Sondierungstiefen)' },
                { field: 'bop', label: 'Blutung auf Sondieren' },
                { field: 'mobility', label: 'Lockerungsgrade' },
            ],
            recommended: [
                { field: 'furcation', label: 'Furkationsbefall' },
                { field: 'recession', label: 'Rezessionen' },
            ],
        },
        configurableDefaults: ['scalerType'],
    },

    upt: {
        id: 'upt',
        version: '1.0.0',
        label: 'UPT',
        labelShort: 'UPT',
        category: 'parodontologie',
        icon: 'refresh',
        detection: {
            keywords: ['upt', 'nachsorge', 'recall', 'unterstützende parodontitistherapie'],
        },
        workflow: {
            phases: [
                { id: 'kontrolle', label: 'Kontrolle', steps: ['Mundhygienekontrolle (UPTa)', 'MHU bei Bedarf (UPTb)'] },
                { id: 'reinigung', label: 'Reinigung', steps: ['Supragingivale Reinigung (UPTc)', 'Subgingivale Nachreinigung (UPTe/f)'] },
                { id: 'status', label: 'Status', steps: ['Sondierungstiefen 1x jährlich (UPTd)'] },
            ],
        },
        documentation: {
            required: [
                { field: 'uptGrade', label: 'UPT-Grad (A/B/C)' },
                { field: 'findings', label: 'Befunde' },
            ],
            recommended: [
                { field: 'modules', label: 'UPT-Module (a-f) / Massnahmen' },
                { field: 'interval', label: 'Recall-Intervall' },
            ],
        },
    },

    // ─────────────────────────────────────────────────────────────
    // PROPHYLAXE
    // ─────────────────────────────────────────────────────────────

    pzr: {
        id: 'pzr',
        version: '1.0.0',
        label: 'Professionelle Zahnreinigung',
        labelShort: 'PZR',
        category: 'prophylaxe',
        icon: 'sparkle',
        detection: {
            keywords: ['pzr', 'zahnreinigung', 'prophylaxe', 'reinigung', 'politur'],
        },
        workflow: {
            phases: [
                { id: 'befund', label: 'Befund', steps: ['Mundhygienestatus', 'Belaganfärbung'] },
                { id: 'reinigung', label: 'Reinigung', steps: ['Scaling', 'Airflow/Pulverstrahl', 'Politur'] },
                { id: 'abschluss', label: 'Abschluss', steps: ['Fluoridierung', 'Beratung'] },
            ],
        },
        documentation: {
            required: [
                { field: 'scope', label: 'Umfang (Ober-/Unterkiefer)' },
            ],
            recommended: [
                { field: 'plaqueIndex', label: 'Plaque-Index' },
                { field: 'fluoride', label: 'Fluoridierung' },
            ],
        },
        configurableDefaults: ['fluorideType'],
    },

    fissurenversiegelung: {
        id: 'fissurenversiegelung',
        version: '1.0.0',
        label: 'Fissurenversiegelung',
        labelShort: 'FV',
        category: 'prophylaxe',
        icon: 'seal',
        detection: {
            keywords: ['versiegelung', 'fissur', 'fv'],
        },
        workflow: {
            phases: [
                { id: 'vorbereitung', label: 'Vorbereitung', steps: ['Reinigung', 'Trocknung', 'Ätzung'] },
                { id: 'versiegelung', label: 'Versiegelung', steps: ['Versiegler applizieren', 'Lichthärtung', 'Okklusionskontrolle'] },
            ],
        },
        documentation: {
            required: [
                { field: 'tooth', label: 'Zahnnummer (6er/7er)' },
                { field: 'material', label: 'Versieglermaterial' },
            ],
            recommended: [
                { field: 'isolation', label: 'Trockenlegung' },
                { field: 'cariesStatus', label: 'Kariesfreiheit / Indikation' },
            ],
        },
        configurableDefaults: ['sealerMaterial'],
    },

    // ─────────────────────────────────────────────────────────────
    // PROTHETIK FESTSITZEND
    // ─────────────────────────────────────────────────────────────

    crown_prep: {
        id: 'crown_prep',
        version: '1.0.0',
        label: 'Kronenpräparation',
        labelShort: 'Kronenprep',
        category: 'prothetik_fest',
        icon: 'crown',
        detection: {
            keywords: ['kronenpräparation', 'kronenpraeparation', 'präparation', 'praeparation', 'krone präpariert'],
        },
        workflow: {
            phases: [
                { id: 'praeparation', label: 'Präparation', steps: ['Präparation', 'Abformung / Scan', 'Provisorium'] },
            ],
        },
        documentation: {
            required: [
                { field: 'tooth', label: 'Zahnnummer' },
                { field: 'praeparation', label: 'Präparation durchgeführt' },
            ],
            recommended: [
                { field: 'impression', label: 'Abformung / Scan' },
                { field: 'provisorium', label: 'Provisorium eingesetzt' },
            ],
        },
    },

    krone: {
        id: 'krone',
        version: '1.0.0',
        label: 'Krone',
        labelShort: 'Krone',
        category: 'prothetik_fest',
        icon: 'crown',
        detection: {
            keywords: ['krone', 'vollkrone', 'überkronung', 'präparation'],
        },
        workflow: {
            phases: [
                { id: 'planung', label: 'Planung', steps: ['Diagnostik', 'HKP erstellen', 'Genehmigung'] },
                { id: 'praeparation', label: 'Präparation', steps: ['Situationsabdruck', 'Präparation', 'Farbbestimmung', 'Feinabformung', 'Provisorium'] },
                { id: 'eingliederung', label: 'Eingliederung', steps: ['Einprobe', 'Okklusion prüfen', 'Zementierung'] },
            ],
        },
        documentation: {
            required: [
                { field: 'tooth', label: 'Zahnnummer' },
                { field: 'crownType', label: 'Kronenart (Vollguß/Verblendet/Vollkeramik)' },
                { field: 'material', label: 'Material' },
            ],
            recommended: [
                { field: 'shade', label: 'Zahnfarbe' },
                { field: 'cementType', label: 'Befestigungsart' },
            ],
        },
        configurableDefaults: ['defaultCrownMaterial', 'cementType'],
    },

    teilkrone: {
        id: 'teilkrone',
        version: '1.0.0',
        label: 'Teilkrone / Inlay / Onlay',
        labelShort: 'Teilkrone',
        category: 'prothetik_fest',
        icon: 'inlay',
        detection: {
            keywords: ['teilkrone', 'inlay', 'onlay', 'overlay', 'table top'],
        },
        workflow: {
            phases: [
                { id: 'praeparation', label: 'Präparation', steps: ['Kavitätenpräparation', 'Abformung'] },
                { id: 'eingliederung', label: 'Eingliederung', steps: ['Einprobe', 'Adhäsive Befestigung'] },
            ],
        },
        documentation: {
            required: [
                { field: 'tooth', label: 'Zahnnummer' },
                { field: 'type', label: 'Art (Inlay/Onlay/Teilkrone)' },
                { field: 'material', label: 'Material (Gold/Keramik/Composite)' },
            ],
            recommended: [
                { field: 'shade', label: 'Zahnfarbe' },
                { field: 'impression', label: 'Abformung / Scan' },
                { field: 'cementType', label: 'Befestigungsart' },
            ],
        },
        configurableDefaults: ['inlayMaterial'],
    },

    bruecke: {
        id: 'bruecke',
        version: '1.0.0',
        label: 'Brücke',
        labelShort: 'Brücke',
        category: 'prothetik_fest',
        icon: 'bridge',
        detection: {
            keywords: ['brücke', 'bruecke', 'brückenglied', 'lücke'],
        },
        workflow: {
            phases: [
                { id: 'planung', label: 'Planung', steps: ['HKP', 'Pfeilerzahnbeurteilung'] },
                { id: 'praeparation', label: 'Präparation', steps: ['Pfeilerpräparation', 'Gemeinsame Einschubrichtung', 'Abformung', 'Provisorium'] },
                { id: 'eingliederung', label: 'Eingliederung', steps: ['Gerüsteinprobe', 'Rohbrandeinprobe', 'Fertige Brücke', 'Zementierung'] },
            ],
        },
        documentation: {
            required: [
                { field: 'pilarTeeth', label: 'Pfeilerzähne' },
                { field: 'pontics', label: 'Brückenglieder' },
                { field: 'spanWidth', label: 'Spanne' },
                { field: 'material', label: 'Material' },
            ],
            recommended: [
                { field: 'shade', label: 'Zahnfarbe' },
                { field: 'cementType', label: 'Befestigungsart' },
            ],
        },
        configurableDefaults: ['defaultBridgeMaterial'],
    },

    stiftaufbau: {
        id: 'stiftaufbau',
        version: '1.0.0',
        label: 'Stiftaufbau',
        labelShort: 'Stift',
        category: 'prothetik_fest',
        icon: 'post',
        detection: {
            keywords: ['stift', 'stiftaufbau', 'post', 'core', 'aufbau'],
        },
        workflow: {
            phases: [
                { id: 'vorbereitung', label: 'Vorbereitung', steps: ['Kanalfreilegung'] },
                { id: 'aufbau', label: 'Aufbau', steps: ['Stift einsetzen', 'Aufbau schichten', 'Präparation'] },
            ],
        },
        documentation: {
            required: [
                { field: 'tooth', label: 'Zahnnummer' },
                { field: 'postType', label: 'Stifttyp (Glasfaser/Titan/gegossen)' },
            ],
            recommended: [
                { field: 'postLength', label: 'Stiftlaenge / Einsetztiefe' },
                { field: 'cementType', label: 'Befestigungsart' },
                { field: 'coreMaterial', label: 'Aufbaumaterial' },
            ],
        },
        configurableDefaults: ['defaultPostType'],
    },

    veneer: {
        id: 'veneer',
        version: '1.0.0',
        label: 'Veneer',
        labelShort: 'Veneer',
        category: 'prothetik_fest',
        icon: 'veneer',
        detection: {
            keywords: ['veneer', 'verblendschale', 'keramikschale'],
        },
        workflow: {
            phases: [
                { id: 'praeparation', label: 'Präparation', steps: ['Minimalinvasive Präparation', 'Abformung'] },
                { id: 'eingliederung', label: 'Eingliederung', steps: ['Try-in', 'Adhäsive Befestigung'] },
            ],
        },
        documentation: {
            required: [
                { field: 'tooth', label: 'Zahnnummer' },
                { field: 'shade', label: 'Zahnfarbe' },
            ],
            recommended: [
                { field: 'prepDesign', label: 'Praeparationsdesign' },
                { field: 'cementType', label: 'Befestigungsart' },
            ],
        },
    },

    // ─────────────────────────────────────────────────────────────
    // PROTHETIK HERAUSNEHMBAR
    // ─────────────────────────────────────────────────────────────

    teilprothese: {
        id: 'teilprothese',
        version: '1.0.0',
        label: 'Teilprothese',
        labelShort: 'Teilprothese',
        category: 'prothetik_heraus',
        icon: 'denture',
        detection: {
            keywords: ['teilprothese', 'modellguss', 'klammer', 'klammerprothese'],
        },
        workflow: {
            phases: [
                { id: 'planung', label: 'Planung', steps: ['HKP', 'Situationsabformung'] },
                { id: 'herstellung', label: 'Herstellung', steps: ['Funktionsabformung', 'Bissnahme', 'Gerüsteinprobe', 'Rohaufstellung'] },
                { id: 'eingliederung', label: 'Eingliederung', steps: ['Fertige Prothese', 'Einschleifen', 'Nachsorge'] },
            ],
        },
        documentation: {
            required: [
                { field: 'design', label: 'Prothesen-Design' },
                { field: 'clasps', label: 'Klammerzähne' },
            ],
            recommended: [
                { field: 'jaw', label: 'Kiefer (OK/UK)' },
                { field: 'supportTeeth', label: 'Stuetz-/Pfeilerzaehne' },
                { field: 'bite', label: 'Bissregistrierung' },
            ],
        },
    },

    totalprothese: {
        id: 'totalprothese',
        version: '1.0.0',
        label: 'Totalprothese',
        labelShort: 'Totale',
        category: 'prothetik_heraus',
        icon: 'denture-full',
        detection: {
            keywords: ['totalprothese', 'vollprothese', 'totale', 'zahnlos'],
        },
        workflow: {
            phases: [
                { id: 'abformung', label: 'Abformung', steps: ['Situationsabformung', 'Funktionsabformung', 'Individueller Löffel'] },
                { id: 'registration', label: 'Registrierung', steps: ['Bissschablone', 'Gesichtsbogen', 'Zahnauswahl'] },
                { id: 'einprobe', label: 'Einprobe', steps: ['Wachsaufstellung'] },
                { id: 'eingliederung', label: 'Eingliederung', steps: ['Fertige Prothese', 'Okklusionskontrolle'] },
            ],
        },
        documentation: {
            required: [
                { field: 'jaw', label: 'Kiefer (OK/UK)' },
                { field: 'toothSelection', label: 'Zahnauswahl' },
            ],
            recommended: [
                { field: 'bite', label: 'Bissregistrierung' },
                { field: 'tryIn', label: 'Einprobe (ja/nein)' },
                { field: 'aftercare', label: 'Nachsorge / Druckstellenkontrolle' },
            ],
        },
    },

    teleskopprothese: {
        id: 'teleskopprothese',
        version: '1.0.0',
        label: 'Teleskopprothese',
        labelShort: 'Teleskop',
        category: 'prothetik_heraus',
        icon: 'telescope',
        detection: {
            keywords: ['teleskop', 'doppelkrone', 'konuskrone', 'kombiversorgung'],
        },
        workflow: {
            phases: [
                { id: 'praeparation', label: 'Präparation', steps: ['Pfeilerpräparation', 'Primärteleskop-Abformung'] },
                { id: 'primaer', label: 'Primärteile', steps: ['Primärteleskop-Einprobe', 'Sekundär-Abformung'] },
                { id: 'eingliederung', label: 'Eingliederung', steps: ['Gerüstprobe', 'Aufstellung', 'Fertige Versorgung'] },
            ],
        },
        documentation: {
            required: [
                { field: 'pilarTeeth', label: 'Teleskoppfeiler' },
                { field: 'design', label: 'Prothesendesign' },
            ],
            recommended: [
                { field: 'primaryMaterial', label: 'Material Primaerteile' },
                { field: 'secondaryDesign', label: 'Sekundaerteile / Geruest' },
                { field: 'bite', label: 'Bissregistrierung' },
            ],
        },
    },

    // ─────────────────────────────────────────────────────────────
    // ÄSTHETIK
    // ─────────────────────────────────────────────────────────────

    bleaching: {
        id: 'bleaching',
        version: '1.0.0',
        label: 'Bleaching',
        labelShort: 'Bleaching',
        category: 'aesthetik',
        icon: 'sun',
        detection: {
            keywords: ['bleaching', 'aufhellung', 'whitening', 'bleichen'],
        },
        workflow: {
            phases: [
                { id: 'vorbereitung', label: 'Vorbereitung', steps: ['Zahnreinigung', 'Zahnfleischprotektion'] },
                { id: 'behandlung', label: 'Behandlung', steps: ['Bleaching-Gel auftragen', 'Lichtaktivierung', 'Neutralisation'] },
            ],
        },
        documentation: {
            required: [
                { field: 'shadeStart', label: 'Ausgangszahnfarbe' },
                { field: 'shadeEnd', label: 'Ergebnisfarbe' },
                { field: 'technique', label: 'Technik (Office/Home)' },
            ],
            recommended: [
                { field: 'photos', label: 'Fotos vorher/nachher' },
                { field: 'sensitivity', label: 'Sensibilitaet / Risikoaufklaerung' },
                { field: 'consent', label: 'Einwilligung' },
            ],
        },
    },

    // ─────────────────────────────────────────────────────────────
    // FUNKTION
    // ─────────────────────────────────────────────────────────────

    schiene: {
        id: 'schiene',
        version: '1.0.0',
        label: 'Schienentherapie',
        labelShort: 'Schiene',
        category: 'funktion',
        icon: 'guard',
        detection: {
            keywords: ['schiene', 'knirscherschiene', 'aufbissschiene', 'michigan'],
        },
        workflow: {
            phases: [
                { id: 'abformung', label: 'Abformung', steps: ['Alginat-Abformung', 'Bissregistrierung'] },
                { id: 'eingliederung', label: 'Eingliederung', steps: ['Schienenanpassung', 'Okklusionskontrolle'] },
            ],
        },
        documentation: {
            required: [
                { field: 'indication', label: 'Indikation (Bruxismus/CMD)' },
                { field: 'jaw', label: 'Kiefer' },
                { field: 'type', label: 'Schienentyp' },
            ],
            recommended: [
                { field: 'diagnosis', label: 'Diagnose' },
                { field: 'adjustments', label: 'Einschleifen / Kontrollen' },
                { field: 'lab', label: 'Labor / Material' },
            ],
        },
    },

    cmd: {
        id: 'cmd',
        version: '1.0.0',
        label: 'CMD-Therapie',
        labelShort: 'CMD',
        category: 'funktion',
        icon: 'jaw',
        detection: {
            keywords: ['cmd', 'craniomandibulär', 'kiefergelenk', 'funktionsanalyse'],
        },
        workflow: {
            phases: [
                { id: 'diagnostik', label: 'Diagnostik', steps: ['Klinische Funktionsanalyse', 'Instrumentelle Analyse', 'Gesichtsbogen'] },
                { id: 'therapie', label: 'Therapie', steps: ['Schienentherapie', 'Physiotherapie-Verordnung'] },
            ],
        },
        documentation: {
            required: [
                { field: 'findings', label: 'Befunde (Knacken, Schmerz, Bewegungseinschränkung)' },
            ],
            recommended: [
                { field: 'diagnosis', label: 'Diagnose' },
                { field: 'analysis', label: 'Funktionsanalyse (klinisch/instrumentell)' },
                { field: 'therapyPlan', label: 'Therapieplan / Ueberweisungen' },
            ],
        },
    },

    // ─────────────────────────────────────────────────────────────
    // KINDERZAHN
    // ─────────────────────────────────────────────────────────────

    kinderzahn: {
        id: 'kinderzahn',
        version: '1.0.0',
        label: 'Kinderzahnheilkunde',
        labelShort: 'Kinderzahn',
        category: 'kinderzahn',
        icon: 'child',
        detection: {
            keywords: ['milchzahn', 'kind', 'milchgebiss'],
        },
        workflow: {
            phases: [
                { id: 'behandlung', label: 'Behandlung', steps: ['Verhaltensführung', 'Behandlung', 'Belohnung'] },
            ],
        },
        documentation: {
            required: [
                { field: 'tooth', label: 'Zahnnummer (Milchzahn-Schema)' },
                { field: 'cooperation', label: 'Kooperation' },
            ],
            recommended: [
                { field: 'parentConsent', label: 'Elternaufklaerung / Einwilligung' },
                { field: 'behavior', label: 'Verhaltensfuehrung' },
                { field: 'recall', label: 'Recall / Prophylaxe-Empfehlung' },
            ],
        },
    },

    milchzahn_krone: {
        id: 'milchzahn_krone',
        version: '1.0.0',
        label: 'Milchzahnkrone',
        labelShort: 'Kinderkrone',
        category: 'kinderzahn',
        icon: 'crown-small',
        detection: {
            keywords: ['kinderkrone', 'milchzahnkrone', 'stahlkrone'],
        },
        workflow: {
            phases: [
                { id: 'behandlung', label: 'Behandlung', steps: ['Präparation', 'Anpassung', 'Zementierung'] },
            ],
        },
        documentation: {
            required: [
                { field: 'tooth', label: 'Zahnnummer' },
                { field: 'crownType', label: 'Kronentyp (Stahl/NuSmile)' },
            ],
            recommended: [
                { field: 'size', label: 'Kronengroesse' },
                { field: 'cementType', label: 'Befestigungsart' },
                { field: 'occlusion', label: 'Okklusion' },
            ],
        },
    },

    // ─────────────────────────────────────────────────────────────
    // DIAGNOSTIK
    // ─────────────────────────────────────────────────────────────

    untersuchung: {
        id: 'untersuchung',
        version: '1.0.0',
        label: 'Untersuchung',
        labelShort: 'U',
        category: 'diagnostik',
        icon: 'magnifier',
        detection: {
            keywords: ['untersuchung', 'befund', 'kontrolle', 'check-up'],
        },
        workflow: {
            phases: [
                { id: 'befund', label: 'Befund', steps: ['Anamnese', 'Inspektion', 'Palpation', 'Perkussion', 'Sensibilitätsprüfung'] },
            ],
        },
        documentation: {
            required: [
                { field: 'reason', label: 'Anlass' },
                { field: 'findings', label: 'Befunde' },
                { field: 'assessment', label: 'Beurteilung / Diagnose' },
            ],
            recommended: [
                { field: 'plan', label: 'Behandlungsplan / Empfehlung' },
                { field: 'psr', label: 'Screening (z.B. PSI/PSR)' },
            ],
        },
    },

    roentgen: {
        id: 'roentgen',
        version: '1.0.0',
        label: 'Röntgen',
        labelShort: 'Rö',
        category: 'diagnostik',
        icon: 'xray',
        detection: {
            keywords: ['röntgen', 'xray', 'zahnfilm', 'opg', 'dvt'],
        },
        workflow: {
            phases: [
                { id: 'aufnahme', label: 'Aufnahme', steps: ['Positionierung', 'Belichtung', 'Befundung'] },
            ],
        },
        documentation: {
            required: [
                { field: 'type', label: 'Aufnahmeart (ZF/OPG/DVT)' },
                { field: 'region', label: 'Region' },
                { field: 'findings', label: 'Befund' },
            ],
            recommended: [
                { field: 'indication', label: 'Indikation / Rechtfertigung' },
                { field: 'radiationProtection', label: 'Strahlenschutz (z.B. Schuerze)' },
            ],
        },
    },

    // ─────────────────────────────────────────────────────────────
    // NOTFALL
    // ─────────────────────────────────────────────────────────────

    notfall: {
        id: 'notfall',
        version: '1.0.0',
        label: 'Notfallbehandlung',
        labelShort: 'Notfall',
        category: 'notfall',
        icon: 'alert',
        detection: {
            keywords: ['notfall', 'schmerzen', 'akut', 'notdienst'],
        },
        workflow: {
            phases: [
                { id: 'diagnostik', label: 'Diagnostik', steps: ['Schmerzanamnese', 'Lokalisation'] },
                { id: 'therapie', label: 'Therapie', steps: ['Schmerzbehandlung', 'Temporäre Versorgung'] },
            ],
        },
        documentation: {
            required: [
                { field: 'symptom', label: 'Symptomatik' },
                { field: 'treatment', label: 'Durchgeführte Behandlung' },
            ],
            recommended: [
                { field: 'diagnosis', label: 'Verdachtsdiagnose' },
                { field: 'painScale', label: 'Schmerzskala (0-10)' },
                { field: 'medication', label: 'Medikation / Empfehlung' },
            ],
        },
    },

    trauma: {
        id: 'trauma',
        version: '1.0.0',
        label: 'Trauma-Versorgung',
        labelShort: 'Trauma',
        category: 'notfall',
        icon: 'broken-tooth',
        detection: {
            keywords: ['trauma', 'fraktur', 'zahnunfall', 'avulsion', 'luxation'],
        },
        workflow: {
            phases: [
                { id: 'diagnostik', label: 'Diagnostik', steps: ['Klinische Untersuchung', 'Röntgen', 'Vitalitätsprüfung'] },
                { id: 'versorgung', label: 'Versorgung', steps: ['Repositionierung', 'Schienung', 'Kontrolle'] },
            ],
        },
        documentation: {
            required: [
                { field: 'tooth', label: 'Betroffener Zahn' },
                { field: 'traumaType', label: 'Traumaart (Fraktur/Luxation/Avulsion)' },
                { field: 'treatment', label: 'Versorgung' },
            ],
            recommended: [
                { field: 'findings', label: 'Befunde (Hart-/Weichgewebe)' },
                { field: 'followUp', label: 'Kontrolltermine' },
            ],
            forensic: [
                { field: 'accidentTime', label: 'Unfallzeitpunkt' },
                { field: 'storageMedium', label: 'Aufbewahrungsmedium (bei Avulsion)' },
            ],
        },
    },
};

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export const TREATMENT_IDS = Object.keys(TREATMENT_DEFINITIONS) as (keyof typeof TREATMENT_DEFINITIONS)[];

export function getTreatmentById(id: string): TreatmentDefinition | undefined {
    return TREATMENT_DEFINITIONS[id];
}

export function getTreatmentsByCategory(category: TreatmentCategory): TreatmentDefinition[] {
    return Object.values(TREATMENT_DEFINITIONS).filter(t => t.category === category);
}

export function getTreatmentLabels(): Record<string, string> {
    const labels: Record<string, string> = {};
    for (const [id, def] of Object.entries(TREATMENT_DEFINITIONS)) {
        labels[id] = def.label;
    }
    return labels;
}

export const TREATMENT_LABELS = getTreatmentLabels();
