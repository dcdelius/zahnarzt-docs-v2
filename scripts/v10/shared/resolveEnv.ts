import { existsSync, readFileSync } from 'node:fs';

const DEFAULT_ENV_FILES = ['.env.e2e.local', '.env.local', '.env'];
const envFileCache = new Map<string, Record<string, string>>();

function parseEnvFile(content: string): Record<string, string> {
    const out: Record<string, string> = {};
    for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const idx = trimmed.indexOf('=');
        if (idx <= 0) continue;
        const key = trimmed.slice(0, idx).trim();
        if (!key) continue;
        const rawValue = trimmed.slice(idx + 1).trim();
        out[key] = rawValue.replace(/^['"]|['"]$/g, '');
    }
    return out;
}

function readEnvFile(filePath: string): Record<string, string> {
    if (envFileCache.has(filePath)) {
        return envFileCache.get(filePath)!;
    }
    if (!existsSync(filePath)) {
        envFileCache.set(filePath, {});
        return {};
    }
    try {
        const text = readFileSync(filePath, 'utf8');
        const parsed = parseEnvFile(text);
        envFileCache.set(filePath, parsed);
        return parsed;
    } catch {
        envFileCache.set(filePath, {});
        return {};
    }
}

export function resolveEnvValue(name: string, files: string[] = DEFAULT_ENV_FILES): string | null {
    const fromProcess = process.env[name]?.trim();
    if (fromProcess) return fromProcess;

    for (const filePath of files) {
        const value = readEnvFile(filePath)[name];
        if (typeof value === 'string' && value.trim().length > 0) {
            return value.trim();
        }
    }
    return null;
}

export function resolveFirstDefined(names: string[], files: string[] = DEFAULT_ENV_FILES): string | null {
    for (const name of names) {
        const value = resolveEnvValue(name, files);
        if (value) return value;
    }
    return null;
}

