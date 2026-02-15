/**
 * V7 Design Tokens — JETON WARM SYSTEM (V6 Parity + Premium)
 *
 * Shared style constants for all V7 components.
 *
 * ❌ NO logic
 * ✅ ONLY values
 */

// ═══════════════════════════════════════════════════════════════
// COLORS
// ═══════════════════════════════════════════════════════════════

export const colors = {
    // Warm Gradient Colors
    warmPink: '#F87A7A',
    warmPeach: '#F69A7C',
    softApricot: '#F7B88C',
    apricotLight: '#FDD9B5',

    // Accent
    coralAccent: '#FF6B4A',
    coralMid: '#FF8B6A',
    coralLight: '#FFB199',

    // Orb Colors
    orbApricot: '#FFE1D6',
    orbPink: '#FFB199',

    // Text — improved contrast
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255,255,255,0.75)',
    textMuted: 'rgba(255,255,255,0.55)',
    textSubtle: 'rgba(255,255,255,0.40)',
    textPlaceholder: 'rgba(255,255,255,0.45)', // Better than 0.35

    // Lines
    lineSoft: 'rgba(255,255,255,0.15)',
    lineUltraSoft: 'rgba(255,255,255,0.08)',
    lineDivider: 'rgba(255,255,255,0.12)',

    // Segments
    segmentActive: '#FFFFFF',
    segmentActiveText: '#E25B3D',
    segmentInactiveText: '#FFE8DD',

    // Surfaces — glass cards
    surfaceGlass: 'rgba(255, 255, 255, 0.08)',
    surfaceGlassHover: 'rgba(255, 255, 255, 0.12)',
    surfaceGlassActive: 'rgba(255, 255, 255, 0.16)',
    surfaceCard: 'rgba(255, 255, 255, 0.06)',

    // Focus
    focusRing: 'rgba(255, 107, 74, 0.5)',
} as const;

// ═══════════════════════════════════════════════════════════════
// GRADIENTS
// ═══════════════════════════════════════════════════════════════

export const gradients = {
    // Hero (idle state)
    hero: 'linear-gradient(135deg, #F87A7A 0%, #F69A7C 40%, #F7B88C 70%, #FDD9B5 100%)',
    heroDeep: 'linear-gradient(145deg, #E86A6A 0%, #F87A7A 20%, #F69A7C 50%, #F7B88C 80%, #FDD9B5 100%)',

    // Questions state - warmer, shifted
    questionsWarm: 'linear-gradient(135deg, #FA8C80 0%, #F8AA86 30%, #F6C79A 80%)',

    // Output state - lighter, more apricot
    outputLight: 'linear-gradient(135deg, #FBCDB2 0%, #FDDDC8 50%, #FEF0E8 100%)',

    // Button
    button: 'linear-gradient(135deg, #FF6B4A 0%, #FF8B6A 100%)',
    buttonHover: 'linear-gradient(135deg, #FF7A5A 0%, #FF9A7A 100%)',
    buttonGlow: 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.25) 0%, transparent 60%)',

    // Insurance bar
    insuranceBar: 'linear-gradient(135deg, #FF6B4A 0%, #FFB199 100%)',

    // Inner highlights
    innerHighlight: 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, transparent 50%)',
    innerHighlightStrong: 'linear-gradient(180deg, rgba(255,255,255,0.28) 0%, transparent 40%)',

    // Vignette
    vignette: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.06) 100%)',
} as const;

// ═══════════════════════════════════════════════════════════════
// SHADOWS — Multi-layer depth system (V6 parity)
// ═══════════════════════════════════════════════════════════════

