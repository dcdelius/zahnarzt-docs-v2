import { getFunctions, httpsCallable } from 'firebase/functions';
import { ensureCallableAuthReady } from '../firebase/ensureCallableAuthReady';

type ExtractFromDictationGatewayInput = {
    dictation: string;
};

type ExtractFromDictationGatewayOutput = {
    content: string;
};

let functionsInstance: ReturnType<typeof getFunctions> | null = null;

function getFunctionsInstance() {
    if (!functionsInstance) {
        functionsInstance = getFunctions();
    }
    return functionsInstance;
}

export async function callExtractionGateway(dictation: string): Promise<string | null> {
    await ensureCallableAuthReady();
    const callable = httpsCallable<
        ExtractFromDictationGatewayInput,
        ExtractFromDictationGatewayOutput
    >(getFunctionsInstance(), 'extractFromDictationV1');
    const result = await callable({ dictation });
    const content = result?.data?.content;
    if (typeof content !== 'string') return null;
    const normalized = content.trim();
    return normalized.length > 0 ? normalized : null;
}
