
import fs from 'fs';

// --- DEPENDENCIES INLINED ---

// materialAnalyzer.js
function categorizeMaterial(material) {
    if (!material || typeof material !== 'string') return 'other';
    const materialLower = material.toLowerCase().trim();
    if (materialLower.match(/\b(ultracain|articain|lidocain|mepivacain|xylocain|scandicain|citanest|anästhesie|lokalanästhesie|anesthesia)\b/)) return 'anesthesia';
    if (materialLower.match(/\b(vivapen|adhese|optibond|prime|bond|adhäsiv|bonding|universal bond|adhesive)\b/)) return 'bonding';
    if (materialLower.match(/\bflow\b/) && !materialLower.match(/\b(flowable|flowable composite)\b/)) return 'flow';
    if (materialLower.match(/\b(tetric|filtek|grandio|venus|komposit|composite|evoceram|ceram|nano|diamond|supreme)\b/)) return 'composite';
    if (materialLower.match(/\b(bioceramic sealer|ah plus|sealer|zement|cement)\b/)) return 'sealer';
    if (materialLower.match(/\b(guttapercha|gutta|gp)\b/)) return 'guttapercha';
    if (materialLower.match(/\b(ultracal|ledermix|calciumhydroxid|calcium hydroxide)\b/)) return 'medication';
    if (materialLower.match(/\b(kofferdamm|optidam|dam|isolation|rubber dam)\b/)) return 'isolation';
    if (materialLower.match(/\b(sof-lex|optishine|polier|polishing|diamant|diamond)\b/)) return 'polish';
    if (materialLower.match(/\b(zement|cement|glasionomer|fuji|glass ionomer)\b/)) return 'cement';
    if (materialLower.match(/\b(aufbau|build-up|core|stift|post)\b/)) return 'build-up';
    return 'other';
}

function analyzeMaterials(materialString) {
    if (!materialString || typeof materialString !== 'string') return { categorized: {}, raw: '', formatted: '' };
    const materials = materialString.split(/[,\n]/).map(m => m.trim()).filter(m => m.length > 0);
    const categorized = { anesthesia: [], bonding: [], flow: [], composite: [], sealer: [], guttapercha: [], medication: [], isolation: [], polish: [], cement: [], 'build-up': [], other: [] };
    materials.forEach(material => {
        const category = categorizeMaterial(material);
        if (!categorized[category]) categorized[category] = [];
        categorized[category].push(material);
    });
    const formatted = Object.entries(categorized).filter(([_, mats]) => mats.length > 0).map(([cat, mats]) => `${cat}: ${mats.join(', ')}`).join('\n');
    return { categorized, raw: materialString, formatted };
}

function getCategoryLabel(category) {
    const labels = { anesthesia: 'Anästhesie', bonding: 'Bonding', flow: 'Flow', composite: 'Komposit', sealer: 'Sealer', guttapercha: 'Guttapercha', medication: 'Medikament', isolation: 'Isolation', polish: 'Polier', cement: 'Zement', 'build-up': 'Aufbau', other: 'Sonstige' };
    return labels[category] || category;
}

// practiceDefaults.js
const PRACTICE_DEFAULTS_OPTIONS = {
    standard_anamnesis_update: [{ value: "no_changes", label: "Keine Änderungen (Anamnese geprüft)" }],
    kons_isolation_method: [{ value: "cotton_rolls", label: "Watterollen / Absaugung" }],
    // ... (simplified for brevity as they are mostly for UI)
};

function getSettingText(settingKey, value, customText = "") {
    if (value === "custom" && customText) return customText;
    const option = PRACTICE_DEFAULTS_OPTIONS[settingKey]?.find(opt => opt.value === value);
    if (option) return option.label.replace(/^Standard:\s*/, "");
    return value;
}

