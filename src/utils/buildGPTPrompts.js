/**
 * Utility function to build GPT prompts for dental documentation
 * Consolidates duplicate prompt building logic from Dashboard.jsx
 */

import { analyzeMaterials, getCategoryLabel } from './materialAnalyzer.js';
import { getSettingText } from '../types/practiceDefaults.js';
import { getBlueprintPrompt } from './universalPrompts.js';
import { SYSTEM_PROMPTS } from './systemPrompts.js';

// --- TEMPLATE DEFINITIONS (The Hard Way) ---

const TEXT_STYLE_TEMPLATES = {
  'ultra-short': `
⚡️ STIL-VORGABE: ULTRA-KURZ (Stenografie)
---------------------------------------------------
REGELN (STRIKT):
1. VERWENDE KEINE GANZEN SÄTZE.
2. VERWENDE KEINE VERBEN (außer im Infinitiv als Befehl, z.B. "reinigen").
3. VERWENDE KEINE ARTIKEL (der, die, das).
4. MAXIMAL 5 Wörter pro Fragment.
5. BEISPIEL: "Karies profunda. Vit+. ILA. Exk cp. Füllung Tetric."
`,
  'short': `
📝 STIL-VORGABE: KURZ (Telegramm)
---------------------------------------------------
REGELN:
1. Nutze kurze Hauptsätze oder Ellipsen.
2. Lass Füllwörter weg ("wurde durchgeführt", "erfolgte").
3. Fokus auf Fakten.
4. BEISPIEL: "Pat. zur Füllung. Anästhesie Ultracain. Kariesentfernung vollständig. Füllung gelegt."
`,
  'standard': `
📝 STIL-VORGABE: STANDARD (Kompakt)
---------------------------------------------------
REGELN:
1. Schreibe sachlich und präzise.
2. Vermeide unnötige Ausschweifungen.
3. Gut lesbarer, professioneller Dokumentationsstil.
`,
  'detailed': `
📝 STIL-VORGABE: DETAILLIERT (Arztbrief)
---------------------------------------------------
REGELN:
1. Schreibe in vollen, grammatikalisch korrekten Sätzen.
2. Beschreibe den Ablauf ausführlich.
3. Nutze eine gehobene, medizinische Fachsprache.
4. Erkläre Zusammenhänge (z.B. "Aufgrund der tiefen Karies wurde...").
`
};

const FORENSIC_TEMPLATES = {
  'minimal': `
🛡️ FORENSIK-LEVEL: BASIS (Minimal)
---------------------------------------------------
ANWEISUNG:
- Beschränke dich auf das absolut Notwendige.
- Nenne nur die 1-2 gefährlichsten Risiken namentlich (z.B. Frakturgefahr).
- Pauschalisiere den Rest: "Aufklärung über Risiken und Alternativen erfolgt."
`,
  'standard': `
🛡️ FORENSIK-LEVEL: STANDARD (Ausgewogen)
---------------------------------------------------
ANWEISUNG:
- Nenne die wichtigsten behandlungsspezifischen Risiken (3-4 Punkte).
- Dokumentiere Aufklärung über Diagnose, Therapie, Alternativen und Kosten.
- Satz: "Pat. wurde über ... aufgeklärt und willigt ein."
`,
  'max': `
🛡️ FORENSIK-LEVEL: MAXIMAL (Defensiv)
---------------------------------------------------
ANWEISUNG:
- Liste JEDES denkbare Risiko einzeln auf (Nervschaden, Kieferhöhle, Fraktur, Schlucken, etc.).
- Dokumentiere explizit das Verständnis des Patienten ("Keine weiteren Fragen").
- Sicherste Variante für juristische Auseinandersetzungen.
`
};

/**
 * Returns a tailored example output based on blueprint and text length
 */
