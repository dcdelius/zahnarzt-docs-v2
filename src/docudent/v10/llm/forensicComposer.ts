import { isTestMode } from '../testOnly';
import { isLlmTextSafeForBillingBoundary } from './llmBoundaryContract';
import { callForensicComposerGateway } from './forensicComposerGatewayClient';

export interface ForensicComposeSection {
    id: string;
    label: string;
    content: string;
}

export interface ForensicComposeInput {
    treatmentId: string;
    insuranceType: 'GKV' | 'PKV' | 'MKV';
    textLength: 'kurz' | 'mittel' | 'lang';
    sections: ForensicComposeSection[];
    context?: {
        instanceCount?: number;
        unresolvedForensicHints?: string[];
        documentationContext?: {
            clinical?: string[];
            patient?: string[];
            administrative?: string[];
            forensicNotes?: string[];
        };
    };
}

function isComposerEnabled(): boolean {
    if (isTestMode()) return false;
    if (typeof window !== 'undefined') {
        return (import.meta as any)?.env?.VITE_V10_FORENSIC_COMPOSER === 'true';
    }
    return process.env.VITE_V10_FORENSIC_COMPOSER === 'true';
}

export function isForensicComposerEnabled(): boolean {
    return isComposerEnabled();
}

function getOpenAiKey(): string | undefined {
    return process.env.OPENAI_API_KEY;
}

function extractNumbers(text: string): string[] {
    return text.match(/\d+/g) ?? [];
}

function compareNumberMultiset(source: string, target: string): boolean {
    const left = extractNumbers(source).sort();
    const right = extractNumbers(target).sort();
    if (left.length !== right.length) return false;
    return left.every((value, index) => value === right[index]);
}

function parseJsonObject(raw: string): unknown | null {
    const stripped = raw
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
    const match = stripped.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
        return JSON.parse(match[0]);
    } catch {
        return null;
    }
}

function normalizeSectionsFromUnknown(value: unknown): ForensicComposeSection[] {
    if (!Array.isArray(value)) return [];
    return value
        .filter(section => section && typeof section === 'object')
        .map((section) => {
            const record = section as Record<string, unknown>;
            return {
                id: String(record.id ?? '').trim(),
                label: String(record.label ?? '').trim(),
                content: String(record.content ?? '').trim(),
            };
        })
        .filter(section => section.id.length > 0 && section.label.length > 0 && section.content.length > 0);
}

function serializeSections(sections: ForensicComposeSection[]): string {
    return sections
        .map(section => `[${section.label}]\n${section.content}`)
        .join('\n\n');
}

function labelsById(sections: ForensicComposeSection[]): Map<string, string> {
    return new Map(sections.map(section => [section.id, section.label]));
}

export function isForensicCompositionSafe(
    original: ForensicComposeSection[],
    candidate: ForensicComposeSection[]
): boolean {
    if (!Array.isArray(candidate) || candidate.length === 0) return false;
    if (candidate.length !== original.length) return false;

    const originalIds = original.map(section => section.id);
    const candidateIds = candidate.map(section => section.id);
    if (originalIds.some((id, index) => id !== candidateIds[index])) return false;

    const originalLabels = labelsById(original);
    const candidateText = serializeSections(candidate);
    const originalText = serializeSections(original);
    if (!candidateText.trim()) return false;
    if (!isLlmTextSafeForBillingBoundary(candidateText)) return false;
    if (!compareNumberMultiset(originalText, candidateText)) return false;

    const lengthRatio = candidateText.length / Math.max(originalText.length, 1);
    if (lengthRatio < 0.7 || lengthRatio > 1.45) return false;

    for (const section of candidate) {
        const expectedLabel = originalLabels.get(section.id);
        if (!expectedLabel) return false;
        if (section.label !== expectedLabel) return false;
        if (section.content.trim().length === 0) return false;
    }

    return true;
}

export async function composeForensicDocumentation(
    input: ForensicComposeInput
): Promise<ForensicComposeSection[] | null> {
    if (!isComposerEnabled()) return null;
    if (!Array.isArray(input.sections) || input.sections.length === 0) return null;

    if (typeof window !== 'undefined') {
        const gatewaySections = await callForensicComposerGateway(input);
        if (!gatewaySections) return null;
        return isForensicCompositionSafe(input.sections, gatewaySections) ? gatewaySections : null;
    }

    const apiKey = getOpenAiKey();
    if (!apiKey) return null;

    const prompt = [
        'Du bist ein medizinischer Forensik-Redaktor fuer zahnmedizinische Dokumentation (Deutschland).',
        'Eingabe ist eine strukturierte Liste von Abschnitten mit IDs.',
        'Aufgabe: verbessere sprachliche Qualitaet und forensische Klarheit.',
        'NICHT erlaubt: neue medizinische Fakten erfinden, Fakten entfernen, Zahlen aendern, Zahnnummern aendern, Billing-Codes einfuehren.',
        'Die Ausgabe MUSS JSON sein: {"sections":[{"id":"...","label":"...","content":"..."}]}',
        'Nutze exakt dieselben section IDs in derselben Reihenfolge.',
        'labels muessen unveraendert bleiben.',
        'Kein Freitext ausserhalb des JSON.',
    ].join('\n');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            temperature: 0,
            max_tokens: 1200,
            messages: [
                { role: 'system', content: prompt },
                {
                    role: 'user',
                    content: JSON.stringify(input),
                },
            ],
        }),
    });

    if (!response.ok) return null;
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = String(payload?.choices?.[0]?.message?.content ?? '').trim();
    if (!content) return null;

    const parsed = parseJsonObject(content);
    if (!parsed || typeof parsed !== 'object') return null;
    const sections = normalizeSectionsFromUnknown((parsed as { sections?: unknown }).sections);
    if (sections.length === 0) return null;

    return isForensicCompositionSafe(input.sections, sections) ? sections : null;
}