// systemPrompts.js
const SYSTEM_PROMPTS = {
    GERMAN_DENTAL_CONTEXT: `Du arbeitest grundsätzlich im Kontext der deutschen Zahnmedizin.
KRITISCH - ZAHNFLÄCHEN (IMMER KLEINBUCHSTABEN, OHNE PUNKTE):
- mesial → m (NIEMALS "M" or "M." or "mesial")
- distal → d (NIEMALS "D" or "D." or "distal")
- bukkal/buccal → b (NIEMALS "B" or "B." or "bukkal")
- palatinal → p (NIEMALS "P" or "P." or "palatinal")
- lingual → l (NIEMALS "L" or "L." or "lingual")
- okklusal → o (NIEMALS "O" or "O." or "okklusal")
- inzisal → i (NIEMALS "I" or "I." or "inzisal")
- vestibulär → v (NIEMALS "V" or "V." or "vestibulär")
Beispiel: "mesial okklusal distal" → "mod" (NIEMALS "M.O.D." oder "M O D" oder "MOD")
KRITISCH - ZAHNNUMMERN (FDI-SCHEMA OHNE PUNKT):
- "Zahn siebenundzwanzig" → "27" (NIEMALS "2.7" oder "2,7" oder "2 7")
KRITISCH - MEDIZINISCHE BEGRIFFE (korrekt schreiben):
- Ultracain (nicht Ultrakain)
- Kofferdamm (nicht Kofferdam)
Nutze ausschließlich fachlich korrekte, präzise zahnmedizinische Terminologie. Keine Erfindungen, keine Synonyme, keine Ausschmückungen. Dokumentationen sind sachlich, knapp, medizinisch korrekt und folgen üblichen zahnärztlichen Standards.`
};

// universalPrompts.js
const BASE_STRUCTURE = `
LAYER 4: OUTPUT-STRUKTUR (Strikt einhalten!):
[MEDIZINISCHE DOKUMENTATION]
**ANAMNESE & STATUS:**
• [Content]
**BEFUND:**
• [Content sorted: 1. Zähne, 2. Parodont, 3. Weichgewebe (Standard)]
**THERAPIE (Maßnahmen):**
• [Content + Materials + Implicit Standards]
**PLANUNG:**
• [Content]
---------------------------------------------------
[ABRECHNUNGS-CHECK]
• Kassenleistungen (BEMA): [Liste Keywords]
• Privat (GOZ) & Material: [Liste Keywords]
• Faktor-Begründungen: [Liste Trigger]
`;

const UNIVERSAL_PROMPTS = {
    KONS: `SYSTEM-ROLLE: High-Performance Dental-AI (Kons/Füllung).
ZIEL: Umsatzoptimierung & Forensik.
SPRACHE: Telegram-Stil, Deutsch.
LAYER 1: IMPLIZITE STANDARDS (Automatisch einfügen, wenn nicht widersprochen):
- "Kariesexkavation vollständig"
- "Trockenlegung (relativ/absolut gemäß Settings)"
- "Adhäsivtechnik lege artis"
- "Okklusions- & Kontaktpunktkontrolle"
- "Politur & Fluoridierung"
- "Aufklärung über Risiken/Nervnähe erfolgt"
LAYER 2: INPUTS:
- Material: {MATERIAL_LIST} -> korrekt zuordnen (Bond, Flow, Composite).
- User-Settings: {USER_SETTINGS} -> beachten (z.B. Standard-Isolation).
LAYER 3: REVENUE BOOSTER:
- Trigger-Analyse: Suche nach "Blutung", "tiefer Rand", "Klemme", "schwerer Zugang", "Speichelfluss", "Würgen".
- Aktion: Wenn Trigger gefunden -> "bMF" (besondere Maßnahmen) im [ABRECHNUNGS-CHECK] listen.
- Aktion: Wenn Komplexität hoch -> Faktor-Begründung generieren (> 2.3).
${BASE_STRUCTURE}`,
    GENERAL: `SYSTEM-ROLLE: High-Performance Dental-AI (Allgemein).
ZIEL: Präzise Dokumentation & Abrechnungshinweise.
LAYER 1: IMPLIZITE STANDARDS: Füge medizinisch notwendige Standardschritte hinzu.
LAYER 3: REVENUE BOOSTER: Analysiere auf erschwerende Faktoren.
${BASE_STRUCTURE}`
};

