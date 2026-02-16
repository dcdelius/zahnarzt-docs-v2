export function getMaxCanalCountForTooth(tooth: string | undefined): number | undefined {
    if (!tooth) return undefined;
    const normalized = String(tooth).trim();
    if (!/^[1-4][1-8]$/.test(normalized)) return undefined;
    const quadrant = Number(normalized[0]);
    const toothType = Number(normalized[1]);

    // FDI tooth types:
    // 1/2 incisors, 3 canine, 4/5 premolars, 6/7/8 molars (8 = wisdom tooth)
    if (toothType === 1 || toothType === 2) {
        // Lower incisors can be 2-canaled; upper incisors should not exceed 1.
        return quadrant >= 3 ? 2 : 1;
    }
    if (toothType === 3) {
        return 1;
    }
    if (toothType === 4 || toothType === 5) {
        return 2;
    }
    if (toothType >= 6) {
        return 4;
    }
    return undefined;
}

export function clampCanalCountToTooth(
    tooth: string | undefined,
    canalCount: number | undefined
): number | undefined {
    if (typeof canalCount !== 'number' || !Number.isFinite(canalCount)) return undefined;
    const rounded = Math.round(canalCount);
    if (rounded <= 0) return undefined;
    const max = getMaxCanalCountForTooth(tooth);
    if (max === undefined) return rounded;
    return Math.min(rounded, max);
}
