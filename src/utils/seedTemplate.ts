import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { TemplateV3 } from '../types/templateV3';

export const seedMVPTemplate = async () => {
    const template: TemplateV3 = {
        id: "mvp_komposit",
        version: 1,
        title: "Kompositfüllung (MVP)",
        category: "Konservierend",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fields: [
            { id: "tooth", label: "Zahn", type: "string", required: true, placeholder: "z.B. 16" },
            { id: "surfaces", label: "Flächen", type: "multiselect", required: true, options: ["o", "m", "d", "b", "l", "p"] },
            { id: "laUsed", label: "Anästhesie", type: "boolean" },
            { id: "laType", label: "LA Typ", type: "enum", options: ["Infiltrationsanästhesie", "Leitungsanästhesie", "Intraligamentär"] },
            { id: "isolation", label: "Trockenlegung", type: "enum", options: ["Kofferdam", "Relative Trockenlegung", "Keine"], defaultValue: "Kofferdam" },
            { id: "matrixUsed", label: "Matrize verwendet", type: "boolean" },
            { id: "compositeLayered", label: "Mehrschichttechnik", type: "boolean", defaultValue: true },
            { id: "occlusionChecked", label: "Okklusion geprüft", type: "boolean", defaultValue: true },
            { id: "polished", label: "Politur", type: "boolean", defaultValue: true },
            { id: "specials", label: "Besonderheiten", type: "text" }
        ],
        rules: [
            // 1. Proximal surface (m or d) => Require Matrix
            {
                id: "req_matrix_m",
                when: [{ fieldId: "surfaces", operator: "contains", value: "m" }],
                then: [{ type: "require", targetFieldId: "matrixUsed" }]
            },
            {
                id: "req_matrix_d",
                when: [{ fieldId: "surfaces", operator: "contains", value: "d" }],
                then: [{ type: "require", targetFieldId: "matrixUsed" }]
            },
            // 2. LA Used but Type missing => Warning
            {
                id: "warn_la_type",
                when: [
                    { fieldId: "laUsed", operator: "eq", value: true },
                    { fieldId: "laType", operator: "notExists" }
                ],
                then: [{ type: "warn", message: "Anästhesie gewählt, aber kein Typ angegeben!" }]
            },
            // 3. Isolation None => Warning
            {
                id: "warn_isolation",
                when: [{ fieldId: "isolation", operator: "eq", value: "Keine" }],
                then: [{ type: "warn", message: "Achtung: Keine Trockenlegung dokumentiert!" }]
            }
        ],
        renderConfig: {
            blocks: [
                {
                    id: "overview",
                    title: "Übersicht & Abrechnung",
                    type: "bullets",
                    fields: ["tooth", "surfaces", "laType", "isolation", "matrixUsed", "compositeLayered"]
                },
                {
                    id: "process",
                    title: "Behandlungsverlauf",
                    type: "text",
                    fields: ["tooth", "laType", "isolation", "matrixUsed", "compositeLayered", "polished", "occlusionChecked", "specials"],
                    template: "Der Patient erschien zur Füllungstherapie an Zahn {tooth}. Nach Aufklärung und {laType} erfolgte die Präparation und Kariesentfernung. Trockenlegung mittels {isolation}. {matrixUsed} Matrize angelegt. Adhäsive Vorbehandlung und Füllung in Mehrschichttechnik ({compositeLayered}). Ausarbeitung und Politur ({polished}). Okklusion geprüft ({occlusionChecked}). {specials}"
                }
            ]
        }
    };

    try {
        // Save to: Praxen/1/TemplatesV3/mvp_komposit
        await setDoc(doc(db, "Praxen", "1", "TemplatesV3", template.id), template);
        console.log("✅ MVP Template seeded successfully!");
        return true;
    } catch (error) {
        console.error("❌ Error seeding template:", error);
        return false;
    }
};
