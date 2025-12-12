/**
 * ProcessingOverlay – Glassmorphism card with Coral Orbit loader
 * Shows during dictation analysis (dictationState: 'processing')
 */

import { motion, AnimatePresence } from 'framer-motion';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface ProcessingOverlayProps {
    isVisible: boolean;
}

// ═══════════════════════════════════════════════════════════════
// ANIMATION VARIANTS
// ═══════════════════════════════════════════════════════════════

const overlayVariants = {
    hidden: {
        opacity: 0,
        scale: 0.96,
        y: 8,
        filter: 'blur(2px)',
    },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        filter: 'blur(0px)',
        transition: {
            duration: 0.32,
            ease: [0.25, 0.46, 0.45, 0.94], // easeOutQuart
            delay: 0.15,
        },
    },
    exit: {
        opacity: 0,
        scale: 0.97,
        y: -6,
        filter: 'blur(2px)',
        transition: {
            duration: 0.28,
            ease: [0.25, 0.46, 0.45, 0.94],
        },
    },
};

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

const styles = {
    container: {
        position: 'fixed' as const,
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        pointerEvents: 'none' as const,
    },
    card: {
        maxWidth: '420px',
        padding: '32px 40px',
        borderRadius: '32px',
        background: 'rgba(255, 255, 255, 0.10)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        boxShadow: '0 24px 64px -24px rgba(0, 0, 0, 0.4)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        textAlign: 'center' as const,
        pointerEvents: 'auto' as const,
    },
    label: {
        fontSize: '12px',
        fontWeight: 500,
        letterSpacing: '0.08em',
        textTransform: 'uppercase' as const,
        color: 'rgba(255, 255, 255, 0.55)',
        marginBottom: '12px',
    },
    headline: {
        fontSize: '24px',
        fontWeight: 300,
        color: '#FFFFFF',
        lineHeight: 1.4,
        marginBottom: '28px',
    },
    loaderContainer: {
        display: 'flex',
        justifyContent: 'center',
        marginTop: '8px',
    },
};

// ═══════════════════════════════════════════════════════════════
// CORAL ORBIT LOADER
// ═══════════════════════════════════════════════════════════════

const CoralOrbitLoader = () => {
    const ringSize = 48;
    const dotSize = 6;
    const dotCount = 3;

    return (
        <div
            style={{
                position: 'relative',
                width: ringSize,
                height: ringSize,
            }}
        >
            {/* Outer ring */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    border: '1.5px solid rgba(255, 255, 255, 0.25)',
                }}
            />

            {/* Orbiting dots */}
            <motion.div
                style={{
                    position: 'absolute',
                    inset: 0,
                }}
                animate={{ rotate: 360 }}
                transition={{
                    repeat: Infinity,
                    duration: 12,
                    ease: 'linear',
                }}
            >
                {[...Array(dotCount)].map((_, i) => {
                    const angle = (i / dotCount) * 360;
                    const radius = (ringSize - dotSize) / 2;
                    const x = Math.cos((angle * Math.PI) / 180) * radius;
                    const y = Math.sin((angle * Math.PI) / 180) * radius;

                    return (
                        <motion.div
                            key={i}
                            style={{
                                position: 'absolute',
                                width: dotSize,
                                height: dotSize,
                                borderRadius: '50%',
                                background: `linear-gradient(135deg, #FF6B4A 0%, #FFB199 100%)`,
                                left: '50%',
                                top: '50%',
                                transform: `translate(${x - dotSize / 2}px, ${y - dotSize / 2}px)`,
                                boxShadow: '0 2px 8px rgba(255, 107, 74, 0.4)',
                            }}
                            animate={{
                                scale: [1, 1.2, 1],
                                opacity: [0.8, 1, 0.8],
                            }}
                            transition={{
                                repeat: Infinity,
                                duration: 2,
                                delay: i * 0.3,
                                ease: 'easeInOut',
                            }}
                        />
                    );
                })}
            </motion.div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export const ProcessingOverlay = ({ isVisible }: ProcessingOverlayProps) => {
    return (
        <AnimatePresence>
            {isVisible && (
                <div style={styles.container}>
                    <motion.div
                        style={styles.card}
                        variants={overlayVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                    >
                        <div style={styles.label}>
                            Diktat wird analysiert
                        </div>
                        <div style={styles.headline}>
                            Wir strukturieren Ihre Dokumentation…
                        </div>
                        <div style={styles.loaderContainer}>
                            <CoralOrbitLoader />
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
