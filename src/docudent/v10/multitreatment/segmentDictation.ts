/**
 * Dictation Segmentation — Shared SSOT for multi-treatment splitting
 */

const SEGMENT_MARKERS = [
    'danach',
    'zusätzlich',
    'auch',
    'weiterer zahn',
    'ebenfalls',
    'noch',
    'außerdem',
    'sowie',
    'und dann',
];

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

    // Only split on semicolons (clear segment separator).
    for (let i = 0; i < text.length; i++) {
        if (text[i] === ';') {
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
