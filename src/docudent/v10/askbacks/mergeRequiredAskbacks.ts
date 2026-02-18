import { normalizeAskbackId } from '../procedure/normalizeAskbackId';

export function mergeRequiredAskbacks(
    ...sources: Array<string[] | undefined>
): string[] {
    const merged: string[] = [];
    const seen = new Set<string>();

    const pushUnique = (id: string) => {
        const normalized = normalizeAskbackId(id);
        if (seen.has(normalized)) return;
        seen.add(normalized);
        merged.push(id);
    };

    for (const source of sources) {
        if (!source) continue;
        for (const id of source) {
            if (!id) continue;
            pushUnique(id);
        }
    }

    return merged;
}
