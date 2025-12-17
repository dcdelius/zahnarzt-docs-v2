/**
 * V7 Design Tokens — JETON_UI_DIREKTIV_V1
 *
 * ═══════════════════════════════════════════════════════════════
 * SSOT for all visual constants. NO magic numbers elsewhere.
 * Premium, friendly, bold — like design software, not clinic SW.
 * ═══════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════
// COLORS (per directive)
// ═══════════════════════════════════════════════════════════════

export const colors = {
    // Base
    white: '#ffffff',
    black: '#0B1220',
    surface: '#ffffff',

    // Text (exact per directive)
    textPrimary: '#0B1220',
    textSecondary: 'rgba(11, 18, 32, 0.65)',
    textMuted: 'rgba(11, 18, 32, 0.45)',
    textOnAccent: '#ffffff',

    // Hairlines & separators
    hairline: 'rgba(11, 18, 32, 0.10)',
    hairlineSubtle: 'rgba(11, 18, 32, 0.05)',

    // Glass
    glass: 'rgba(255, 255, 255, 0.55)',
    glassSolid: 'rgba(255, 255, 255, 0.85)',

    // Accent (used sparingly)
    accent: '#6366f1',
    accentLight: 'rgba(99, 102, 241, 0.12)',
    accentGlow: 'rgba(99, 102, 241, 0.25)',

    // Status
    success: '#10b981',
    successLight: 'rgba(16, 185, 129, 0.12)',
    warning: '#f59e0b',
    warningLight: 'rgba(245, 158, 11, 0.12)',
    error: '#ef4444',
    errorLight: 'rgba(239, 68, 68, 0.12)',
};

// ═══════════════════════════════════════════════════════════════
// GRADIENTS (soft, light, no neon-dark)
// ═══════════════════════════════════════════════════════════════

export const gradients = {
    // Background: very subtle warm tint
    background: 'linear-gradient(145deg, #fefefe 0%, #f8fafc 50%, #f5f7fa 100%)',

    // Accent gradients (cyan→lilac, mint→sky, peach→rose)
    cyanLilac: 'linear-gradient(135deg, #a5f3fc 0%, #c4b5fd 100%)',
    mintSky: 'linear-gradient(135deg, #a7f3d0 0%, #7dd3fc 100%)',
    peachRose: 'linear-gradient(135deg, #fed7aa 0%, #fda4af 100%)',

    // Primary CTA
    primary: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    primaryHover: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',

    // Nav active pill
    activePill: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',

    // Hover states
    hoverTint: 'rgba(99, 102, 241, 0.06)',
};

// ═══════════════════════════════════════════════════════════════
// TYPOGRAPHY (exact per directive)
// ═══════════════════════════════════════════════════════════════

export const typography = {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",

    // Size scale (per directive)
    hero: '56px',       // 48-64px → using 56
    h1: '36px',         // 32-40px → using 36
    h2: '24px',         // 22-28px → using 24
    body: '17px',       // 16-18px → using 17
    label: '12px',      // 12-13px → using 12
    small: '14px',

    // Weights
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,

    // Line heights
    tight: 1.1,
    snug: 1.25,
    normal: 1.5,
    relaxed: 1.7,

    // Letter spacing
    tightTracking: '-0.02em',
    normalTracking: '0',
    wideTracking: '0.05em',
};

// ═══════════════════════════════════════════════════════════════
// SPACING (8px grid, generous)
// ═══════════════════════════════════════════════════════════════

export const space = {
    '0': '0px',
    '1': '4px',
    '2': '8px',
    '3': '12px',
    '4': '16px',
    '5': '20px',
    '6': '24px',
    '8': '32px',
    '10': '40px',
    '12': '48px',
    '16': '64px',
    '20': '80px',
    '24': '96px',
};

// ═══════════════════════════════════════════════════════════════
// RADII (soft forms per directive)
// ═══════════════════════════════════════════════════════════════

export const radii = {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    pill: '999px',
};

// ═══════════════════════════════════════════════════════════════
// SHADOWS (very subtle, no shadow-blocks)
// ═══════════════════════════════════════════════════════════════

export const shadows = {
    soft: '0 1px 3px rgba(11, 18, 32, 0.04)',
    medium: '0 4px 12px rgba(11, 18, 32, 0.06)',
    glow: '0 0 20px rgba(99, 102, 241, 0.2)',
    pillActive: '0 2px 16px rgba(99, 102, 241, 0.35)',
};

// ═══════════════════════════════════════════════════════════════
// MOTION (per directive: buttery, not gamey)
// ═══════════════════════════════════════════════════════════════

export const motion = {
    // Durations
    fast: 0.2,        // 0.18-0.24s
    normal: 0.32,     // 0.28-0.40s
    slow: 0.5,

    // Easing (per directive)
    ease: [0.2, 0.8, 0.2, 1],
    easeOut: [0, 0, 0.2, 1],
    easeIn: [0.4, 0, 1, 1],

    // Spring config for pills
    spring: { type: 'spring', stiffness: 400, damping: 30 },

    // Route transitions
    pageEnter: { opacity: 0, y: 12 },
    pageAnimate: { opacity: 1, y: 0 },
    pageExit: { opacity: 0, y: -8 },
};

// ═══════════════════════════════════════════════════════════════
// GLASS EFFECTS
// ═══════════════════════════════════════════════════════════════

export const glass = {
    blur: 'blur(20px)',
    sidebar: {
        background: colors.glassSolid,
        backdropFilter: 'blur(20px)',
        borderRight: `1px solid ${colors.hairlineSubtle}`,
    },
    header: {
        background: colors.glass,
        backdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${colors.hairlineSubtle}`,
    },
    panel: {
        background: 'rgba(255, 255, 255, 0.6)',
        backdropFilter: 'blur(12px)',
        border: `1px solid ${colors.hairlineSubtle}`,
    },
};
