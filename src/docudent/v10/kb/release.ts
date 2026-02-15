const KB_RELEASE_KEY = 'docudent_kb_release_id';
const PRACTICE_ID_KEY = 'docudent_practice_id';

function getScopedKey(): string {
    if (typeof window === 'undefined') return KB_RELEASE_KEY;
    const practiceId = localStorage.getItem(PRACTICE_ID_KEY);
    return practiceId ? `${KB_RELEASE_KEY}:${practiceId}` : KB_RELEASE_KEY;
}

export function getActiveKbReleaseId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(getScopedKey());
}

export function setActiveKbReleaseId(value?: string): void {
    if (typeof window === 'undefined') return;
    const key = getScopedKey();
    if (value && value.trim()) {
        localStorage.setItem(key, value.trim());
    } else {
        localStorage.removeItem(key);
    }
}
