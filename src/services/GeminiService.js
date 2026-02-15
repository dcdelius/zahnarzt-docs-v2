// Google Gemini Service für präzise Abrechnungsanalyse
// Gemini ist speziell für medizinische Dokumentation und Faktenprüfung optimiert

import { analyzeMaterials, getCategoryLabel } from '../utils/materialAnalyzer';
import { SYSTEM_PROMPTS } from '../utils/systemPrompts';

const API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

export class GeminiService {
  constructor(apiKey, model = 'gemini-2.5-flash') {
    this.apiKey = apiKey;
    this.model = model;
    this.apiEndpoint = `${API_BASE_URL}/models/${model}:generateContent`;
  }

  setModel(model) {
    if (!model || model === this.model) return;
    this.model = model;
    this.apiEndpoint = `${API_BASE_URL}/models/${model}:generateContent`;
  }

  async callGemini({ contents, generationConfig, safetySettings, context = "Gemini Anfrage" }, retryCount = 0) {
    const fallbackModels = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-pro', 'gemini-1.5-pro'];

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey
        },
        body: JSON.stringify({
          contents,
          generationConfig,
          safetySettings
        })
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText || "{}");
      } catch (parseError) {
        console.error('❌ Ungültige JSON-Antwort von Gemini:', responseText);
        throw new Error(`Gemini (${this.model}) lieferte keine gültige JSON-Antwort (${context}).`);
      }

      if (!response.ok) {
        const errorMessage = data?.error?.message || response.statusText || 'Unbekannter Fehler';
        
        // FALLBACK LOGIC: Versuche alternative Modelle bei 404
        if ((response.status === 404 || errorMessage.includes('not found') || errorMessage.includes('404')) && retryCount < fallbackModels.length) {
            console.warn(`⚠️ Modell ${this.model} nicht gefunden (404), versuche Fallback auf ${fallbackModels[retryCount]}...`);
            this.setModel(fallbackModels[retryCount]);
            return this.callGemini({ contents, generationConfig, safetySettings, context }, retryCount + 1);
        }

        console.error('❌ Gemini API Fehler-Response:', JSON.stringify(data, null, 2));
        throw new Error(`Gemini (${this.model}) Fehler (${context}): ${errorMessage}`);
      }

      // Debug: Vollständige API-Antwort loggen
      console.log('📥 Gemini API-Antwort (vollständig):', JSON.stringify(data, null, 2));
      
      const candidate = data.candidates?.[0];
      
      // Prüfe finishReason für weitere Informationen
      if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
        console.warn('⚠️ Gemini finishReason:', candidate.finishReason);
        if (candidate.finishReason === 'SAFETY') {
          throw new Error(`Gemini (${this.model}) hat die Antwort aus Sicherheitsgründen blockiert (${context}).`);
        } else if (candidate.finishReason === 'MAX_TOKENS') {
          console.warn('⚠️ MAX_TOKENS erreicht, versuche vorhandenen Text zu extrahieren');
        } else {
          console.warn(`⚠️ Unerwarteter finishReason: ${candidate.finishReason}`);
        }
      }
      
      if (!candidate) {
        console.error('❌ Kein candidate in API-Antwort:', JSON.stringify(data, null, 2));
        throw new Error(`Gemini (${this.model}) lieferte keine candidates (${context}).`);
      }
      
      if (!candidate.content) {
        console.error('❌ Kein content in candidate:', JSON.stringify(candidate, null, 2));
        // Bei MAX_TOKENS könnte content fehlen, wenn thinking tokens das Limit erreicht haben
        if (candidate.finishReason === 'MAX_TOKENS') {
          const thoughtsCount = data.usageMetadata?.thoughtsTokenCount || 0;
          throw new Error(`Gemini (${this.model}) Token-Limit erreicht. Thinking tokens: ${thoughtsCount}. Bitte maxOutputTokens erhöhen oder Prompt kürzen (${context}).`);
        }
        throw new Error(`Gemini (${this.model}) lieferte keinen content (${context}).`);
      }
      
      if (!candidate.content.parts || candidate.content.parts.length === 0) {
        console.error('❌ Keine parts in content:', JSON.stringify(candidate.content, null, 2));
        // Bei MAX_TOKENS ohne parts: thinking tokens haben das Limit erreicht
        if (candidate.finishReason === 'MAX_TOKENS') {
          const thoughtsCount = data.usageMetadata?.thoughtsTokenCount || 0;
          throw new Error(`Gemini (${this.model}) Token-Limit erreicht (${thoughtsCount} thinking tokens). Kein Output generiert. Bitte maxOutputTokens erhöhen (${context}).`);
        }
        throw new Error(`Gemini (${this.model}) lieferte keine parts (${context}).`);
      }

      const text = candidate.content.parts
        .map(part => part.text || '')
        .join("\n")
        .trim();

      if (!text) {
        throw new Error(`Gemini (${this.model}) Antwort war leer (${context}).`);
      }

      return { text, candidate, data };
    } catch (error) {
      console.error('Gemini API Fehler:', error);
      throw error;
    }
  }

  /**
   * Globaler Basis-Prompt für alle Gemini-Aufrufe
   * Enthält grundlegende Regeln für deutsche Zahnmedizin
   */
  getGlobalPrompt() {
    return SYSTEM_PROMPTS.GERMAN_DENTAL_CONTEXT;
  }

  async analyzeBilling(documentationText, extras = []) {
    try {
      let extraInfo = "";
      if (extras.length > 0) {
        extraInfo = `Folgende Leistungen wurden nach Rückfrage tatsächlich erbracht, aber nicht dokumentiert: ${extras.join(", ")}. Bitte berücksichtige dies bei der Analyse.`;
      }

      const globalPrompt = this.getGlobalPrompt();
      const prompt = `${globalPrompt}

⸻

Analysiere die zahnärztliche Dokumentation und gib KURZ mögliche Abrechnungsziffern und fehlende Leistungen.

${extraInfo ? extraInfo + '\n\n' : ''}Dokumentation:
${documentationText}

Antworte KURZ im Format:
- GOZ/BEMA-Codes: [Liste der Codes, z.B. "2100, 2040"]
- Fehlende Leistungen: [Kurze Fragen, z.B. "Mehrschichttechnik durchgeführt?"]

Maximal 5 Zeilen.`;

      const { text } = await this.callGemini({
        context: "Abrechnungsanalyse",
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 300
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
        ]
      });

      // Entferne Anweisungs-Texte aus dem Output
      let cleanedText = text
        .replace(/🚨 WICHTIG - NUR FÜR INTERNE ANWEISUNGEN[^\n]*\n/g, '')
        .replace(/VERWENDETES MATERIAL[^\n]*\n/g, '')
        .replace(/KATEGORISIERUNG:[^\n]*\n/g, '')
        .replace(/MATERIAL-REGELN:[^\n]*\n/g, '')
        .replace(/VERFÜGBARE FORMULIERUNGEN[^\n]*\n/g, '')
        .replace(/DIKTIERTER TEXT[^\n]*\n/g, '')
        .replace(/KRITISCHE REGELN[^\n]*\n/g, '')
        .replace(/^[\s\n]*Anästhesie:.*$/gm, '')
        .replace(/^[\s\n]*Bonding:.*$/gm, '')
        .replace(/^[\s\n]*Flow:.*$/gm, '')
        .replace(/^[\s\n]*Komposit:.*$/gm, '')
        .replace(/^[\s\n]*Medikament:.*$/gm, '')
        .replace(/^[\s\n]*Sealer:.*$/gm, '')
        .replace(/^[\s\n]*Guttapercha:.*$/gm, '')
        .replace(/^[\s\n]*-.*→.*$/gm, '')
        .replace(/^[\s\n]*❌.*$/gm, '')
        .replace(/^\s+|\s+$/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      return cleanedText;
    } catch (error) {
      console.error('Gemini Fehler:', error);
      throw error;
    }
  }

  /**
   * Füllt eine Vorlage mit diktierte Informationen
   * Optimiert für präzise Template-Füllung mit minimalen Halluzinationen
   */
  async fillTemplate({ template, inputText, bausteine, allBausteine }) {
    try {
      // Extract template fields
      const templatePrompt = template.prompt || template.Prompt || "";
      const templateGeminiPrompt = template.GeminiPrompt || template.geminiPrompt || "";
      const templateText = template.Text || template.text || "";
      const templateMaterial = template.Material || template.material || "";
      const templateName = template.id || "";
      const templateCategory = template.Kategorie || "";
      const systemInstructions = template.systemInstructions || "";

      // Build baustein texts
      const aktiveBausteineData = (bausteine || [])
        .map(id => (allBausteine || []).find(b => b.id === id))
        .filter(Boolean);
      const bausteinTexte = aktiveBausteineData
        .map(b => typeof b.standardText === 'string' ? b.standardText : '')
        .filter(Boolean)
        .join("\n");

      // Build Gemini prompt (single prompt, no system/user separation)
      // WICHTIG: Nur template-spezifischer Prompt aus Firebase wird verwendet - kein globaler Fallback
      if (!templateGeminiPrompt || !templateGeminiPrompt.trim()) {
        throw new Error(`Kein Gemini-Prompt für Vorlage "${templateName}" gefunden. Bitte legen Sie einen Prompt in den Einstellungen für diese Vorlage an.`);
      }

      // Globaler Basis-Prompt + template-spezifischer Prompt
      const globalPrompt = this.getGlobalPrompt();
      const basePrompt = `${globalPrompt}

⸻

${templateGeminiPrompt}

⸻

VORLAGEN-STRUKTUR (unveränderlicher Kern - nur explizit genannte Inhalte überschreiben):
${templateText}`;

      const prompt = `${basePrompt}

${templateMaterial ? (() => {
  // Materialien analysieren und kategorisieren
  const materialAnalysis = analyzeMaterials(templateMaterial);
  const categorized = materialAnalysis.categorized;
  
  // Kategorisierte Materialien formatieren
  const categorizedList = Object.entries(categorized)
    .filter(([category, materials]) => materials.length > 0)
    .map(([category, materials]) => {
      const categoryLabels = {
        anesthesia: 'Anästhesie',
        bonding: 'Bonding',
        flow: 'Flow',
        composite: 'Komposit',
        sealer: 'Sealer',
        guttapercha: 'Guttapercha',
        medication: 'Medikament',
        isolation: 'Isolation',
        polish: 'Polier',
        cement: 'Zement',
        'build-up': 'Aufbau',
        other: 'Sonstige'
      };
      return `- ${categoryLabels[category] || category}: ${materials.join(', ')}`;
    })
    .join('\n');
  
  return `VERWENDETES MATERIAL:
${templateMaterial}

KATEGORISIERUNG:
${categorizedList || 'Keine Materialien erkannt'}

MATERIAL-REGELN:
- Kategorie → Feld: Anästhesie→Anästhesie, Bonding→Bonding, Flow→Flow, Komposit→Komposit, Sealer→Sealer, Guttapercha→Guttapercha, Medikament→Medikament/Spülprotokoll
- Jedes Material NUR EINMAL, NUR in passendem Feld
- ❌ NIEMALS falsch zuordnen oder erfinden
- Diktat-Materialien haben Vorrang

`;
})() : ''}${bausteinTexte ? `VERFÜGBARE FORMULIERUNGEN:
${bausteinTexte}

` : ''}DIKTIERTER TEXT (korrigiere medizinische Begriffe und Flächen):
${inputText}

TEXT-KORREKTUR:
- Medizinische Begriffe: Ultracain (nicht Ultrakain), Articain (nicht Artikain), Lidocain (nicht Lidokain), Vivapen (nicht Vivaphen), Gaenial Flow (nicht Genial Flow), Tetric EvoCeram (nicht Tetric Evo Ceram), Kofferdamm (nicht Kofferdam), Komposit (nicht Komposid)
- Zahnflächen: Kleinbuchstaben, ohne Punkte (z.B. "M.O.D." → "mod", "mesial okklusal distal" → "mod")
- Zahnnummern: FDI ohne Punkt (z.B. "2.7" → "27", "3.6" → "36")

REGELN:
- Anästhesie: Diktat "ja" → "ja" + Material (falls vorhanden), sonst "nein" oder entfernen
- Kosten: "X € pro Kanal/Fläche" → exakt so verwenden
- Nicht erwähnt → bleibt wie Vorlage
- Nur fertigen Text ausgeben`;

      const { text } = await this.callGemini({
        context: `Vorlage ${templateName}`,
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          topK: 20,
          topP: 0.9,
          maxOutputTokens: 1000
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
        ]
      });

      // Entferne Anweisungs-Texte aus dem Output
      let cleanedText = text
        .replace(/🚨 WICHTIG - NUR FÜR INTERNE ANWEISUNGEN[^\n]*\n/g, '')
        .replace(/VERWENDETES MATERIAL[^\n]*\n/g, '')
        .replace(/KATEGORISIERUNG:[^\n]*\n/g, '')
        .replace(/MATERIAL-REGELN:[^\n]*\n/g, '')
        .replace(/VERFÜGBARE FORMULIERUNGEN[^\n]*\n/g, '')
        .replace(/DIKTIERTER TEXT[^\n]*\n/g, '')
        .replace(/KRITISCHE REGELN[^\n]*\n/g, '')
        .replace(/^[\s\n]*Anästhesie:.*$/gm, '')
        .replace(/^[\s\n]*Bonding:.*$/gm, '')
        .replace(/^[\s\n]*Flow:.*$/gm, '')
        .replace(/^[\s\n]*Komposit:.*$/gm, '')
        .replace(/^[\s\n]*Medikament:.*$/gm, '')
        .replace(/^[\s\n]*Sealer:.*$/gm, '')
        .replace(/^[\s\n]*Guttapercha:.*$/gm, '')
        .replace(/^[\s\n]*-.*→.*$/gm, '')
        .replace(/^[\s\n]*❌.*$/gm, '')
        .replace(/^\s+|\s+$/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      return cleanedText;
    } catch (error) {
      console.error('Gemini Template-Filling Fehler:', error);
      throw error;
    }
  }

  /**
   * Analysiert Materialien mit Gemini und kategorisiert sie intelligent
   * @param {string} materialString - Material-String (komma-separiert)
   * @returns {Promise<Object>} - Kategorisierte Materialien
   */
  async analyzeMaterials(materialString) {
    if (!materialString || typeof materialString !== 'string' || !materialString.trim()) {
      return {
        categorized: {},
        formatted: '',
        raw: materialString
      };
    }

    const prompt = `Du bist ein Experte für zahnmedizinische Materialien mit umfassendem Wissen über Produktnamen, Markenbezeichnungen, Konzentrationen und offizielle Bezeichnungen. Deine Aufgabe ist es, Materialien zu erkennen, zu kategorisieren und in ihre vollständigen, korrekten Produktnamen zu konvertieren.

MATERIALIEN ZU ANALYSIEREN:
${materialString}

🚨 KRITISCH WICHTIG - VOLLSTÄNDIGE PRODUKTNAMEN:
Du MUSST jeden Materialnamen in seinen vollständigen, offiziellen Produktnamen konvertieren. Verwende NICHT die eingegebenen Namen einfach so, sondern finde die korrekten, vollständigen Produktnamen.

ALLGEMEINE REGELN FÜR VOLLSTÄNDIGE PRODUKTNAMEN:

1. ANÄSTHESIE-MATERIALIEN:
   - Erkenne den Wirkstoff (z.B. Articain, Lidocain, Mepivacain)
   - Finde die vollständige Produktbezeichnung mit Markenzeichen (®)
   - Füge Konzentration hinzu (z.B. "2%", "4%")
   - Füge Adrenalin-Verhältnis hinzu, wenn vorhanden (z.B. "1:200.000", "1:100.000", "1:50.000")
   - Füge Typ/Bezeichnung hinzu, wenn vorhanden (z.B. "D-S", "Forte", "DS", "Standard")
   - Beispiel: "Ultracain Dental" → "Ultracain® D-S 1:200.000"
   - Beispiel: "Articain" → "Articain® 4% mit Adrenalin 1:200.000"

2. BONDING/ADHÄSIV-MATERIALIEN:
   - Erkenne den Produktnamen
   - Füge Markenzeichen hinzu (® oder ™)
   - Füge Variante/Typ hinzu, wenn vorhanden (z.B. "Universal", "FL", "XTR")
   - Beispiel: "Vivapen universal" → "Vivapen® Universal"
   - Beispiel: "OptiBond" → "OptiBond® FL"

3. FLOW-KOMPOSITE:
   - Erkenne den Produktnamen
   - Füge Markenzeichen hinzu
   - Behalte "Flow" im Namen
   - Füge Farbe hinzu, wenn vorhanden (z.B. "A3", "A2", "Bleach")
   - Beispiel: "Gaenial Flow A3" → "Gaenial® Flow A3"

4. KOMPOSIT-MATERIALIEN:
   - Erkenne den Produktnamen
   - Füge Markenzeichen hinzu
   - Füge vollständigen Produktnamen hinzu (z.B. "EvoCeram", "Supreme XTE")
   - Füge Farbe hinzu, wenn vorhanden
   - Beispiel: "Tetric EvoCeram A3" → "Tetric® EvoCeram A3"

5. WURZELFÜLLUNGS-MATERIALIEN:
   - Sealer: Vollständiger Name mit Markenzeichen und Typ (z.B. "BioCeramic Sealer", "AH Plus")
   - Guttapercha: Vollständiger Name (z.B. "Guttapercha", "GP")
   - Medikamente: Vollständiger Name mit Konzentration, falls vorhanden

6. ISOLATION-MATERIALIEN:
   - Vollständiger Name mit Markenzeichen (z.B. "Kofferdamm", "OptiDam®")

7. POLIER-MATERIALIEN:
   - Vollständiger Name mit Markenzeichen und Typ (z.B. "Sof-Lex™", "OptiShine®")

8. ZEMENT-MATERIALIEN:
   - Vollständiger Name mit Markenzeichen und Typ (z.B. "Fuji® IX", "Glasionomer")

9. ALLE ANDEREN MATERIALIEN:
   - Finde den vollständigen, offiziellen Produktnamen
   - Füge Markenzeichen hinzu, wenn bekannt
   - Füge Typ/Variante hinzu, wenn vorhanden
   - Verwende die korrekte medizinische Bezeichnung

AUFGABE:
1. ERKENNE jedes Material und finde den vollständigen, korrekten Produktnamen basierend auf den obigen Regeln

2. KATEGORISIERE jedes Material in eine der folgenden Kategorien:
   - anesthesia: Alle Anästhesiemittel (Ultracain, Articain, Lidocain, Mepivacain, etc.)
   - bonding: Alle Bonding/Adhäsiv-Materialien (Vivapen, Adhese, OptiBond, etc.)
   - flow: Alle Flow-Komposite (Gaenial Flow, Tetric Flow, etc.)
   - composite: Alle Komposit-Materialien (Tetric EvoCeram, Filtek, Grandio, etc.)
   - sealer: Wurzelfüllungs-Sealer (BioCeramic Sealer, AH Plus, etc.)
   - guttapercha: Guttapercha-Materialien
   - medication: Medikamente (Ultracal XS, Ledermix, etc.)
   - isolation: Isolation-Materialien (Kofferdamm, OptiDam, etc.)
   - polish: Polier-Materialien (Sof-Lex, OptiShine, etc.)
   - cement: Zement-Materialien (Glasionomer, Fuji, etc.)
   - "build-up": Aufbau-Materialien
   - other: Alle anderen Materialien

3. Gib die Antwort im folgenden JSON-Format zurück:
{
  "categorized": {
    "anesthesia": ["Ultracain® D-S 1:200.000", "..."],
    "bonding": ["Vivapen® Universal", "..."],
    "flow": ["Gaenial® Flow A3", "..."],
    "composite": ["Tetric® EvoCeram A3", "..."],
    "sealer": ["..."],
    "guttapercha": ["..."],
    "medication": ["..."],
    "isolation": ["..."],
    "polish": ["..."],
    "cement": ["..."],
    "build-up": ["..."],
    "other": ["..."]
  },
  "formatted": "Anästhesie: Ultracain® D-S 1:200.000\nBonding: Vivapen® Universal\nFlow: Gaenial® Flow A3\nKomposit: Tetric® EvoCeram A3"
}

🚨🚨🚨 KRITISCH WICHTIG - DIESE REGELN MÜSSEN ABSOLUT EINGEHALTEN WERDEN 🚨🚨🚨:

1. NIEMALS die eingegebenen Materialnamen einfach übernehmen!
2. IMMER die vollständigen, offiziellen Produktnamen finden und verwenden!
3. Bei Anästhesie: IMMER Markenzeichen (®), Typ (D-S, Forte, etc.) und Konzentration (1:200.000, 1:100.000) hinzufügen
   - "Ultracain Dental" MUSS zu "Ultracain® D-S 1:200.000" werden
   - "Ultracain DS" MUSS zu "Ultracain® D-S 1:200.000" werden
   - "Ultracain" MUSS zu "Ultracain® D-S 1:200.000" werden
4. Bei Bonding: IMMER Markenzeichen (®) und vollständigen Produktnamen verwenden
   - "Vivapen universal" MUSS zu "Vivapen® Universal" werden
5. Bei Kompositen: IMMER Markenzeichen (® oder ™) und vollständigen Produktnamen mit Farbe (falls vorhanden)
6. Korrigiere Schreibfehler (z.B. "Ultrakain" → "Ultracain® D-S 1:200.000")
7. Verwende die offiziellen Produktnamen, wie sie in der Zahnmedizin verwendet werden
8. Jedes Material nur einmal kategorisieren
9. Wenn ein Material nicht eindeutig zugeordnet werden kann, verwende "other" aber behalte den vollständigen Namen

WICHTIG: Die Materialien im JSON-Objekt "categorized" MÜSSEN die vollständigen Produktnamen enthalten, NICHT die eingegebenen Namen!

ALLGEMEINE REGELN FÜR DIE KATEGORISIERUNG:
- Analysiere jedes Material und ordne es der passenden Kategorie zu
- Verwende die vollständigen, korrekten Produktnamen (nicht die eingegebenen)
- Jedes Material nur einmal kategorisieren
- Wenn ein Material nicht eindeutig zugeordnet werden kann, verwende "other" aber behalte den vollständigen Namen

FORMAT FÜR DIE AUSGABE:
Die "formatted" Ausgabe sollte die Materialien nach Kategorien gruppiert und lesbar formatieren:
"Anästhesie: [Material 1], [Material 2]\nBonding: [Material 1]\nFlow: [Material 1]"

Antworte NUR mit dem JSON-Objekt, keine zusätzlichen Erklärungen.`;

    try {
      const { text } = await this.callGemini({
        context: 'Material-Analyse',
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          topK: 20,
          topP: 0.9,
          maxOutputTokens: 2000
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
        ]
      });

      // Debug: Logge die rohe Antwort
      console.log('📥 Gemini Material-Analyse Antwort:', text);
      
      // JSON aus der Antwort extrahieren
      let jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('❌ Keine JSON in Gemini-Antwort gefunden:', text);
        throw new Error('Keine JSON-Antwort von Gemini erhalten');
      }

      const result = JSON.parse(jsonMatch[0]);
      console.log('✅ Parsed Material-Analyse Ergebnis:', JSON.stringify(result, null, 2));
      
      // Validierung: Prüfe ob vollständige Namen verwendet wurden
      const hasFullNames = Object.values(result.categorized || {})
        .flat()
        .some(name => name.includes('®') || name.includes('™') || name.includes('1:'));
      
      if (!hasFullNames && Object.values(result.categorized || {}).flat().length > 0) {
        console.warn('⚠️ WARNUNG: Gemini hat möglicherweise nicht die vollständigen Produktnamen zurückgegeben!');
        console.warn('Erhaltene Materialien:', Object.values(result.categorized || {}).flat());
      }
      
      // Sicherstellen, dass alle Kategorien existieren
      const defaultCategories = {
        anesthesia: [],
        bonding: [],
        flow: [],
        composite: [],
        sealer: [],
        guttapercha: [],
        medication: [],
        isolation: [],
        polish: [],
        cement: [],
        'build-up': [],
        other: []
      };

      return {
        categorized: { ...defaultCategories, ...result.categorized },
        formatted: result.formatted || '',
        raw: materialString
      };
    } catch (error) {
      console.error('Fehler bei Material-Analyse:', error);
      // Fallback auf einfache Analyse (bereits importiert)
      return analyzeMaterials(materialString);
    }
  }

  /**
   * Neue, generische Variante: Verwendet bereits gebaute System-/User-Prompts (z.B. aus buildGPTPrompts)
   * und liefert die fertige Dokumentation zurück – ideal, um zwischen GPT und Gemini umzuschalten.
   * 
   * WICHTIG: Gemini API unterstützt keine "system" Rolle - System-Prompt wird in User-Prompt integriert.
   */
  async generateFromPrompts({ systemPrompt, userPrompt, templateName = "Unbekannt" }) {
    try {
      // Gemini unterstützt keine "system" Rolle - System-Prompt in User-Prompt integrieren
      const combinedPrompt = `${systemPrompt}

⸻
NUTZER-EINGABE:
${userPrompt}`;

      const { text } = await this.callGemini({
        context: `Prompt-Verarbeitung ${templateName}`,
        contents: [
          { 
            role: "user",  // Nur "user" oder "model" sind erlaubt - kein "system"
            parts: [{ text: combinedPrompt }] 
          }
        ],
        generationConfig: {
          temperature: 0.2,
          topK: 30,
          topP: 0.9,
          maxOutputTokens: 4000  // Erhöht für längere Dokumentationen + thinking tokens (Gemini 2.5 Flash verwendet thoughts)
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
        ]
      });

      // Entferne Anweisungs-Texte aus dem Output
      let cleanedText = text
        .replace(/🚨 WICHTIG - NUR FÜR INTERNE ANWEISUNGEN[^\n]*\n/g, '')
        .replace(/VERWENDETES MATERIAL[^\n]*\n/g, '')
        .replace(/KATEGORISIERUNG:[^\n]*\n/g, '')
        .replace(/MATERIAL-REGELN:[^\n]*\n/g, '')
        .replace(/VERFÜGBARE FORMULIERUNGEN[^\n]*\n/g, '')
        .replace(/DIKTIERTER TEXT[^\n]*\n/g, '')
        .replace(/KRITISCHE REGELN[^\n]*\n/g, '')
        .replace(/^[\s\n]*Anästhesie:.*$/gm, '')
        .replace(/^[\s\n]*Bonding:.*$/gm, '')
        .replace(/^[\s\n]*Flow:.*$/gm, '')
        .replace(/^[\s\n]*Komposit:.*$/gm, '')
        .replace(/^[\s\n]*Medikament:.*$/gm, '')
        .replace(/^[\s\n]*Sealer:.*$/gm, '')
        .replace(/^[\s\n]*Guttapercha:.*$/gm, '')
        .replace(/^[\s\n]*-.*→.*$/gm, '')
        .replace(/^[\s\n]*❌.*$/gm, '')
        .replace(/^\s+|\s+$/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      return cleanedText;
    } catch (error) {
      console.error('Gemini Prompt-Verarbeitung Fehler:', error);
      throw error;
    }
  }

  /**
   * Schnelle Korrektur von medizinischen Begriffen, Flächen und Zahnnummern
   * Optimiert für schnelle Post-Processing von Transkriptionen
   */
  async quickCorrection(transcribedText) {
    try {
      // Schritt 1: Direkte Korrekturen für häufig falsch erkannte Begriffe (schneller als Gemini)
      let correctedText = transcribedText;
      
      // Häufige Fehler bei medizinischen Begriffen (Web Speech API erkennt diese oft falsch)
      const commonCorrections = [
        // Zahnflächen - häufige Fehler
        { pattern: /\b(messial|mesial|messial)\b/gi, replacement: 'mesial' },
        { pattern: /\b(distel|distal)\b/gi, replacement: 'distal' },
        { pattern: /\b(okklusiv|okklusal)\b/gi, replacement: 'okklusal' },
        { pattern: /\b(bukal|bukkal)\b/gi, replacement: 'bukkal' },
        // Zahnnummern - häufige Fehler
        { pattern: /\bsans\b/gi, replacement: 'Zahn' },
        { pattern: /\b(\d+)\.(\d+)\b/g, replacement: '$1$2' }, // "2.7" → "27"
        { pattern: /\b(\d+),(\d+)\b/g, replacement: '$1$2' }, // "2,7" → "27"
        // Medikamente
        { pattern: /\bUltrakainforte\b/gi, replacement: 'Ultracain Forte' },
        { pattern: /\bUltrakain\b/gi, replacement: 'Ultracain' },
        { pattern: /\bArtikain\b/gi, replacement: 'Articain' },
        { pattern: /\bLidokain\b/gi, replacement: 'Lidocain' },
        { pattern: /\bVivaphen\b/gi, replacement: 'Vivapen' },
        { pattern: /\bGenial Flow\b/gi, replacement: 'Gaenial Flow' },
        { pattern: /\bTetric Evo Ceram\b/gi, replacement: 'Tetric EvoCeram' },
        { pattern: /\bKofferdam\b/gi, replacement: 'Kofferdamm' },
        { pattern: /\bKomposid\b/gi, replacement: 'Komposit' },
      ];
      
      for (const correction of commonCorrections) {
        correctedText = correctedText.replace(correction.pattern, correction.replacement);
      }
      
      // Wenn keine Änderungen vorgenommen wurden, verwende Originaltext
      if (correctedText === transcribedText) {
        // Trotzdem Gemini für komplexere Korrekturen verwenden
      }
      
      // Schritt 2: Gemini für komplexere Korrekturen (Flächen-Abkürzungen, Kontext-Korrekturen)
      const prompt = `Korrigiere zahnmedizinischen Text:

${correctedText}

KRITISCHE KORREKTUREN:

1. MEDIZINISCHE BEGRIFFE:
- Anästhesie: "Anästhesie", "Anästhesie", "Anästhesie" (nicht "Anästhesie", "Anästhesie")
- Medikamente: "Ultrakainforte"→"Ultracain Forte", "Ultrakain"→"Ultracain", "Artikain"→"Articain", "Lidokain"→"Lidocain", "Vivaphen"→"Vivapen", "Genial Flow"→"Gaenial Flow", "Tetric Evo Ceram"→"Tetric EvoCeram", "Kofferdam"→"Kofferdamm", "Komposid"→"Komposit"

2. ZAHNFLÄCHEN (Web Speech API erkennt diese oft falsch - korrigiere alle Varianten):
- "messial", "mesial", "messial", "mesial", "messial" → "mesial" (oder "m" wenn Abkürzung)
- "distal", "distel", "distal", "distel", "distal" → "distal" (oder "d" wenn Abkürzung)
- "okklusal", "okklusiv", "okklusal", "okklusiv", "okklusal", "okklusiv" → "okklusal" (oder "o" wenn Abkürzung)
- "bukkal", "bukal", "bukkal", "bukal", "bukkal" → "bukkal" (oder "b" wenn Abkürzung)
- "palatinal", "palatinal", "palatinal" → "palatinal" (oder "p" wenn Abkürzung)
- "lingual", "lingual", "lingual" → "lingual" (oder "l" wenn Abkürzung)
- "inzisal", "inzisal", "inzisal" → "inzisal" (oder "i" wenn Abkürzung)
- "vestibulär", "vestibulär", "vestibulär" → "vestibulär" (oder "v" wenn Abkürzung)
- Wenn mehrere Flächen genannt werden (z.B. "mesial okklusal distal"), in Abkürzung umwandeln: "mod"

3. ZAHNFLÄCHEN-ABKÜRZUNGEN (IMMER Kleinbuchstaben ohne Punkte):
- "M.O.D."→"mod", "MOD"→"mod", "M O D"→"mod"
- "mesial okklusal distal"→"mod"
- "bukkal okklusal"→"bo"
- "distal okklusal"→"do"
- "palatinal okklusal"→"po"
- Vollständige Wörter → Kleinbuchstaben (z.B. "mesial"→"m", "distal"→"d", "okklusal"→"o")

4. ZAHNNUMMERN (FDI ohne Punkt):
- "2.7"→"27", "2,7"→"27", "zwei sieben"→"27"
- "3.6"→"36", "3,6"→"36", "drei sechs"→"36"
- "1.1"→"11", "1,1"→"11", "eins eins"→"11"
- "sans 27"→"Zahn 27", "sans"→"Zahn"
- "Zahn siebenundzwanzig"→"Zahn 27"
- "Zahn sechsunddreißig"→"Zahn 36"

5. WEITERE KORREKTUREN:
- "flächenmäßiger"→"flächenmäßig" oder entfernen wenn nicht nötig
- "den" vor Zahnnummern entfernen wenn falsch platziert
- "eines der sie"→korrigieren basierend auf Kontext

WICHTIG:
- Gib NUR den korrigierten Text aus, keine Erklärungen
- Behalte die ursprüngliche Struktur und Satzzeichen bei
- Korrigiere nur Fehler, ändere nichts am Inhalt
- Wenn unsicher, behalte Original bei`;

      const { text, candidate } = await this.callGemini({
        context: "Quick-Correction",
        contents: [
          { role: "user", parts: [{ text: prompt }] }
        ],
        generationConfig: {
          temperature: 0.1,
          topK: 20,
          topP: 0.9,
          maxOutputTokens: 1000
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
        ]
      });

      if (candidate.finishReason === 'MAX_TOKENS' && !text) {
        console.warn('⚠️ Gemini Quick-Correction MAX_TOKENS – nutze Originaltext.');
        return transcribedText;
      }

      return text;
    } catch (error) {
      console.error('Gemini Quick-Correction Fehler:', error);
      throw error;
    }
  }

  /**
   * Beantwortet medizinische/zahnmedizinische Fragen
   * Optimiert für medizinische Wissensdatenbank
   */
  async answerMedicalQuestion(question, conversationHistory = []) {
    try {
      // Baue Kontext aus Konversationshistorie
      let contextHistory = "";
      if (conversationHistory.length > 0) {
        contextHistory = "\n\nVorherige Konversation:\n";
        conversationHistory.forEach((msg, idx) => {
          if (msg.role === 'user') {
            contextHistory += `Frage: ${msg.content}\n`;
          } else if (msg.role === 'assistant') {
            contextHistory += `Antwort: ${msg.content}\n\n`;
          }
        });
      }

      const globalPrompt = this.getGlobalPrompt();
      const prompt = `${globalPrompt}

⸻

Du bist ein Experte für Zahnmedizin und Medizin. Beantworte die folgende Frage KURZ und präzise.

${contextHistory}

Aktuelle Frage: ${question}

WICHTIG - KURZE, PRÄGNANTE ANTWORT:
- Maximal 3-4 Sätze oder 5-6 Bullet Points
- Präzise und evidenzbasiert
- Basierend auf aktuellen Leitlinien
- Nur die wichtigsten Informationen
- KEINE langen Erklärungen oder Hintergrundinformationen
- KEIN einleitender Satz wie "Als Experte..." - direkt zur Antwort
- KEINE Markdown-Formatierung (keine **, keine #, keine Listen-Symbole)
- Normale Sätze oder kurze Absätze, einfach und klar formuliert
- Wenn du dir nicht sicher bist, gib dies kurz an

Antworte jetzt KURZ und direkt, ohne Einleitung:`;

      const { text } = await this.callGemini({
        context: "Medical Question",
        contents: [
          { role: "user", parts: [{ text: prompt }] }
        ],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 3000  // Erhöht für Gemini 2.5 (thinking tokens + output)
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
        ]
      });

      // Entferne Anweisungs-Texte aus dem Output
      let cleanedText = text
        .replace(/🚨 WICHTIG - NUR FÜR INTERNE ANWEISUNGEN[^\n]*\n/g, '')
        .replace(/VERWENDETES MATERIAL[^\n]*\n/g, '')
        .replace(/KATEGORISIERUNG:[^\n]*\n/g, '')
        .replace(/MATERIAL-REGELN:[^\n]*\n/g, '')
        .replace(/VERFÜGBARE FORMULIERUNGEN[^\n]*\n/g, '')
        .replace(/DIKTIERTER TEXT[^\n]*\n/g, '')
        .replace(/KRITISCHE REGELN[^\n]*\n/g, '')
        .replace(/^[\s\n]*Anästhesie:.*$/gm, '')
        .replace(/^[\s\n]*Bonding:.*$/gm, '')
        .replace(/^[\s\n]*Flow:.*$/gm, '')
        .replace(/^[\s\n]*Komposit:.*$/gm, '')
        .replace(/^[\s\n]*Medikament:.*$/gm, '')
        .replace(/^[\s\n]*Sealer:.*$/gm, '')
        .replace(/^[\s\n]*Guttapercha:.*$/gm, '')
        .replace(/^[\s\n]*-.*→.*$/gm, '')
        .replace(/^[\s\n]*❌.*$/gm, '')
        .replace(/^\s+|\s+$/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      return cleanedText;
    } catch (error) {
      console.error('Gemini Medical Question Fehler:', error);
      throw error;
    }
  }
}

