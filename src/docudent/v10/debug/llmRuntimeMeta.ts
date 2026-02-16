export type V10LlmRuntimeMeta = {
    preanalysisSource: 'llm' | 'fallback' | 'unknown';
    preanalysisDiagnostics: string[];
    preanalysisFallback: boolean;
    preanalysisError?: string;
    extractionMethod: 'llm' | 'regex' | 'stub' | 'unknown';
    extractionLlmError: string;
};

type TraceEntry = {
    key?: unknown;
    value?: unknown;
};

export function createInitialLlmRuntimeMeta(): V10LlmRuntimeMeta {
    return {
        preanalysisSource: 'unknown',
        preanalysisDiagnostics: [],
        preanalysisFallback: false,
        extractionMethod: 'unknown',
        extractionLlmError: 'unknown',
    };
}

export function applyPreanalysisMeta(
    current: V10LlmRuntimeMeta,
    next: {
        source: 'llm' | 'fallback';
        diagnostics: string[];
        fallback: boolean;
        error?: string;
    }
): V10LlmRuntimeMeta {
    return {
        ...current,
        preanalysisSource: next.source,
        preanalysisDiagnostics: next.diagnostics.slice(),
        preanalysisFallback: next.fallback,
        preanalysisError: next.error,
    };
}

function parseExtractDetailValue(value: string): {
    extractionMethod: V10LlmRuntimeMeta['extractionMethod'];
    extractionLlmError: string;
} {
    const fields = value
        .split(';')
        .map(item => item.trim())
        .filter(Boolean)
        .reduce<Record<string, string>>((acc, item) => {
            const [k, v] = item.split('=');
            if (k && v) acc[k.trim()] = v.trim();
            return acc;
        }, {});

    const methodRaw = fields.method?.toLowerCase();
    const extractionMethod: V10LlmRuntimeMeta['extractionMethod'] =
        methodRaw === 'llm' || methodRaw === 'regex' || methodRaw === 'stub'
            ? methodRaw
            : 'unknown';

    return {
        extractionMethod,
        extractionLlmError: fields.llmError || 'unknown',
    };
}

export function applyExtractionTraceMeta(
    current: V10LlmRuntimeMeta,
    traceLines: unknown
): V10LlmRuntimeMeta {
    const entries = Array.isArray(traceLines) ? traceLines as TraceEntry[] : [];
    const extractDetail = entries.find(entry => entry?.key === 'extract_detail');
    if (!extractDetail || typeof extractDetail.value !== 'string') {
        return current;
    }
    const parsed = parseExtractDetailValue(extractDetail.value);
    return {
        ...current,
        extractionMethod: parsed.extractionMethod,
        extractionLlmError: parsed.extractionLlmError,
    };
}

export function shouldShowLlmFallbackBanner(meta: V10LlmRuntimeMeta): boolean {
    if (meta.preanalysisFallback) return true;
    if (meta.preanalysisError && meta.preanalysisError.trim().length > 0) return true;
    if (meta.extractionLlmError !== 'none' && meta.extractionLlmError !== 'unknown') return true;
    return false;
}
