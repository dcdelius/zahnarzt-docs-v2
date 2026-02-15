import { OPENAI_API_KEY } from "../firebase";
import { analyzeMaterials as analyzeMaterialsFallback } from "../utils/materialAnalyzer";
import { SYSTEM_PROMPTS } from "../utils/systemPrompts";

/**
 * Analysiert Materialien mit GPT-4o und kategorisiert sie intelligent
 * @param {string} materialString - Material-String (komma-separiert)
 * @returns {Promise<Object>} - Kategorisierte Materialien
 */
export async function analyzeMaterialsWithGPT4o(materialString) {
  if (!materialString || typeof materialString !== 'string' || !materialString.trim()) {
    return {
      categorized: {},
      formatted: '',
      raw: materialString
    };
  }

  const prompt = SYSTEM_PROMPTS.MATERIAL_ANALYSIS.replace('{MATERIAL_STRING}', materialString);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'Du bist ein Experte für zahnmedizinische Materialien. Du analysierst Materialien und konvertierst sie in vollständige, korrekte Produktnamen. Du antwortest NUR mit gültigem JSON, keine zusätzlichen Erklärungen.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API Fehler: ${errorData.error?.message || 'Unbekannter Fehler'}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Keine Antwort von GPT-4o erhalten');
    }

    console.log('📥 GPT-4o Material-Analyse Antwort:', content);

    const result = JSON.parse(content);
    console.log('✅ Parsed Material-Analyse Ergebnis:', JSON.stringify(result, null, 2));

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

    // Sicherstellen, dass ALLE Materialien erhalten bleiben
    // Wenn ein Material nicht in result.categorized ist, füge es zu "other" hinzu
    const allMaterials = materialString.split(/[,\n]/).map(m => m.trim()).filter(m => m.length > 0);
    const foundMaterials = Object.values(result.categorized || {}).flat();
    const missingMaterials = allMaterials.filter(m => {
      // Prüfe, ob Material in einer Kategorie gefunden wurde
      return !foundMaterials.some(found => found.toLowerCase().includes(m.toLowerCase()) || m.toLowerCase().includes(found.toLowerCase()));
    });
    
    // Füge fehlende Materialien zu "other" hinzu
    if (missingMaterials.length > 0) {
      console.log('⚠️ Materialien nicht kategorisiert, füge zu "other" hinzu:', missingMaterials);
      if (!result.categorized) result.categorized = {};
      if (!result.categorized.other) result.categorized.other = [];
      result.categorized.other = [...(result.categorized.other || []), ...missingMaterials];
    }
    
    // Sicherstellen, dass die formatierte Ausgabe alle Kategorien enthält, auch wenn GPT-4o sie nicht erstellt
    const formattedOutputParts = Object.entries({ ...defaultCategories, ...result.categorized })
      .filter(([, materials]) => materials.length > 0)
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
        return `${categoryLabels[category] || category}: ${materials.join(', ')}`;
      });

    return {
      categorized: { ...defaultCategories, ...result.categorized },
      formatted: formattedOutputParts.join('\n') || '',
      raw: materialString
    };
  } catch (error) {
    console.error('Fehler bei GPT-4o Material-Analyse:', error);
    // Fallback auf einfache Analyse
    return analyzeMaterialsFallback(materialString);
  }
}

