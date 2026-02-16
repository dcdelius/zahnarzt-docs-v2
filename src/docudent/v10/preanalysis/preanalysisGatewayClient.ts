import { getFunctions, httpsCallable } from 'firebase/functions';

type DetectTreatmentIntentsGatewayInput = {
    dictation: string;
};

type DetectTreatmentIntentsGatewayOutput = {
    content: string;
};

let functionsInstance: ReturnType<typeof getFunctions> | null = null;

function getFunctionsInstance() {
    if (!functionsInstance) {
        functionsInstance = getFunctions();
    }
    return functionsInstance;
}

export async function callPreanalysisGateway(dictation: string): Promise<string | null> {
    const callable = httpsCallable<
        DetectTreatmentIntentsGatewayInput,
        DetectTreatmentIntentsGatewayOutput
    >(getFunctionsInstance(), 'detectTreatmentIntentsV1');
    const result = await callable({ dictation });
    const content = result?.data?.content;
    if (typeof content !== 'string') return null;
    const normalized = content.trim();
    return normalized.length > 0 ? normalized : null;
}
