/**
 * V7 Test Stubs — Safe mocks for JSDOM testing
 * 
 * Stubs:
 * - navigator.clipboard.writeText
 * - Date (frozen for stable tests)
 * - localStorage
 */

import { vi } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// CLIPBOARD STUB
// ═══════════════════════════════════════════════════════════════

export const clipboardStub = {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
};

export function stubClipboard() {
    Object.defineProperty(navigator, 'clipboard', {
        value: clipboardStub,
        writable: true,
        configurable: true,
    });
}

// ═══════════════════════════════════════════════════════════════
// DATE STUB — Freeze time for stable date checks
// ═══════════════════════════════════════════════════════════════

const FROZEN_DATE = new Date('2025-12-19T13:00:00+01:00');

export function stubDate() {
    vi.useFakeTimers();
    vi.setSystemTime(FROZEN_DATE);
}

export function restoreDate() {
    vi.useRealTimers();
}

// ═══════════════════════════════════════════════════════════════
// LOCALSTORAGE STUB
// ═══════════════════════════════════════════════════════════════

export class LocalStorageStub implements Storage {
    private store: Record<string, string> = {};

    get length(): number {
        return Object.keys(this.store).length;
    }

    key(index: number): string | null {
        return Object.keys(this.store)[index] || null;
    }

    getItem(key: string): string | null {
        return this.store[key] ?? null;
    }

    setItem(key: string, value: string): void {
        this.store[key] = value;
    }

    removeItem(key: string): void {
        delete this.store[key];
    }

    clear(): void {
        this.store = {};
    }
}

export const localStorageStub = new LocalStorageStub();

export function stubLocalStorage() {
    Object.defineProperty(window, 'localStorage', {
        value: localStorageStub,
        writable: true,
        configurable: true,
    });
}

// ═══════════════════════════════════════════════════════════════
// COMBINED SETUP
// ═══════════════════════════════════════════════════════════════

export function setupAllStubs() {
    stubClipboard();
    stubLocalStorage();
    // Enable pipeline trace for tests
    localStorageStub.setItem('PIPELINE_TRACE', 'true');
    process.env.VITE_PIPELINE_TRACE = 'true';
    process.env.DOCUDENT_TEST_MODE = 'stub_extraction';
}

export function resetAllStubs() {
    clipboardStub.writeText.mockClear();
    clipboardStub.readText.mockClear();
    localStorageStub.clear();
}
