
import { buildGPTPrompts } from '../utils/buildGPTPrompts.js';
// Mock extraction since we can't easily import TS engine in JS node without setup
// import { extractStructuredData } from '../engine/extractStructuredData';

// MOCK TEMPLATE (Füllung V3)
const MOCK_TEMPLATE = {
    id: "kons_fill_v3",
    title: "Füllungstherapie",
    category: "Konservierend",
    systemVersion: "v3",
    fields: [
        { id: "tooth", label: "Zahn", type: "string" },
        { id: "surfaces", label: "Flächen", type: "multiselect" },
        { id: "anesthesia", label: "Anästhesie", type: "string" },
        { id: "prep", label: "Präparation", type: "string" },
        { id: "excavation", label: "Exkavation", type: "string" },
        { id: "material", label: "Material", type: "string" },
        { id: "adhesive", label: "Adhäsiv", type: "boolean" },
        { id: "matrix", label: "Matrize", type: "boolean" },
        { id: "dryField", label: "Trockenlegung", type: "string" },
        { id: "polishing", label: "Politur", type: "boolean" },
        { id: "occlusion", label: "Okklusion", type: "boolean" },
        { id: "consent", label: "Aufklärung", type: "boolean" }
    ],
    practiceDefaults: {
        standardLeistungen: "Oberflächenanästhesie, Trockenlegung (relativ), Okklusionsprüfung, Politur"
    },
    aiSettings: {
        textLength: "standard",
        forensicLevel: "standard",
        blueprint: "modern"
    }
};

// MOCK LLM SERVICE (to avoid API calls and ensure deterministic tests)
// We mock the EXTRACTION result, because we want to test the WORKFLOW logic (Chips -> Composer)
const mockExtraction = (text) => {
    const data = {};
    if (text.includes("16")) data.tooth = "16";
    if (text.includes("mod")) data.surfaces = ["m", "o", "d"];
    if (text.includes("Leitungsanästhesie")) data.anesthesia = "Leitungsanästhesie";
    if (text.includes("Hohlkehle")) data.prep = "Hohlkehle";
    if (text.includes("A3")) data.color = "A3";
    if (text.includes("Tetric")) data.material = "Tetric";
    if (text.includes("Kofferdam")) data.dryField = "Kofferdam";
    return { data, meta: {} };
};

const runTest = async (name, setup) => {
    console.log(`\n--- TEST: ${name} ---`);

    // 1. Input
    const { dictation, insurance, forensicLevel, chipInteractions } = setup;
    console.log(`🎤 Diktat: "${dictation}"`);
    console.log(`⚙️ Settings: ${insurance} | Forensik: ${forensicLevel}`);

    // 2. Extraction (Mocked for speed/determinism)
    // In real app: const extraction = await extractStructuredData(MOCK_TEMPLATE, dictation);
    const extraction = mockExtraction(dictation);
    console.log(`🧠 Extracted Data:`, JSON.stringify(extraction.data));

    // 3. Chip Logic (Simulate UI)
    let activeStandards = ["Oberflächenanästhesie", "Trockenlegung (relativ)", "Okklusionsprüfung", "Politur"]; // Defaults
    let inactiveStandards = [];

    if (chipInteractions) {
        chipInteractions.forEach(action => {
            if (action.type === 'toggle_off') {
                activeStandards = activeStandards.filter(s => s !== action.label);
                inactiveStandards.push(action.label);
                console.log(`🖱️ User klickt WEG: ${action.label}`);
            }
            if (action.type === 'toggle_on') {
                activeStandards.push(action.label);
                console.log(`🖱️ User klickt DAZU: ${action.label}`);
            }
        });
    }

    // 4. Composition (The Core Test)
    const { systemPrompt, userPrompt } = buildGPTPrompts({
        template: MOCK_TEMPLATE,
        inputText: dictation,
        activeStandards,
        inactiveStandards,
        insuranceType: insurance,
        forensicLevel: forensicLevel || 'standard',
        textLength: 'standard'
    });

    // 5. Analysis
    console.log(`📝 System Prompt Check:`);

    // Check Insurance
    if (systemPrompt.includes(insurance === 'PKV' ? 'GOZ/GOÄ' : 'BEMA')) {
        console.log(`✅ Versicherung ${insurance} korrekt erkannt.`);
    } else {
        console.log(`❌ Versicherung ${insurance} FEHLT im Prompt!`);
    }

    // Check Standards
    const standardsInPrompt = systemPrompt.includes("PRAXIS-STANDARDS");
    const exclusionsInPrompt = systemPrompt.includes("AUSGESCHLOSSENE STANDARDS");

    if (activeStandards.length > 0 && standardsInPrompt) console.log(`✅ Aktive Standards übergeben.`);
    if (inactiveStandards.length > 0 && exclusionsInPrompt) console.log(`✅ Inaktive Standards (Exclusions) übergeben.`);

    // Check Specific Logic
    if (setup.expectedCheck) {
        const check = setup.expectedCheck(systemPrompt);
        if (check.pass) console.log(`✅ ${check.msg}`);
        else console.log(`❌ ${check.msg}`);
    }
};

// SCENARIOS
(async () => {
    // 1. Standard GKV
    await runTest("1. Standard GKV Füllung", {
        dictation: "Füllung 16 mod. Leitungsanästhesie. Tetric A3.",
        insurance: "GKV",
        forensicLevel: "standard"
    });

    // 2. PKV High-End
    await runTest("2. PKV High-End", {
        dictation: "Füllung 16 mod. Kofferdam. Tetric EvoCeram. Mikroskop.",
        insurance: "PKV",
        forensicLevel: "max",
        expectedCheck: (p) => ({ pass: p.includes("GOZ/GOÄ") && p.includes("MAXIMAL"), msg: "PKV & Forensik Max erkannt" })
    });

    // 3. Chip Interaction (Exclusion)
    await runTest("3. Chip Interaction (Standard weggeklickt)", {
        dictation: "Füllung 16 occlusal.",
        insurance: "GKV",
        chipInteractions: [{ type: 'toggle_off', label: 'Oberflächenanästhesie' }],
        expectedCheck: (p) => ({ pass: p.includes("Oberflächenanästhesie") && p.includes("AUSGESCHLOSSENE"), msg: "Oberflächenanästhesie explizit ausgeschlossen" })
    });

    // 4. Forensik Critical
    await runTest("4. Forensik Critical", {
        dictation: "Tiefe Karies 46. Cp. Vit+. Aufklärung schwierig.",
        insurance: "GKV",
        forensicLevel: "max",
        expectedCheck: (p) => ({ pass: p.includes("JEDES denkbare Risiko"), msg: "Forensik-Level MAX instruiert" })
    });

    // 5. Missing Data (Vague)
    await runTest("5. Vague Input", {
        dictation: "Füllung gemacht.",
        insurance: "GKV",
        expectedCheck: (p) => ({ pass: p.includes("Erfinde KEINE"), msg: "Halluzinations-Schutz aktiv" })
    });

})();