const SUB_SCENARIOS = {
    PROTHETIK_TELESKOP: `
SUB-SZENARIO: TELESKOP-PROTHESE (Kombitechnik)
SPEZIFISCHE SCHRITTE (Priorität vor Standard):
1. Präparation: "Stufenpräparation/Hohlkehle für Primärkronen"
2. Abformung: "Präzisionsabformung für Primärteile"
3. Einprobe 1: "Einprobe der Primärkronen (Passung/Randschluss)"
4. Überabformung: "Fixierung & Überabformung (Pick-up)"
5. Bissnahme: "Bissregistrierung mit Bisswällen"
6. Einprobe 2: "Gerüsteinprobe (Tertiärstruktur) & Aufstellung"
7. Fertigstellung: "Eingliederung: Primärteile zementiert, Prothese eingegliedert, Friktion eingestellt"
REVENUE-TRIGGER: "Verblendung", "Lötung", "Metallbasis", "Coverdenture"
`
};

function getBlueprintPrompt(templateTitle, templateCategory) {
    const title = (templateTitle || "").toLowerCase();
    const category = (templateCategory || "").toLowerCase();
    if (title.includes("füllung") || title.includes("kons") || category.includes("kons")) return UNIVERSAL_PROMPTS.KONS;
    return UNIVERSAL_PROMPTS.GENERAL;
}

// --- CORE LOGIC (buildGPTPrompts.js) ---

const TEXT_STYLE_TEMPLATES = {
    'ultra-short': `⚡️ STIL-VORGABE: ULTRA-KURZ (Stenografie)\n---------------------------------------------------\nREGELN (STRIKT):\n1. VERWENDE KEINE GANZEN SÄTZE.\n2. VERWENDE KEINE VERBEN (außer im Infinitiv als Befehl).\n3. VERWENDE KEINE ARTIKEL.\n4. MAXIMAL 5 Wörter pro Fragment.\n5. BEISPIEL: "Karies profunda. Vit+. ILA. Exk cp. Füllung Tetric."\n`,
    'short': `📝 STIL-VORGABE: KURZ (Telegramm)\n---------------------------------------------------\nREGELN:\n1. Nutze kurze Hauptsätze oder Ellipsen.\n2. Lass Füllwörter weg.\n3. Fokus auf Fakten.\n4. BEISPIEL: "Pat. zur Füllung. Anästhesie Ultracain. Kariesentfernung vollständig. Füllung gelegt."\n`,
    'standard': `📝 STIL-VORGABE: STANDARD (Kompakt)\n---------------------------------------------------\nREGELN:\n1. Schreibe sachlich und präzise.\n2. Vermeide unnötige Ausschweifungen.\n3. Gut lesbarer, professioneller Dokumentationsstil.\n`,
    'detailed': `📝 STIL-VORGABE: DETAILLIERT (Arztbrief)\n---------------------------------------------------\nREGELN:\n1. Schreibe in vollen, grammatikalisch korrekten Sätzen.\n2. Beschreibe den Ablauf ausführlich.\n3. Nutze eine gehobene, medizinische Fachsprache.\n4. Erkläre Zusammenhänge.\n`
};

