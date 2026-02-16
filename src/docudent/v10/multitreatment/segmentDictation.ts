/**
 * Dictation Segmentation — Shared SSOT for multi-treatment splitting
 */

const SEGMENT_MARKERS = [
    'danach',
    'zusätzlich',
    'zusaetzlich',
    'auch',
    'weiterer zahn',
    'ebenfalls',
    'noch',
    'außerdem',
    'ausserdem',
    'anschließend',
    'anschliessend',
    'im anschluss',
    'im anschluss daran',
    'sowie',
    'und dann',
];

function isSentenceBoundary(text: string, index: number): boolean {
    const char = text[index];
    if (char !== '.' && char !== '!' && char !== '?') return false;
    if (char === '.') {
        const prev = text[index - 1] ?? '';
        const next = text[index + 1] ?? '';
        // Do not split decimal values like "120.50".
        if (/\d/.test(prev) && /\d/.test(next)) {
            return false;
        }
    }
    return true;
}

export function splitDictationIntoSegments(text: string): string[] {
    const lowerText = text.toLowerCase();
    const markerPositions: { pos: number; marker: string }[] = [];

    for (const marker of SEGMENT_MARKERS) {
        let idx = lowerText.indexOf(marker);
        while (idx !== -1) {
            markerPositions.push({ pos: idx, marker });
            idx = lowerText.indexOf(marker, idx + 1);
        }
    }

    // Split on explicit separators and sentence boundaries.
    for (let i = 0; i < text.length; i++) {
        if (text[i] === ';' || isSentenceBoundary(text, i)) {
            markerPositions.push({ pos: i, marker: text[i] });
        }
    }

    markerPositions.sort((a, b) => a.pos - b.pos);

    if (markerPositions.length === 0) {
        return [text.trim()].filter(Boolean);
    }

    const segments: string[] = [];
    let lastPos = 0;

    for (const { pos, marker } of markerPositions) {
        if (pos > lastPos) {
            const segment = text.substring(lastPos, pos).trim();
            if (segment.length > 0) {
                segments.push(segment);
            }
        }
        lastPos = pos + marker.length;
    }

    const remaining = text.substring(lastPos).trim();
    if (remaining.length > 0) {
        segments.push(remaining);
    }

    return segments.filter(s => s.length > 0);
}
