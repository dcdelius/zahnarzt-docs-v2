// ═══════════════════════════════════════════════════════════════
// V7 DESIGN TOKENS (SSOT)
// Maps to CSS variables in v7.design.css
// ═══════════════════════════════════════════════════════════════

export const tokens = {
    colors: {
        // --- NEW PREMIUM PALETTE (Light/Cream/Sunrise) ---
        cream: 'var(--bg-cream)',
        paper: 'var(--paper)',
        ink: 'var(--ink)',
        inkSoft: 'var(--ink-soft)',
        inkFaint: 'var(--ink-faint)',
        coral: 'var(--coral)',
        orange: 'var(--orange)',
        yellow: 'var(--yellow)',
        leaf: 'var(--leaf)',
        rose: 'var(--rose)',
        peach: 'var(--peach)',
        hairline: 'var(--hairline)',
        hairlineStrong: 'var(--hairline-strong)',
        glass: 'var(--glass)',
        glassBorder: 'var(--glass-border)',

        // --- LEGACY (Dark Mode Hero Compatibility) ---
        // These map to the *preserved* legacy vars in v7.design.css
        bgBase: 'var(--bg-base)',
        // Legacy ink concepts mapped to new vars or legacy vars where specific
        inkLegacy: 'var(--bg-ink)',
        inkDimLegacy: 'var(--bg-ink-dim)',
    },
    shadows: {
        s: 'var(--shadow-s)',
        m: 'var(--shadow-m)',
        l: 'var(--shadow-l)',
    },
    radii: {
        xl: 'var(--r-xl)',
        xxl: 'var(--r-2xl)',
        pill: 'var(--r-pill)',
    },
    layout: {
        container: 'var(--container)',
        narrow: 'var(--container-narrow)',
    },
    motion: {
        ease: 'var(--ease)',
        easeOut: 'var(--ease-out)',
        dur1: 'var(--dur-1)',
        dur2: 'var(--dur-2)',
        dur3: 'var(--dur-3)',
    }
} as const;

export type V7Tokens = typeof tokens;

// ═══════════════════════════════════════════════════════════════
// COMPATIBILITY EXPORTS (Legacy Direct Access)
// Validated for use in legacy dashboards.
// ═══════════════════════════════════════════════════════════════

// Using 'any' to allow broad compatibility with legacy shape expectations
export const colors: any = {
    ...tokens.colors,
    // Aliasing legacy names to new or legacy tokens
    hairlineSubtle: 'rgba(255,255,255,0.06)', // Hardcoded dark mode hairline
    textSecondary: 'rgba(255,255,255,0.6)',  // Hardcoded dark mode text
    white: '#ffffff',
    textMuted: 'rgba(255,255,255,0.4)',
    textPrimary: 'rgba(255,255,255,0.92)', // Legacy link
    // Mapped
    bgBase: tokens.colors.bgBase,
    background: tokens.colors.bgBase,
    accent: tokens.colors.orange,
    accentLight: 'rgba(249, 115, 22, 0.2)',
    success: tokens.colors.leaf,
    warning: tokens.colors.yellow,

    // Legacy Gradients (formerly in colors object sometimes)
    peachRose: 'linear-gradient(to right, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)',
    cyanLilac: 'linear-gradient(to right, #a18cd1 0%, #fbc2eb 100%)',
    pillActive: 'rgba(255, 255, 255, 0.10)',
    glow: 'rgba(255, 255, 255, 0.1)',
    textOnAccent: '#000000',
};

export const radii: any = {
    ...tokens.radii,
    sm: '8px',
    md: '16px',
    card: '24px',
};

export const shadows: any = {
    ...tokens.shadows,
    // Legacy shadows
    pillActive: '0 4px 12px rgba(0,0,0,0.2)',
    glow: '0 0 20px rgba(255,255,255,0.1)',
};

export const glass: any = {
    // Legacy glass object structure
    header: 'rgba(255,255,255,0.06)',
    panel: 'rgba(255,255,255,0.04)',
    border: 'rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
};

export const space: any = {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
    heroPadding: 'max(5vw, 24px)',
    // Numeric keys mapping for legacy
    1: '4px',
    2: '8px',
    4: '16px',
    8: '32px',
    10: '40px',
};

export const gradients: any = {
    heroDeep: 'radial-gradient(120% 120% at 50% 20%, #1a1616 0%, #0f0f12 100%)', // DARK HERO
    questionsWarm: 'radial-gradient(120% 120% at 50% 20%, #2a1f1f 0%, #0f0f12 100%)', // Legacy
    outputLight: 'radial-gradient(120% 120% at 50% 20%, #1c1c20 0%, #0f0f12 100%)',
    vignette: 'radial-gradient(circle at 50% 50%, transparent 30%, rgba(15,15,18,0.4) 100%)',
    glass: 'linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04))',
    primary: 'linear-gradient(135deg, var(--coral), var(--orange))',
    // New
    sunrise: 'linear-gradient(120deg, rgba(255,210,179,.55), rgba(255,255,255,.2))',
    // Legacy
    peachRose: 'linear-gradient(to right, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)',
    cyanLilac: 'linear-gradient(to right, #a18cd1 0%, #fbc2eb 100%)',
    background: 'radial-gradient(120% 120% at 50% 20%, #1a1616 0%, #0f0f12 100%)',
};

export const typography: any = {
    fontFamily: 'var(--font-ui)', // Default to UI font
    fontDisplay: 'var(--font-display)',

    // Legacy Objects
    small: {
        fontSize: '13px',
        lineHeight: '1.35',
        fontWeight: 500,
        letterSpacing: '0.02em',
    },
    medium: {
        fontSize: '15px',
        lineHeight: '1.5',
        fontWeight: 500,
    },
    bold: { fontWeight: 700 },
    semibold: { fontWeight: 600 },
    hero: {
        fontSize: 'clamp(44px, 6.5vw, 72px)',
        fontWeight: 700, // Legacy weight
    },
    wideTracking: {
        letterSpacing: '0.04em',
    },
    label: {
        fontSize: '12px',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
    },
    tightTracking: {
        letterSpacing: '-0.02em',
    },
    tight: {
        lineHeight: 1.1,
    },
    body: {
        fontSize: '16.5px',
        lineHeight: '1.55',
    },
    relaxed: {
        lineHeight: 1.6,
    },
};

export const motion: any = {
    easing: [0.16, 1, 0.3, 1], // Matches cubic-bezier(.16,1,.3,1) roughly
    durationMedium: 0.38, // 380ms
    normal: 0.38,
    fast: 0.18,
    ease: [0.16, 1, 0.3, 1],
    // Framer Motion variants for simple reuse
    pageEnter: { opacity: 1, y: 0 },
    pageAnimate: { opacity: 1, y: 0 },
    pageExit: { opacity: 0, y: -10 },
};
