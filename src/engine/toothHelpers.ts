export type ToothClass = 'anterior' | 'posterior' | null;

export const getToothClass = (fdi: string): ToothClass => {
    if (!fdi || typeof fdi !== 'string') return null;
    const clean = fdi.trim();
    if (!/^[1-4][1-8]$/.test(clean)) return null; // Basic FDI check

    const toothNum = parseInt(clean.charAt(1), 10);
    if (toothNum >= 1 && toothNum <= 3) return 'anterior';
    if (toothNum >= 4 && toothNum <= 8) return 'posterior';
    return null;
};

export const detectMultiTooth = (text: string): string[] => {
    if (!text) return [];
    // Regex to find FDI codes (11-48)
    // Avoid matching years like 2023 or random numbers
    // Look for "Zahn XY" or just "XY" in context?
    // Strict approach: Look for "Zahn [1-4][1-8]" or isolated "[1-4][1-8]"
    // This is heuristic but better than nothing for MVP safety.

    const matches = text.matchAll(/\b[1-4][1-8]\b/g);
    const found = new Set<string>();
    for (const match of matches) {
        found.add(match[0]);
    }
    return Array.from(found);
};