function getExampleOutput(blueprint, textLength, isCustomBlueprint = false) {
  // 1. CUSTOM BLUEPRINT FALLBACK
  // Wenn der User eine eigene Struktur definiert hat, dürfen wir ihm KEIN
  // spezifisches Beispiel (wie "Modern" oder "Classic") zeigen, da dies
  // die KI verwirren würde. Wir zeigen ein generisches XML-Beispiel.
  if (isCustomBlueprint) {
    return `[HINWEIS: Da du eine eigene Struktur definiert hast, ist hier nur ein generisches Beispiel für das XML-Format]
<dokumentation>
  <deine_struktur_punkt_1>
    Inhalt basierend auf Input...
  </deine_struktur_punkt_1>
  <deine_struktur_punkt_2>
    Inhalt...
  </deine_struktur_punkt_2>
</dokumentation>`;
  }

  const isUltraShort = textLength === 'ultra-short';
  const isShort = textLength === 'short';
  const isDetailed = textLength === 'detailed';

  if (blueprint === 'classic') {
    if (isUltraShort) return `Behandlungsablauf: Karies profunda 37 (Vit+). ILA, Exkavation cp. Füllung Tetric (Mehrschicht/MKV). Aufkl. Risiken/Kosten ok.`;
    if (isShort) return `Behandlungsablauf: Pat. zur Füllung 37. Befund: Karies prof., Vit+. ILA. Exkavation cp. Füllung (Mehrschicht) mit Tetric. Aufklärung (Diagnose, Risiken, Kosten) erfolgt. Pat. einverstanden.`;
    return `Behandlungsablauf:
Patient erschien zur Füllungstherapie an Zahn 37. Klinisch zeigte sich eine tiefe Karies (profunda), Vitalität positiv. Nach Aufklärung und Infiltrationsanästhesie wurde exkaviert (cp). Aufgrund der schwierigen Zugangssituation und Speichelfluss ist der Faktor zu steigern. Es erfolgte eine Mehrschicht-Füllung (MKV unterschrieben) mit Tetric. Aufklärung über Diagnose, Therapie, Risiken (Nerv, Sensibilität) und Kosten erfolgt. Patient beschwerdefrei entlassen.`;
  }

  if (blueprint === 'forensic') {
    if (isUltraShort) {
      return `<diagnose>Karies prof. 37, Vit+.</diagnose>
<risiken>Aufkl. über Pulpaeröffnung, Schmerzen, Fraktur, Kosten/MKV. Pat. ok.</risiken>
<therapie>ILA. Exk cp. Tetric (Mehrschicht).</therapie>
<abrechnung>Faktor > 2.3 (Zugang).</abrechnung>`;
    }
    return `<diagnose>
Karies profunda 37, Vit+.
</diagnose>

<risiken>
Umfassende Aufklärung über:
- Eröffnung der Pulpa / Wurzelkanalbehandlung
- Postoperative Sensibilitäten / Schmerzen
- Frakturgefahr des Zahnes
- Kosten (MKV) und Alternativen (Inlay/Krone)
Patient hat alles verstanden und willigt ein.
</risiken>

<therapie>
ILA. Exkavation cp. Füllung Tetric (Mehrschicht).
</therapie>

<abrechnung>
Faktor > 2.3 wegen erschwertem Zugang (Wangenhalt).
</abrechnung>`;
  }

  // MODERN (Default)
  if (isUltraShort) {
    return `<abrechnung>
• Pos: Füllung 37 m, ILA, bMF
• Zusatz: Mehrschicht (120€), Adhäsiv. MKV ok.
• Faktor: >2.3 (Zugang).
• Mat: Tetric.
</abrechnung>

<behandlung>
Befund 37: Cp, Vit+.
Therapie: ILA. Exk cp. Füllung (Mehrschicht).
Forensik: Aufkl. Risiken/Kosten/MKV erfolgt.
</behandlung>`;
  }

  if (isShort) {
    return `<abrechnung>
• Positionen: Füllung 37 m, ILA, bMF
• Zusatz (MKV): Mehrschicht-Komposit, Adhäsiv.
• Faktor (>2.3): Erhöhter Zeitaufwand.
• Material: Tetric.
</abrechnung>

<behandlung>
Untersuchung 37: Karies profunda, Vit (+).
Ablauf: ILA. Exkavation cp. Füllung (Mehrschicht). Okklusion ok.
Forensik: Aufklärung Diagnose/Risiken/Kosten erfolgt. Einverständnis liegt vor.
</behandlung>`;
  }

  // Modern Standard / Detailed
  return `<abrechnung>
• Positionen: Füllung 37 m (3-fl.), ILA, bMF (tief/Matrize)
• Zusatz (MKV): Mehrschicht-Komposit (120€), Adhäsivtechnik. MKV unterschrieben.
• Faktor (>2.3): Erhöhter Zeitaufwand (schwieriger Zugang/Speichel).
• Material: Tetric A3.
</abrechnung>

<behandlung>
Untersuchung 37: Karies profunda, Vit (+).
Ablauf: ILA, Matrize. Exkavation vollständig (cp). Adhäsivtechnik. Füllung (Mehrschicht). Okklusion/Politur. Pat. beschwerdefrei.
Forensik: Aufklärung über Diagnose, Therapie, Risiken (Nerv, Sensibilität), Alternativen sowie Kosten (120€) erfolgt; Einverständnis und MKV liegen vor.
</behandlung>`;
}



/**
 * Builds system and user prompts for GPT-5-mini based on template, input, and configuration
 */