const FORENSIC_TEMPLATES = {
    'minimal': `🛡️ FORENSIK-LEVEL: BASIS (Minimal)\n---------------------------------------------------\nANWEISUNG:\n- Beschränke dich auf das absolut Notwendige.\n- Nenne nur die 1-2 gefährlichsten Risiken namentlich.\n- Pauschalisiere den Rest.\n`,
    'standard': `🛡️ FORENSIK-LEVEL: STANDARD (Ausgewogen)\n---------------------------------------------------\nANWEISUNG:\n- Nenne die wichtigsten behandlungsspezifischen Risiken (3-4 Punkte).\n- Dokumentiere Aufklärung über Diagnose, Therapie, Alternativen und Kosten.\n- Satz: "Pat. wurde über ... aufgeklärt und willigt ein."\n`,
    'max': `🛡️ FORENSIK-LEVEL: MAXIMAL (Defensiv)\n---------------------------------------------------\nANWEISUNG:\n- Liste JEDES denkbare Risiko einzeln auf.\n- Dokumentiere explizit das Verständnis des Patienten.\n- Sicherste Variante für juristische Auseinandersetzungen.\n`
};

function getExampleOutput(blueprint, textLength, isCustomBlueprint = false) {
    if (isCustomBlueprint) {
        return `[HINWEIS: Da du eine eigene Struktur definiert hast, ist hier nur ein generisches Beispiel für das XML-Format]
<dokumentation>
  <deine_struktur_punkt_1>
    Inhalt basierend auf Input...
  </deine_struktur_punkt_1>
</dokumentation>`;
    }

    const isUltraShort = textLength === 'ultra-short';

    if (blueprint === 'classic') {
        if (isUltraShort) return `Behandlungsablauf: Karies profunda 37 (Vit+). ILA, Exkavation cp. Füllung Tetric (Mehrschicht/MKV). Aufkl. Risiken/Kosten ok.`;
        return `Behandlungsablauf:\nPatient erschien zur Füllungstherapie an Zahn 37. Klinisch zeigte sich eine tiefe Karies (profunda), Vitalität positiv. Nach Aufklärung und Infiltrationsanästhesie wurde exkaviert (cp). Aufgrund der schwierigen Zugangssituation und Speichelfluss ist der Faktor zu steigern. Es erfolgte eine Mehrschicht-Füllung (MKV unterschrieben) mit Tetric. Aufklärung über Diagnose, Therapie, Risiken (Nerv, Sensibilität) und Kosten erfolgt. Patient beschwerdefrei entlassen.`;
    }

    if (blueprint === 'forensic') {
        return `<diagnose>Karies prof. 37, Vit+.</diagnose>\n<risiken>Aufkl. über Pulpaeröffnung, Schmerzen, Fraktur, Kosten/MKV. Pat. ok.</risiken>\n<therapie>ILA. Exk cp. Tetric (Mehrschicht).</therapie>\n<abrechnung>Faktor > 2.3 (Zugang).</abrechnung>`;
    }

    // MODERN (Default)
    return `<abrechnung>\n• Pos: Füllung 37 m, ILA, bMF\n• Zusatz: Mehrschicht (120€), Adhäsiv. MKV ok.\n• Faktor: >2.3 (Zugang).\n• Mat: Tetric.\n</abrechnung>\n\n<behandlung>\nBefund 37: Cp, Vit+.\nTherapie: ILA. Exk cp. Füllung (Mehrschicht).\nForensik: Aufkl. Risiken/Kosten/MKV erfolgt.\n</behandlung>`;
}

function detectSubScenario(inputText, templateCategory) {
    const text = inputText.toLowerCase();
    const category = (templateCategory || "").toLowerCase();

    // PROTHETIK
    if (category.includes("prothetik") || category.includes("zahnersatz") || text.includes("prothese") || text.includes("krone")) {
        // 1. Teleskop / Kombi
        if (text.includes("teleskop") || text.includes("doppelkrone") || text.includes("konus") || text.includes("primär") || text.includes("sekundär")) {
            return SUB_SCENARIOS.PROTHETIK_TELESKOP;
        }
    }
    return null;
}

