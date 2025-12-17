/// <reference types="vite/client" />
/**
 * DEV-only Error Capture for Module Import Failures
 * 
 * This module provides instrumentation to capture "Importing a module script failed"
 * errors with actionable evidence (URL, stack, env flags).
 * 
 * ONLY active when import.meta.env.DEV is true.
 */

// ═══════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

interface ModuleErrorContext {
    timestamp: string;
    route: string;
    envFlags: {
        DEV: boolean;
        VITE_STUB_EXTRACTION: string | undefined;
        VITE_E2E_TEST_MODE: string | undefined;
    };
    extractorPath: 'stub' | 'real' | 'unknown';
}

interface CapturedError {
    type: 'global-error' | 'unhandled-rejection' | 'fetch-failure' | 'extraction-error';
    message: string;
    filename?: string;
    stack?: string;
    url?: string;
    status?: number;
    context: ModuleErrorContext;
}

// ═══════════════════════════════════════════════════════════════
// CAPTURED ERRORS STORE (for testing)
// ═══════════════════════════════════════════════════════════════

const capturedErrors: CapturedError[] = [];

export function getCapturedErrors(): CapturedError[] {
    return [...capturedErrors];
}

export function clearCapturedErrors(): void {
    capturedErrors.length = 0;
}

// ═══════════════════════════════════════════════════════════════
// CONTEXT BUILDER
// ═══════════════════════════════════════════════════════════════

function buildContext(): ModuleErrorContext {
    const isStubMode =
        import.meta.env.VITE_STUB_EXTRACTION === 'true' ||
        (typeof process !== 'undefined' && (process as any).env?.DOCUDENT_TEST_MODE === 'stub_extraction');

    return {
        timestamp: new Date().toISOString(),
        route: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
        envFlags: {
            DEV: import.meta.env.DEV,
            VITE_STUB_EXTRACTION: import.meta.env.VITE_STUB_EXTRACTION,
            VITE_E2E_TEST_MODE: import.meta.env.VITE_E2E_TEST_MODE,
        },
        extractorPath: isStubMode ? 'stub' : 'real',
    };
}

// ═══════════════════════════════════════════════════════════════
// MODULE IMPORT ERROR DETECTION
// ═══════════════════════════════════════════════════════════════

const MODULE_ERROR_PATTERNS = [
    'Importing a module script failed',
    'Failed to fetch dynamically imported module',
    'error loading dynamically imported module',
    'ChunkLoadError',
];

function isModuleImportError(message: string): boolean {
    return MODULE_ERROR_PATTERNS.some(pattern =>
        message.toLowerCase().includes(pattern.toLowerCase())
    );
}

// ═══════════════════════════════════════════════════════════════
// GLOBAL ERROR LISTENERS (DEV-only)
// ═══════════════════════════════════════════════════════════════

function setupGlobalErrorListener(): void {
    window.addEventListener('error', (event: ErrorEvent) => {
        const message = event.message || String(event.error);

        if (isModuleImportError(message)) {
            const captured: CapturedError = {
                type: 'global-error',
                message,
                filename: event.filename,
                stack: event.error?.stack,
                context: buildContext(),
            };

            capturedErrors.push(captured);

            console.error('[DEV-ERROR-CAPTURE] 🔴 Module Import Error Detected:', {
                ...captured,
                _hint: 'Check if dynamic import path is correct and file exists',
            });
        }
    });
}

function setupUnhandledRejectionListener(): void {
    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
        const message = event.reason?.message || String(event.reason);

        if (isModuleImportError(message)) {
            const captured: CapturedError = {
                type: 'unhandled-rejection',
                message,
                stack: event.reason?.stack,
                context: buildContext(),
            };

            capturedErrors.push(captured);

            console.error('[DEV-ERROR-CAPTURE] 🔴 Unhandled Rejection - Module Import Failed:', {
                ...captured,
                _hint: 'Promise rejected during dynamic import',
            });
        }
    });
}

// ═══════════════════════════════════════════════════════════════
// FETCH PATCHING FOR JS CHUNKS (DEV-only)
// ═══════════════════════════════════════════════════════════════

let originalFetch: typeof fetch | null = null;

function setupFetchPatching(): void {
    if (originalFetch) return; // Already patched

    originalFetch = window.fetch;

    window.fetch = async function patchedFetch(
        input: RequestInfo | URL,
        init?: RequestInit
    ): Promise<Response> {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;

        // Only monitor JS chunks
        const isJsChunk = url.includes('.js') || url.includes('/assets/') || url.includes('chunk');

        const response = await originalFetch!.call(window, input, init);

        if (isJsChunk && !response.ok) {
            const captured: CapturedError = {
                type: 'fetch-failure',
                message: `JS chunk fetch failed: ${response.status} ${response.statusText}`,
                url,
                status: response.status,
                context: buildContext(),
            };

            capturedErrors.push(captured);

            console.error('[DEV-ERROR-CAPTURE] 🔴 JS Chunk Fetch Failed:', {
                ...captured,
                _hint: 'Check if chunk file exists and server is running',
            });
        }

        return response;
    };
}

// ═══════════════════════════════════════════════════════════════
// EXTRACTION ERROR LOGGER
// ═══════════════════════════════════════════════════════════════

export function logExtractionError(error: unknown): void {
    if (!import.meta.env.DEV) return;

    const errorObj = error instanceof Error ? error : new Error(String(error));
    const message = errorObj.message;

    const captured: CapturedError = {
        type: 'extraction-error',
        message,
        stack: errorObj.stack,
        context: buildContext(),
    };

    capturedErrors.push(captured);

    console.error('[DEV-ERROR-CAPTURE] 🔴 Extraction Error:', {
        name: errorObj.name,
        message: errorObj.message,
        stack: errorObj.stack,
        isModuleError: isModuleImportError(message),
        context: captured.context,
        _fullError: errorObj,
    });
}

// ═══════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════

let initialized = false;

export function initDevErrorCapture(): void {
    // Only in DEV and browser environment
    if (!import.meta.env.DEV || typeof window === 'undefined' || initialized) {
        return;
    }

    initialized = true;

    console.log('[DEV-ERROR-CAPTURE] Initializing module import error capture...');

    setupGlobalErrorListener();
    setupUnhandledRejectionListener();
    setupFetchPatching();

    console.log('[DEV-ERROR-CAPTURE] ✅ Initialized. Monitoring for:', MODULE_ERROR_PATTERNS);
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export default {
    initDevErrorCapture,
    logExtractionError,
    getCapturedErrors,
    clearCapturedErrors,
    isModuleImportError,
};
