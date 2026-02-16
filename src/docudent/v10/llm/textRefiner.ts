/**
 * V10 Text Refiner (Optional, Guarded)
 *
 * Purpose: Grammar/stylistic cleanup of documentation text only.
 * Hard guards prevent content changes, codes, or hallucinations.
 */

import { isTestMode } from '../testOnly';
import { isLlmTextSafeForBillingBoundary } from './llmBoundaryContract';
import { callTextRefinerGateway } from './textRefinerGatewayClient';

export interface TextRefineInput {
    text: string;
    treatmentId: string;
    insuranceType: 'GKV' | 'PKV' | 'MKV';
    textLength: 'kurz' | 'mittel' | 'lang';
}

function isRefinerEnabled(): boolean {
    if (isTestMode()) return false;
    if (typeof window !== 'undefined') {
        return (import.meta as any)?.env?.VITE_V10_TEXT_REFINER === 'true';
    }
    return process.env.VITE_V10_TEXT_REFINER === 'true';
}

function getOpenAiKey(): string | undefined {
    return process.env.OPENAI_API_KEY || process.env.REACT_APP_OPENAI_API_KEY;
}

export function hasBillingCodeTokens(text: string): boolean {
    return !isLlmTextSafeForBillingBoundary(text);
}

function extractNumbers(text: string): string[] {
    return text.match(/\d+/g) ?? [];
}

function numbersMatch(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    const aSorted = [...a].sort();
    const bSorted = [...b].sort();
    return aSorted.every((val, idx) => val === bSorted[idx]);
}

export function isRefinementSafe(original: string, refined: string): boolean {
    if (!refined.trim()) return false;
    if (hasBillingCodeTokens(refined)) return false;

    const originalNumbers = extractNumbers(original);
    const refinedNumbers = extractNumbers(refined);
    if (!numbersMatch(originalNumbers, refinedNumbers)) return false;

    const ratio = refined.length / Math.max(original.length, 1);
    if (ratio < 0.7 || ratio > 1.3) return false;

    return true;
}

export async function refineDocumentationText(input: TextRefineInput): Promise<string | null> {
    if (!isRefinerEnabled()) return null;
    if (typeof window !== 'undefined') {
        const gatewayText = await callTextRefinerGateway(input);
        if (!gatewayText) return null;
        return isRefinementSafe(input.text, gatewayText) ? gatewayText : null;
    }

    const apiKey = getOpenAiKey();
    if (!apiKey) return null;

    const prompt = [
        'Du bist ein medizinischer Korrektor.',
        'Korrigiere NUR Grammatik, Rechtschreibung und Zeichensetzung.',
        'ÄNDERE KEINE inhaltlichen Fakten, Zahlen, Zahnnummern oder Begriffe.',
        'Füge KEINE neuen Sätze hinzu und entferne KEINE Sätze.',
        'Gib nur den korrigierten Text zurück (kein JSON, keine Erklärungen).',
    ].join('\n');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            temperature: 0,
            max_tokens: 800,
            messages: [
                { role: 'system', content: prompt },
                {
                    role: 'user',
                    content: [
                        `TREATMENT=${input.treatmentId}`,
                        `INSURANCE=${input.insuranceType}`,
                        `TEXT_LENGTH=${input.textLength}`,
                        '',
                        input.text,
                    ].join('\n'),
                },
            ],
        }),
    });

    if (!response.ok) {
        return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') return null;

    const refined = content.trim();
    if (!isRefinementSafe(input.text, refined)) {
        return null;
    }

    return refined;
}