function buildGPTPrompts({ template, inputText, bausteine, allBausteine, globalSystemPrompt, insuranceType = 'GKV', textLength, manualMaterial, forensicLevel, activeStandards = [], inactiveStandards = [], globalAiSettings = {} }) {
    if (!template) throw new Error('Template is required');
    if (!inputText || typeof inputText !== 'string' || !inputText.trim()) throw new Error('Input text is required');

    const templatePrompt = template.prompt || template.Prompt || "";
    const templateGPTPrompt = template.GPTPrompt || template.gptPrompt || "";
    const templateCustomBlueprint = template.customBlueprint || "";
    const templateMaterial = manualMaterial || template.Material || template.material || "";
    const templateName = template.id || "";
    const templateCategory = template.Kategorie || "";
    const practiceDefaults = template.practiceDefaults || {};

    const aiSettings = template.aiSettings || { forensicMode: false, revenueBooster: false, textLength: 'standard', blueprint: 'modern', materialCheck: true };

    const activeTextLength = textLength || aiSettings.textLength || (aiSettings.telegramStyle ? 'short' : 'standard');

    let activeForensicLevel = forensicLevel;
    if (!activeForensicLevel) {
        const mode = aiSettings.forensicMode;
        if (mode === true || mode === 'max') activeForensicLevel = 'max';
        else if (mode === 'minimal') activeForensicLevel = 'minimal';
        else activeForensicLevel = 'standard';
    }

    const activeBlueprint = aiSettings.blueprint || 'modern';
    const boosterLevel = aiSettings.revenueBooster === true ? 'standard' : (aiSettings.revenueBooster || 'off');

    let customMasterPrompt = globalSystemPrompt || SYSTEM_PROMPTS.GERMAN_DENTAL_CONTEXT;

    customMasterPrompt += `\n\n🏥 VERSICHERUNGS-STATUS: ${insuranceType}\nABRECHNUNGS-REGELN (PRIORITÄT HOCH):\n${insuranceType === 'PKV' ? '- Privatpatient: Rechne ALLES strikt nach GOZ/GOÄ ab. KEINE BEMA-Positionen nennen!' : '- Kassenpatient (GKV): Nutze primär BEMA-Positionen.'}\n${insuranceType === 'GKV' ? '- MEHRKOSTEN-LOGIK (MKV): Falls hochwertige/private Leistungen erbracht wurden (z.B. Mehrschicht-Komposit, Längenmessung, Laser), liste diese ZUSÄTZLICH als GOZ-Positionen auf.' : ''}`;

    let blueprintSystemInstructions = "";
    if (templateCustomBlueprint && templateCustomBlueprint.trim().length > 10) {
        blueprintSystemInstructions = `FORMAT-BLAUPAUSE: USER-DEFINED (CUSTOM)\nSTRIKTE STRUKTUR-VORGABE DES USERS:\n---------------------------------------------------\n${templateCustomBlueprint}\n---------------------------------------------------\nHALTE DICH EXAKT AN DIESES FORMAT!`;
    } else if (activeBlueprint === 'classic') {
        blueprintSystemInstructions = `FORMAT-BLAUPAUSE: KLASSISCH\n- Ein einziger, chronologischer Fließtext.\n- Keine Trennung von Abrechnung und Text.`;
    } else if (activeBlueprint === 'forensic') {
        blueprintSystemInstructions = `FORMAT-BLAUPAUSE: FORENSIK-FOKUS\nANTWORTE IM XML-FORMAT:\n<diagnose>...</diagnose>\n<risiken>...</risiken>\n<therapie>...</therapie>\n<abrechnung>...</abrechnung>`;
    } else {
        blueprintSystemInstructions = `FORMAT-BLAUPAUSE: MODERN (2-BLOCK)\nANTWORTE IM XML-FORMAT:\n<abrechnung>...</abrechnung>\n<behandlung>...</behandlung>`;
    }
    customMasterPrompt += `\n\n${blueprintSystemInstructions}`;

    customMasterPrompt += `\n\n${TEXT_STYLE_TEMPLATES[activeTextLength] || TEXT_STYLE_TEMPLATES['standard']}`;
    customMasterPrompt += `\n\n${FORENSIC_TEMPLATES[activeForensicLevel] || FORENSIC_TEMPLATES['standard']}`;

    if (boosterLevel === 'max') {
        customMasterPrompt += `\n\n💰 UMSATZ-BOOSTER: MAXIMAL\n- Suche aggressiv nach Begründungen für Faktor > 2.3.\n- Liste bMF aktiv auf.`;
    } else if (boosterLevel === 'standard' || boosterLevel === 'smart') {
        customMasterPrompt += `\n\n💰 UMSATZ-BOOSTER: SMART\n- Schlage Faktor-Steigerung nur bei medizinischer Indikation vor.`;
    }

    // SUB-SCENARIO INJECTION
    const subScenarioPrompt = detectSubScenario(inputText, templateCategory);
    if (subScenarioPrompt) {
        customMasterPrompt += `\n\n${subScenarioPrompt}`;
    }

    if (activeStandards && activeStandards.length > 0) {
        customMasterPrompt += `\n\n🏥 PRAXIS-STANDARDS (IMPLIZIT):\n"${activeStandards.join(', ')}"`;
    }
    if (inactiveStandards && inactiveStandards.length > 0) {
        customMasterPrompt += `\n\n⛔️ AUSGESCHLOSSENE STANDARDS: "${inactiveStandards.join(', ')}"`;
    }

    if (aiSettings.materialCheck) {
        customMasterPrompt += `\n\n🧪 MATERIAL-INTEGRITÄT:\n- Nur diktierte Materialien oder aus der Liste.\n- Sonst generisch (z.B. "Komposit").`;
    }

    if (globalAiSettings.strictTerminology) {
        customMasterPrompt += `\n\n🎓 FACHSPRACHE: STRIKT (Akademisch).`;
    }

    let activePrompt = templateGPTPrompt || templatePrompt;
    if (!activePrompt || activePrompt.trim().length < 10) {
        activePrompt = getBlueprintPrompt(templateName, templateCategory);
    }

    const userSettingsString = Object.keys(practiceDefaults).length > 0 ? Object.entries(practiceDefaults).map(([key, value]) => `${key}: ${value}`).join("; ") : "Keine spezifischen User-Settings.";
    const materialListString = templateMaterial ? templateMaterial.replace(/\n/g, ", ") : "Keine spezifischen Materialien.";

    let finalSystemPrompt = activePrompt.replace("{MATERIAL_LIST}", materialListString).replace("{USER_SETTINGS}", userSettingsString);

    if (!activePrompt.includes("{MATERIAL_LIST}")) {
        finalSystemPrompt += `\n\nKONTEXT:\nMaterialien: ${materialListString}\nUser-Settings: ${userSettingsString}`;
    }

    let systemPrompt = `${customMasterPrompt}\n\n⸻\n\nTEMPLATE-SPEZIFISCHE LOGIK:\n${finalSystemPrompt}`;

    systemPrompt += `\n\n⛔️ ABSOLUTE REGELN (HÖCHSTE PRIORITÄT - ÜBERSCHREIBT ALLES VORHERIGE):\n1. Erfinde KEIN RÖNTGENBILD, wenn es nicht diktiert wurde.\n2. Erfinde KEINE PREISE, wenn sie NICHT im Diktat stehen.\n3. ABER WICHTIG: Wenn ein Preis oder Kosten im Diktat genannt wurden, MÜSSEN sie übernommen werden!\n4. Achte penibel auf Großschreibung.\n5. FLÄCHEN-TREUE: Wenn "mesial" diktiert wurde, schreibe "m" (oder "mesial"). Schreibe NIEMALS "mod", wenn nicht alle drei Flächen diktiert wurden!\n6. ZAHNFLÄCHEN-FORMAT: Immer Kleinbuchstaben (m, d, o, mod).\n7. ZAHNNUMMERN: Immer FDI ohne Punkt (27, 36).`;

    const dynamicExampleOutput = getExampleOutput(activeBlueprint, activeTextLength, !!(templateCustomBlueprint && templateCustomBlueprint.trim().length > 10));
    const userPrompt = `BEISPIEL FÜR PERFEKTEN OUTPUT (Dein Gold-Standard):\n${dynamicExampleOutput}\n\nDIKTIERTER TEXT (Patientenfall):\n${inputText}\n\nANWEISUNG:\nGeneriere jetzt die Dokumentation basierend auf dem System-Prompt.\nNutze NUR Fakten aus dem Input.`;

    return { systemPrompt, userPrompt };
}

