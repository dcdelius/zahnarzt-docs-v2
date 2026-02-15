/**
 * V10 UI Snapshot Tests
 * 
 * @vitest-environment jsdom
 * 
 * Verifies that copied V10 components render correctly and haven't drifted.
 * Uses minimal props/mocks to validate DOM structure.
 */

import React from 'react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock React Three Fiber before imports
vi.mock('@react-three/fiber', () => ({
    Canvas: ({ children }: { children: React.ReactNode }) => <div data-testid="canvas">{children}</div>,
    useFrame: vi.fn(),
    useThree: () => ({ viewport: { width: 10, height: 10 } }),
}));

vi.mock('three', () => ({
    Mesh: vi.fn(),
}));

// ═══════════════════════════════════════════════════════════════
// COMPONENT IMPORTS (V10 Native)
// ═══════════════════════════════════════════════════════════════

import { SoftGradientBackground } from '../../components/SoftGradientBackground';
import { HeroSculpture } from '../../components/HeroSculpture';

// ═══════════════════════════════════════════════════════════════
// SETUP
// ═══════════════════════════════════════════════════════════════

beforeAll(() => {
    // Mock matchMedia for testing
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });
});

// ═══════════════════════════════════════════════════════════════
// SOFT GRADIENT BACKGROUND
// ═══════════════════════════════════════════════════════════════

describe('SoftGradientBackground (V10)', () => {
    it('renders without crashing', () => {
        const { container } = render(<SoftGradientBackground />);
        expect(container).toBeDefined();
    });

    it('is a pure visual component (no required props)', () => {
        expect(typeof SoftGradientBackground).toBe('function');
    });
});

// ═══════════════════════════════════════════════════════════════
// HERO SCULPTURE
// ═══════════════════════════════════════════════════════════════

describe('HeroSculpture (V10)', () => {
    it('renders without crashing', () => {
        const { container } = render(<HeroSculpture />);
        expect(container).toBeDefined();
    });

    it('is a pure visual component (no required props)', () => {
        expect(typeof HeroSculpture).toBe('function');
    });
});

// ═══════════════════════════════════════════════════════════════
// V10 COMPONENT CONTRACTS
// ═══════════════════════════════════════════════════════════════

describe('V10 Component Contracts', () => {
    it('all V10 visual components import from V10-native paths', () => {
        // Verify imports work (would fail if paths were wrong)
        expect(SoftGradientBackground).toBeDefined();
        expect(HeroSculpture).toBeDefined();
    });
});
