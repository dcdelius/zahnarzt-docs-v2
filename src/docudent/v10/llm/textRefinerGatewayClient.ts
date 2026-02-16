import { getFunctions, httpsCallable } from 'firebase/functions';
import type { TextRefineInput } from './textRefiner';

type RefineDocumentationGatewayInput = TextRefineInput;

type RefineDocumentationGatewayOutput = {
    text: string;
};

let functionsInstance: ReturnType<typeof getFunctions> | null = null;

function getFunctionsInstance() {
    if (!functionsInstance) {
        functionsInstance = getFunctions();
    }
    return functionsInstance;
}

export async function callTextRefinerGateway(input: TextRefineInput): Promise<string | null> {
    const callable = httpsCallable<
        RefineDocumentationGatewayInput,
        RefineDocumentationGatewayOutput
    >(getFunctionsInstance(), 'refineDocumentationTextV1');
    const result = await callable(input);
    const text = result?.data?.text;
    if (typeof text !== 'string') return null;
    const normalized = text.trim();
    return normalized.length > 0 ? normalized : null;
}