// --- TEST RUNNER ---

const mockTemplate = {
    id: "V2_Kons_Fuellung",
    title: "Füllungstherapie",
    Kategorie: "Konservierend",
    Prompt: `**1) Leistungsübersicht (Abrechnung)**\nFüllung Zahn {ZAHN} - {FLAECHEN} - {BETRAG} €\n...`,
    Material: "Anästhesie: Ultracain D-S 1:200.000\nBonding: Adhese Universal\nKomposit: Tetric EvoCeram",
    practiceDefaults: { standardLeistungen: 'Anästhesie, Kofferdam, Matrize, Adhäsivtechnik, Mehrschichttechnik, Politur, Okklusionsprüfung' },
    aiSettings: { forensicMode: false, revenueBooster: false, textLength: 'standard', blueprint: 'modern', materialCheck: true }
};

const scenarios = [
    { name: "Scenario 1: Standard", inputText: "36 füllung, vit pos, 130 euro", config: { textLength: 'standard', forensicLevel: 'standard', activeStandards: ['Kofferdam', 'Längenmessung'] } },
    { name: "Scenario 2: Forensic Max & Detailed", inputText: "36 füllung, vit pos", config: { textLength: 'detailed', forensicLevel: 'max', activeStandards: [] } },
    { name: "Scenario 3: Custom Blueprint", inputText: "36 füllung", templateOverride: { customBlueprint: "MY CUSTOM STRUCTURE:\n1. Diagnosis\n2. Treatment\n3. Billing" }, config: { textLength: 'standard', forensicLevel: 'standard' } },
    { name: "Scenario 4: Safety Violation Attempt", inputText: "36 mesial mod", config: { textLength: 'short', forensicLevel: 'minimal' } },
    { name: "Scenario 5: Teleskopprothese (Explicit Selection)", inputText: "Teleskopprothese OK, 4 Teleskope", templateOverride: { title: "Teleskopprothese", Kategorie: "Prothetik" }, config: { textLength: 'standard', forensicLevel: 'standard' } },
    { name: "Scenario 6: Teleskopprothese (Stage: Einprobe)", inputText: "Teleskopprothese, heute Einprobe der Primärteile, Randschluss ok", templateOverride: { title: "Teleskopprothese", Kategorie: "Prothetik" }, config: { textLength: 'standard', forensicLevel: 'standard' } }
];

let outputLog = "";
console.log("Starting Analysis...");

scenarios.forEach(scenario => {
    outputLog += `\n\n===================================================\nSCENARIO: ${scenario.name}\nINPUT: "${scenario.inputText}"\nCONFIG: ${JSON.stringify(scenario.config)}\n===================================================\n`;
    const templateToUse = { ...mockTemplate, ...(scenario.templateOverride || {}) };
    try {
        const result = buildGPTPrompts({ template: templateToUse, inputText: scenario.inputText, ...scenario.config });
        outputLog += `\n--- SYSTEM PROMPT ---\n${result.systemPrompt}\n\n--- USER PROMPT ---\n${result.userPrompt}\n`;
    } catch (error) {
        outputLog += `\nERROR: ${error.message}\n`;
    }
});

fs.writeFileSync('prompt_analysis_output.txt', outputLog);
console.log("Analysis complete. Output written to prompt_analysis_output.txt");
