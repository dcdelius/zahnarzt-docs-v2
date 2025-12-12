import { OPENAI_API_KEY } from '../firebase';

// Helper to clean up the LLM response
const cleanResponse = (text) => {
    if (!text) return "";
    return text
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
};

export const runLLMProcessing = async ({
    systemPrompt,
    userPrompt,
    model = "gpt-4o-mini",
    skipCleaning = false
}) => {
    console.log('🤖 Starte LLM Verarbeitung...', { model });

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                max_completion_tokens: 2000,
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
            throw new Error('Keine gültige Antwort von der API.');
        }

        const rawText = choice.message.content || "";
        const cleanedText = skipCleaning ? rawText : cleanResponse(rawText);

        console.log('✅ LLM Verarbeitung erfolgreich');
        return cleanedText;

    } catch (error) {
        console.error('❌ LLM Service Error:', error);
        throw error;
    }
};
