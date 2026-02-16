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

function normalizeTraceEntries(traceLines: unknown): Array<{ key: string; value: string }> {
    if (!Array.isArray(traceLines)) return [];
    const normalized: Array<{ key: string; value: string }> = [];

    for (const raw of traceLines) {
        if (typeof raw === 'string') {
            const separatorIndex = raw.indexOf(':');
            if (separatorIndex <= 0) continue;
            const key = raw.slice(0, separatorIndex).trim();
            const value = raw.slice(separatorIndex + 1).trim();
            if (!key || !value) continue;
            normalized.push({ key, value });
            continue;
        }

        const entry = raw as TraceEntry;
        if (typeof entry?.key !== 'string' || typeof entry?.value !== 'string') continue;
        const key = entry.key.trim();
        const value = entry.value.trim();
        if (!key || !value) continue;
        normalized.push({ key, value });
    }

    return normalized;
}

export function applyExtractionTraceMeta(
    current: V10LlmRuntimeMeta,
    traceLines: unknown
): V10LlmRuntimeMeta {
    const entries = normalizeTraceEntries(traceLines);
    const extractDetail = entries.find(entry => entry.key === 'extract_detail');
    if (!extractDetail) {
        return current;
    }
    const parsed = parseExtractDetailValue(extractDetail.value);
    return {
        ...current,
        extractionMethod: parsed.extractionMethod,
        extractionLlmError: parsed.extractionLlmError,
    };
}

export function applyExtractionEngineMeta(
    current: V10LlmRuntimeMeta,
    extractorEngine: 'stub' | 'llm' | 'forced' | undefined
): V10LlmRuntimeMeta {
    if (!extractorEngine || current.extractionMethod !== 'unknown') {
        return current;
    }

    if (extractorEngine === 'llm') {
        return {
            ...current,
            extractionMethod: 'llm',
            extractionLlmError: current.extractionLlmError === 'unknown' ? 'none' : current.extractionLlmError,
        };
    }

    if (extractorEngine === 'stub' || extractorEngine === 'forced') {
        return {
            ...current,
            extractionMethod: 'stub',
            extractionLlmError: current.extractionLlmError === 'unknown' ? 'none' : current.extractionLlmError,
        };
    }

    return current;
}

export function shouldShowLlmFallbackBanner(meta: V10LlmRuntimeMeta): boolean {
    if (meta.preanalysisFallback) return true;
    if (meta.preanalysisError && meta.preanalysisError.trim().length > 0) return true;
    if (meta.extractionLlmError !== 'none' && meta.extractionLlmError !== 'unknown') return true;
    return false;
}