export function buildGPTPrompts({ template, inputText, bausteine, allBausteine, globalSystemPrompt, insuranceType = 'GKV', textLength, manualMaterial, forensicLevel, activeStandards = [], inactiveStandards = [], globalAiSettings = {} }) {
  if (!template) {
    throw new Error('Template is required');
  }

  if (!inputText || typeof inputText !== 'string' || !inputText.trim()) {
    throw new Error('Input text is required and must be a non-empty string');
  }

  if (!Array.isArray(bausteine)) {
    bausteine = [];
  }

  if (!Array.isArray(allBausteine)) {
    allBausteine = [];
  }

  // --- PREPARE VARIABLES ---
  const templatePrompt = template.prompt || template.Prompt || "";
  const templateGPTPrompt = template.GPTPrompt || template.gptPrompt || template.GeminiPrompt || template.geminiPrompt || "";
  const templateCustomBlueprint = template.customBlueprint || ""; // Retrieve Custom Blueprint
  const templateMaterial = manualMaterial || template.Material || template.material || "";
  const templateName = template.id || "";
  const templateCategory = template.Kategorie || "";
  const practiceDefaults = template.practiceDefaults || {};

  const aiSettings = template.aiSettings || {
    forensicMode: false,
    revenueBooster: false,
    textLength: 'standard',
    blueprint: 'modern',
    materialCheck: true
  };

  // Determine Active Settings (with migration/fallbacks)
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

  // --- BUILD MASTER PROMPT ---

  // 1. Base Context
  let customMasterPrompt = globalSystemPrompt || SYSTEM_PROMPTS.GERMAN_DENTAL_CONTEXT;

  // 2. Add Insurance Logic
  customMasterPrompt += `\n\n🏥 VERSICHERUNGS-STATUS: ${insuranceType}
  ABRECHNUNGS-REGELN (PRIORITÄT HOCH):
  ${insuranceType === 'PKV'
      ? '- Privatpatient: Rechne ALLES strikt nach GOZ/GOÄ ab. KEINE BEMA-Positionen nennen!'
      : '- Kassenpatient (GKV): Nutze primär BEMA-Positionen.'}
  ${insuranceType === 'GKV'
      ? '- MEHRKOSTEN-LOGIK (MKV): Falls hochwertige/private Leistungen erbracht wurden (z.B. Mehrschicht-Komposit, Längenmessung, Laser), liste diese ZUSÄTZLICH als GOZ-Positionen auf.'
      : ''}`;

  // 3. Add Blueprint Instructions (Structure)
  let blueprintSystemInstructions = "";

  if (templateCustomBlueprint && templateCustomBlueprint.trim().length > 10) {
    // CUSTOM BLUEPRINT (User Defined)
    blueprintSystemInstructions = `FORMAT-BLAUPAUSE: USER-DEFINED (CUSTOM)
    STRIKTE STRUKTUR-VORGABE DES USERS:
    ---------------------------------------------------
    ${templateCustomBlueprint}
    ---------------------------------------------------
    HALTE DICH EXAKT AN DIESES FORMAT!`;
  } else if (activeBlueprint === 'classic') {
    blueprintSystemInstructions = `FORMAT-BLAUPAUSE: KLASSISCH
    - Ein einziger, chronologischer Fließtext.
    - Keine Trennung von Abrechnung und Text.`;
  } else if (activeBlueprint === 'forensic') {
    blueprintSystemInstructions = `FORMAT-BLAUPAUSE: FORENSIK-FOKUS
    ANTWORTE IM XML-FORMAT:
    <diagnose>...</diagnose>
    <risiken>... (Extrem detailliert!) ...</risiken>
    <therapie>... (Chronologisch) ...</therapie>
    <abrechnung>... (Faktoren & Begründungen) ...</abrechnung>`;
  } else {
    // Modern
    blueprintSystemInstructions = `FORMAT-BLAUPAUSE: MODERN (2-BLOCK)
    ANTWORTE IM XML-FORMAT:
    <abrechnung>
       - Positionen (Zahn + Flächen).
       - Zusatzkosten & Begründungen.
    </abrechnung>
    <behandlung>
       - Behandlungsablauf.
       - Forensik-Block am Ende.
    </behandlung>`;
  }
  customMasterPrompt += `\n\n${blueprintSystemInstructions}`;

  // 4. Inject Style Template (Text Length)
  customMasterPrompt += `\n\n${TEXT_STYLE_TEMPLATES[activeTextLength] || TEXT_STYLE_TEMPLATES['standard']}`;

  // 5. Inject Forensic Template (Level)
  customMasterPrompt += `\n\n${FORENSIC_TEMPLATES[activeForensicLevel] || FORENSIC_TEMPLATES['standard']}`;

  // 6. Revenue Booster
  if (boosterLevel === 'max') {
    customMasterPrompt += `\n\n💰 UMSATZ-BOOSTER: MAXIMAL
    - Suche aggressiv nach Begründungen für Faktor > 2.3.
    - Liste bMF aktiv auf.`;
  } else if (boosterLevel === 'standard' || boosterLevel === 'smart') {
    customMasterPrompt += `\n\n💰 UMSATZ-BOOSTER: SMART
    - Schlage Faktor-Steigerung nur bei medizinischer Indikation vor.`;
  }



  // 7. Practice Standards
  if (activeStandards && activeStandards.length > 0) {
    customMasterPrompt += `\n\n🏥 PRAXIS-STANDARDS (IMPLIZIT):
      "${activeStandards.join(', ')}"`;
  }
  if (inactiveStandards && inactiveStandards.length > 0) {
    customMasterPrompt += `\n\n⛔️ AUSGESCHLOSSENE STANDARDS: "${inactiveStandards.join(', ')}"`;
  }

  // 8. Material Integrity
  if (aiSettings.materialCheck) {
    customMasterPrompt += `\n\n🧪 MATERIAL-INTEGRITÄT:
    - Nur diktierte Materialien oder aus der Liste.
    - Sonst generisch (z.B. "Komposit").`;
  }

  // 9. Global Policies
  if (globalAiSettings.strictTerminology) {
    customMasterPrompt += `\n\n🎓 FACHSPRACHE: STRIKT (Akademisch).`;
  }

  // 10. (REMOVED: Absolute Rules moved to end)

  // --- BUILD TEMPLATE SPECIFIC PROMPT ---

  // Resolve Template Prompt (DB or Auto-Generated)
  let activePrompt = templateGPTPrompt || templatePrompt;
  if (!activePrompt || activePrompt.trim().length < 10) {
    activePrompt = getBlueprintPrompt(templateName, templateCategory);
  }

  // Prepare Variables
  const userSettingsString = Object.keys(practiceDefaults).length > 0
    ? Object.entries(practiceDefaults).map(([key, value]) => `${key}: ${value}`).join("; ")
    : "Keine spezifischen User-Settings.";

  const materialListString = templateMaterial
    ? templateMaterial.replace(/\n/g, ", ")
    : "Keine spezifischen Materialien.";

  // Inject
  let finalSystemPrompt = activePrompt
    .replace("{MATERIAL_LIST}", materialListString)
    .replace("{USER_SETTINGS}", userSettingsString);

  // FIX: Blueprint Strictness - Do NOT append materials if it's a Blueprint
  const isBlueprintMode = activePrompt.includes("BLUEPRINT MODE") || (templateCustomBlueprint && templateCustomBlueprint.length > 0);

  if (!activePrompt.includes("{MATERIAL_LIST}") && !isBlueprintMode) {
    // 1. Append Materials
    finalSystemPrompt += `\n\nKONTEXT:\nMaterialien: ${materialListString}\nUser-Settings: ${userSettingsString}`;

    // 2. Append Text Blocks (Bausteine) if provided
    if (bausteine && bausteine.length > 0) {
      finalSystemPrompt += `\n\n--- TEXTBAUSTEINE ---\n${bausteine.map(b => b.text || b).join("\n")}`;
    }
  }

  // Combine
  let systemPrompt = `${customMasterPrompt}\n\n⸻\n\nTEMPLATE-SPEZIFISCHE LOGIK:\n${finalSystemPrompt}`;

  // 11. ABSOLUTE RULES (Now truly at the end)
  systemPrompt += `\n\n⛔️ ABSOLUTE REGELN (HÖCHSTE PRIORITÄT - ÜBERSCHREIBT ALLES VORHERIGE):
  1. Erfinde KEIN RÖNTGENBILD, wenn es nicht diktiert wurde.
  2. Erfinde KEINE PREISE, wenn sie NICHT im Diktat stehen.
  3. ABER WICHTIG: Wenn ein Preis oder Kosten im Diktat genannt wurden, MÜSSEN sie übernommen werden!
  4. Achte penibel auf Großschreibung.
  5. FLÄCHEN-TREUE: Wenn "mesial" diktiert wurde, schreibe "m" (oder "mesial"). Schreibe NIEMALS "mod", wenn nicht alle drei Flächen diktiert wurden!
  6. ZAHNFLÄCHEN-FORMAT: Immer Kleinbuchstaben (m, d, o, mod).
  7. ZAHNNUMMERN: Immer FDI ohne Punkt (27, 36).`;

  // Build User Prompt with Dynamic Example
  const dynamicExampleOutput = getExampleOutput(activeBlueprint, activeTextLength, !!(templateCustomBlueprint && templateCustomBlueprint.trim().length > 10));
  const userPrompt = `BEISPIEL FÜR PERFEKTEN OUTPUT (Dein Gold-Standard):
${dynamicExampleOutput}

DIKTIERTER TEXT (Patientenfall):
${inputText}

ANWEISUNG:
Generiere jetzt die Dokumentation basierend auf dem System-Prompt.
Nutze NUR Fakten aus dem Input.`;

  return { systemPrompt, userPrompt };
}