export const shadows = {
    // Button states
    buttonDefault: '0 8px 32px rgba(255, 107, 74, 0.35), 0 2px 8px rgba(0, 0, 0, 0.12)',
    buttonHover: '0 12px 40px rgba(255, 107, 74, 0.45), 0 4px 12px rgba(0, 0, 0, 0.15)',
    buttonActive: '0 4px 16px rgba(255, 107, 74, 0.25), 0 1px 4px rgba(0, 0, 0, 0.1)',
    buttonDisabled: '0 4px 16px rgba(0, 0, 0, 0.08)',
    buttonGlow: '0 0 40px rgba(255, 107, 74, 0.5)',

    // Bar shadows — deep
    barDefault: '0 16px 32px rgba(0,0,0,0.28), 0 4px 12px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.18)',
    barHover: '0 20px 44px rgba(0,0,0,0.32), 0 6px 16px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.22)',

    // Card shadows
    cardSoft: '0 4px 24px rgba(0, 0, 0, 0.06), 0 1px 4px rgba(0, 0, 0, 0.03)',
    cardMedium: '0 8px 32px rgba(0, 0, 0, 0.10), 0 2px 8px rgba(0, 0, 0, 0.05)',
    cardHover: '0 12px 40px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.06)',
    cardInput: '0 4px 20px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255,255,255,0.06)',

    // Focus ring
    focusRing: '0 0 0 3px rgba(255, 107, 74, 0.4)',

    // Inset
    insetSoft: 'inset 0 1px 0 rgba(255,255,255,0.1)',
    insetStrong: 'inset 0 2px 0 rgba(255,255,255,0.15)',
} as const;

// ═══════════════════════════════════════════════════════════════
// RADII
// ═══════════════════════════════════════════════════════════════

export const radii = {
    pill: '999px',
    card: '20px',
    cardSmall: '14px',
    button: '999px',
    input: '16px',
} as const;

// ═══════════════════════════════════════════════════════════════
// MOTION — Cubic-bezier only, NO spring (V6 parity)
// ═══════════════════════════════════════════════════════════════

export const motion = {
    // Easing curves
    easing: [0.4, 0.0, 0.2, 1] as const,
    easingOut: [0.0, 0.0, 0.2, 1] as const,
    easingIn: [0.4, 0.0, 1, 1] as const,
    easingCSS: 'cubic-bezier(0.4, 0.0, 0.2, 1)',

    // Durations
    durationMicro: 0.1,   // 100ms — hover feedback
    durationSmall: 0.15,  // 150ms — button states
    durationMedium: 0.2,  // 200ms — transitions
    durationLarge: 0.3,   // 300ms — page transitions
    durationXL: 0.4,      // 400ms — hero entrance

    // Presets
    fadeIn: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.2, ease: [0.4, 0.0, 0.2, 1] },
    },
    slideUp: {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3, ease: [0.4, 0.0, 0.2, 1] },
    },
    slideUpLarge: {
        initial: { opacity: 0, y: 32 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.4, ease: [0.4, 0.0, 0.2, 1] },
    },
    scaleIn: {
        initial: { opacity: 0, scale: 0.95 },
        animate: { opacity: 1, scale: 1 },
        transition: { duration: 0.25, ease: [0.4, 0.0, 0.2, 1] },
    },

    // CTA activation pulse
    ctaActivate: {
        scale: [1, 1.02, 1],
        transition: { duration: 0.3, ease: [0.4, 0.0, 0.2, 1] },
    },
} as const;

// ═══════════════════════════════════════════════════════════════
// TYPOGRAPHY — Improved scale
// ═══════════════════════════════════════════════════════════════

export const typography = {
    fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",

    // Sizes (8px grid)
    headline: 'clamp(48px, 7vw, 80px)',
    headlineSmall: 'clamp(32px, 5vw, 56px)',
    title: '28px',
    subtitle: '18px',
    body: '16px',
    bodySmall: '15px',
    label: '13px',
    caption: '11px',

    // Weights
    light: 300,
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,

    // Line heights
    lineHeightTight: 1.1,
    lineHeightNormal: 1.5,
    lineHeightRelaxed: 1.6,
} as const;

// ═══════════════════════════════════════════════════════════════
// SPACING — 8px grid
// ═══════════════════════════════════════════════════════════════

export const spacing = {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    xxl: '32px',
    xxxl: '48px',

    // Hero specific — moved up
    heroTop: '10vh',
    heroPadding: '6vw',
} as const;
