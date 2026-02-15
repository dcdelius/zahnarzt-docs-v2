/**
 * Strict JSON parser for LLM responses
 * No regex fumbling - expects clean JSON or fails fast
 */

export class JSONParseError extends Error {
    constructor(message: string, public rawResponse: string) {
        super(message);
        this.name = 'JSONParseError';
    }
}

/**
 * Attempts to parse JSON strictly
 * Primary path: expects response to be valid JSON
 * Fallback: tries to extract from markdown code block (```json ... ```)
 */
export function safeJsonParseStrict(response: string): any {
    if (!response || typeof response !== 'string') {
        throw new JSONParseError('Response is empty or not a string', response);
    }

    const trimmed = response.trim();

    // Primary: Expect clean JSON starting with { or [
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
            return JSON.parse(trimmed);
        } catch (e) {
            throw new JSONParseError(
                `Invalid JSON: ${e instanceof Error ? e.message : String(e)}`,
                response
            );
        }
    }

    // Fallback: Try to extract from markdown code block
    // Match: ```json ... ``` or ``` ... ```
    const jsonBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);

    if (jsonBlockMatch) {
        const extracted = jsonBlockMatch[1].trim();
        try {
            return JSON.parse(extracted);
        } catch (e) {
            throw new JSONParseError(
                `Found code block but invalid JSON: ${e instanceof Error ? e.message : String(e)}`,
                response
            );
        }
    }

    // No valid JSON found
    throw new JSONParseError(
        'Response does not contain valid JSON (expected object starting with { or [ or markdown code block)',
        response
    );
}
