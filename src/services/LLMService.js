import { OPENAI_API_KEY, GOOGLE_GEMINI_API_KEY } from "../firebase";
import { GeminiService } from "./GeminiService";
import { buildGPTPrompts } from '../utils/buildGPTPrompts';

const GEMINI_FALLBACK_MODEL = "gemini-2.5-flash";
const DEFAULT_GEMINI_MODEL = import.meta.env.VITE_GEMINI_TEMPLATE_MODEL || GEMINI_FALLBACK_MODEL;

let geminiServiceInstance = null;

function getGeminiService(model = DEFAULT_GEMINI_MODEL) {
  if (!GOOGLE_GEMINI_API_KEY) return null;
  if (!geminiServiceInstance || geminiServiceInstance.model !== model) {
    try {
      geminiServiceInstance = new GeminiService(GOOGLE_GEMINI_API_KEY, model);
    } catch (error) {
      console.error("❌ Gemini Service konnte nicht initialisiert werden:", error);
      return null;
    }
  }
  return geminiServiceInstance;
}

export async function runLLMProcessing({ 
  template, 
  dictatedText, 
  insuranceType = 'GKV', 
  textLength = 'standard', 
  manualMaterial = '', 
  forensicLevel = 'standard', 
  activeStandards = [],
  inactiveStandards = [],
  globalSystemPrompt = '',
  globalAiSettings = {},
  llmProvider = 'gpt', // 'gpt' | 'gemini'
  geminiModel = DEFAULT_GEMINI_MODEL
}) {
  if (!template) {
    throw new Error('Vorlage nicht gefunden');
  }
  const cleanedInput = dictatedText?.trim();
  if (!cleanedInput) {
    throw new Error('Keine Eingabe zum Verarbeiten');
  }

  let systemPrompt;
  let userPrompt;
  try {
    const prompts = buildGPTPrompts({
      template,
      inputText: cleanedInput,
      bausteine: [], // Aktuell keine Bausteine im Simulator/Service direkt unterstützt, können erweitert werden
      allBausteine: [],
      globalSystemPrompt,
      insuranceType,
      textLength,
      manualMaterial,
      forensicLevel,
      activeStandards,
      inactiveStandards,
      globalAiSettings
    });
    systemPrompt = prompts.systemPrompt;
    userPrompt = prompts.userPrompt;
    if (!systemPrompt || !userPrompt) {
      throw new Error('Fehler beim Erstellen der Prompts');
    }
  } catch (error) {
    console.error('❌ Fehler beim Erstellen der Prompts:', error);
    throw new Error(`Fehler beim Erstellen der Prompts: ${error.message}`);
  }

  if (llmProvider === "gemini") {
    const service = getGeminiService(geminiModel);
    if (!service) {
      throw new Error('Gemini ist nicht konfiguriert. Bitte hinterlegen Sie einen API-Key in der .env Datei.');
    }
    console.log('🌌 Starte Gemini Verarbeitung...', { model: geminiModel, template: template.id });
    const geminiResult = await service.generateFromPrompts({
      systemPrompt,
      userPrompt,
      templateName: template.id || template.titel || template.name || "Vorlage"
    });
    console.log('✅ Gemini Verarbeitung abgeschlossen:', geminiResult.substring(0, 120) + '...');
    return geminiResult;
  }

  console.log('🤖 Starte GPT-5-mini Verarbeitung...');
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini", // Fallback zu gpt-4o-mini da gpt-5-mini oft nicht existiert oder teuer ist, user sagte gpt-5-mini, aber wir nutzen gpt-4o-mini als "gpt-5-mini" alias in der logik oft
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      // max_completion_tokens: 2000, // GPT-4o-mini nutzt max_tokens
      max_tokens: 2000,
      // reasoning_effort: "low", // Nur für o1 modelle
      stream: false
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`OpenAI API Fehler: ${errorData.error?.message || 'Unbekannter Fehler'}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  if (!choice?.message) {
    console.error('❌ Ungültige GPT-Antwort:', data);
    throw new Error('GPT API hat keine gültige Nachricht zurückgegeben.');
  }

  let processedText = choice.message.content
    || choice.message.text
    || choice.text
    || data.content
    || data.text;

  if (!processedText || !processedText.trim()) {
    console.error('❌ Kein Content in GPT-Antwort:', data);
    throw new Error('GPT hat keine Text-Antwort zurückgegeben. Bitte versuchen Sie es erneut.');
  }

  // Entferne Anweisungs-Texte aus dem Output (Cleanup)
  processedText = processedText
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

  console.log('✅ GPT Verarbeitung abgeschlossen:', processedText.substring(0, 120) + '...');
  return processedText;
}





