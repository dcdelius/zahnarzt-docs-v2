export const MASTER_TEMPLATE_V3 = {
    "id": "master_fill_v3",
    "title": "Füllungstherapie (High-Performance)",
    "category": "Konservierend",
    "systemVersion": "v3",
    "version": 1,
    "createdAt": "2023-10-27T10:00:00Z",
    "updatedAt": "2023-10-27T10:00:00Z",
    "description": "Optimierte Vorlage für den Sonia-Workflow: Maximale Erkennung, smarte Standards und Forensik-Schutz.",

    "fields": [
        { "id": "tooth", "label": "Zahn", "type": "string", "description": "Betroffener Zahn (FDI-Notation, z.B. 16, 24)", "required": true },
        { "id": "surfaces", "label": "Flächen", "type": "multiselect", "options": ["m", "o", "d", "b", "l", "p", "v"], "description": "Füllungsflächen (z.B. mod, od, b)" },
        { "id": "anesthesia", "label": "Anästhesie", "type": "enum", "options": ["Infiltration", "Leitung", "Intraligamentär", "Keine"], "defaultValue": "Infiltration", "description": "Art der Betäubung" },
        { "id": "isolation", "label": "Isolation", "type": "string", "description": "Trockenlegung / Spanngummi" },
        { "id": "dryField", "label": "Trockenlegung (Backup)", "type": "enum", "options": ["Relativ", "Kofferdam", "Watterollen"], "defaultValue": "Relativ", "description": "Legacy-Feld für ältere Vorlagen" },
        { "id": "bmf", "label": "Besondere Maßnahmen (bMF)", "type": "string" },
        { "id": "conditioning", "label": "Konditionierung", "type": "string" },
        { "id": "technique", "label": "Technik", "type": "string" },
        { "id": "matrix_system", "label": "Matrizensystem", "type": "string" },
        { "id": "matrix", "label": "Matrize (Legacy)", "type": "boolean", "description": "Kompatibilitätsfeld für ältere Workflows" },
        { "id": "underfilling", "label": "Unterfüllung", "type": "string" },
        { "id": "pulp_capping", "label": "Überkappung", "type": "string" },
        { "id": "material", "label": "Material", "type": "string", "description": "Verwendetes Komposit/Material (z.B. Tetric, Admira)" },
        { "id": "polishing", "label": "Politur", "type": "boolean", "defaultValue": true, "description": "Politur durchgeführt?" },
        { "id": "fluoridation", "label": "Fluoridierung", "type": "string" },
        { "id": "adhesive", "label": "Adhäsiv (Legacy)", "type": "boolean", "defaultValue": true, "description": "Kompatibilität für ältere Vorlagen" },
        { "id": "bite_registration", "label": "Okklusions-/Artikulationskontrolle", "type": "string" },
        { "id": "xray", "label": "Röntgen", "type": "string" },
        { "id": "caries_detector", "label": "Kariesdetektor", "type": "string" },
        { "id": "excavation", "label": "Exkavation", "type": "enum", "options": ["Caries profunda", "Caries media", "Vollständig"], "defaultValue": "Vollständig", "description": "Tiefe der Karies / Exkavationsgrad" },
        { "id": "kofferdam", "label": "Kofferdam gesetzt", "type": "boolean" },
        { "id": "consent", "label": "Aufklärung", "type": "boolean", "description": "Wurde der Patient aufgeklärt?" }
    ],

    "practiceDefaults": {
        "standardLeistungen": "Oberflächenanästhesie, Trockenlegung (relativ), Adhäsivtechnik, Mehrschicht-Technik, Okklusionsprüfung, Politur, Fluoridierung"
    },

    "rules": [
        {
            "id": "check_matrix_proximal",
            "description": "Matrize ist bei approximalen Flächen (m/d) Pflicht.",
            "when": [
                { "fieldId": "surfaces", "operator": "contains", "value": "m" },
                { "fieldId": "surfaces", "operator": "contains", "value": "d" }
            ],
            "then": [
                { "type": "warn", "message": "Approximale Füllung ohne Matrize? Bitte prüfen.", "targetFieldId": "matrix" }
            ]
        },
        {
            "id": "check_cp_forensics",
            "description": "Bei Caries Profunda muss Aufklärung dokumentiert sein.",
            "when": [
                { "fieldId": "excavation", "operator": "eq", "value": "Caries profunda" },
                { "fieldId": "consent", "operator": "neq", "value": true }
            ],
            "then": [
                { "type": "warn", "message": "Caries profunda: Aufklärung über Nervrisiko dokumentiert?" }
            ]
        },
        {
            "id": "check_anesthesia_missing",
            "description": "Warnung wenn keine Anästhesie gewählt wurde.",
            "when": [
                { "fieldId": "anesthesia", "operator": "eq", "value": "Keine" }
            ],
            "then": [
                { "type": "warn", "message": "Behandlung ohne Anästhesie? Bitte bestätigen." }
            ]
        }
    ],

    "aiSettings": {
        "textLength": "standard",
        "forensicLevel": "standard",
        "blueprint": "modern",
        "revenueBooster": "smart",
        "materialCheck": true
    },

    "renderConfig": {
        "blocks": [
            { "id": "b1", "title": "Diagnose", "type": "text", "template": "Karies an Zahn {tooth} ({surfaces})." },
            { "id": "b2", "title": "Anästhesie & Isolation", "type": "bullets", "fields": ["anesthesia", "isolation", "bmf", "kofferdam"] },
            { "id": "b3", "title": "Therapie & Technik", "type": "bullets", "fields": ["conditioning", "technique", "matrix_system", "underfilling", "pulp_capping", "excavation", "material", "polishing", "fluoridation", "bite_registration", "xray", "caries_detector"] }
        ]
    }
};
