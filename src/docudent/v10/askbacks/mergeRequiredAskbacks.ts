import { normalizeAskbackId } from '../procedure/normalizeAskbackId';

export function mergeRequiredAskbacks(
    engineAskbacks: string[] = [],
    procedureAskbacks: string[] = []
): string[] {
    const merged: string[] = [];
    const seen = new Set<string>();

    const pushUnique = (id: string) => {
        const normalized = normalizeAskbackId(id);
        if (seen.has(normalized)) return;
        seen.add(normalized);
        merged.push(id);
    };

    for (const id of engineAskbacks) {
        if (!id) continue;
        pushUnique(id);
    }

    for (const id of procedureAskbacks) {
        if (!id) continue;
        pushUnique(id);
    }

    return merged;
}
