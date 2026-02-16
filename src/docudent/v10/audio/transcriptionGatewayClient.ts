import { getFunctions, httpsCallable } from 'firebase/functions';

type TranscribeAudioGatewayInput = {
    audioBase64: string;
    mimeType: string;
    fileName: string;
};

type TranscribeAudioGatewayOutput = {
    text: string;
};

let functionsInstance: ReturnType<typeof getFunctions> | null = null;

function getFunctionsInstance() {
    if (!functionsInstance) {
        functionsInstance = getFunctions();
    }
    return functionsInstance;
}

function toBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 1) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function inferFileNameFromMimeType(mimeType: string): string {
    const normalized = String(mimeType || '').toLowerCase();
    if (normalized.includes('webm')) return 'audio.webm';
    if (normalized.includes('wav')) return 'audio.wav';
    if (normalized.includes('mp4') || normalized.includes('m4a')) return 'audio.m4a';
    return 'audio.webm';
}

export async function callTranscriptionGateway(audioBlob: Blob): Promise<string | null> {
    if (!audioBlob || audioBlob.size <= 0) return null;
    const audioBase64 = toBase64(await audioBlob.arrayBuffer());
    const mimeType = audioBlob.type || 'audio/webm';
    const fileName = inferFileNameFromMimeType(mimeType);

    const callable = httpsCallable<
        TranscribeAudioGatewayInput,
        TranscribeAudioGatewayOutput
    >(getFunctionsInstance(), 'transcribeAudioV1');

    const result = await callable({
        audioBase64,
        mimeType,
        fileName,
    });

    const text = result?.data?.text;
    if (typeof text !== 'string') return null;
    const normalized = text.trim();
    return normalized.length > 0 ? normalized : null;
}
