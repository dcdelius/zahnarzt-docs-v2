import { getFunctions, httpsCallable } from 'firebase/functions';

import type { ForensicComposeInput, ForensicComposeSection } from './forensicComposer';

type ForensicComposerGatewayInput = ForensicComposeInput;

type ForensicComposerGatewayOutput = {
    sections: ForensicComposeSection[];
};

let functionsInstance: ReturnType<typeof getFunctions> | null = null;

function getFunctionsInstance() {
    if (!functionsInstance) {
        functionsInstance = getFunctions();
    }
    return functionsInstance;
}

export async function callForensicComposerGateway(
    input: ForensicComposeInput
): Promise<ForensicComposeSection[] | null> {
    const callable = httpsCallable<
        ForensicComposerGatewayInput,
        ForensicComposerGatewayOutput
    >(getFunctionsInstance(), 'composeForensicDocumentationV1');

    const result = await callable(input);
    const sections = result?.data?.sections;
    if (!Array.isArray(sections)) return null;

    const normalized = sections
        .filter(section => section && typeof section === 'object')
        .map(section => ({
            id: String(section.id ?? '').trim(),
            label: String(section.label ?? '').trim(),
            content: String(section.content ?? '').trim(),
        }))
        .filter(section => section.id.length > 0 && section.label.length > 0 && section.content.length > 0);

    return normalized.length > 0 ? normalized : null;
}

