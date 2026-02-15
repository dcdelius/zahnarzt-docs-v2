/**
 * HeroSculpture — Jeton-grade stacked slices with rim light
 *
 * Design principles:
 * - 4 layered slices with subtle rim light lines
 * - Slow parallax float (6–12s), no spring
 * - Recording: breathing ring OR increased rim light intensity
 *
 * ❌ NO spring physics
 * ✅ Cubic-bezier only, 100–300ms for interactions, 6–12s for ambient
 */

import React from 'react';
import { motion } from 'framer-motion';
import { colors, motion as motionTokens } from '../styles/tokens';

interface HeroSculptureProps {
    isRecording: boolean;
}

// Slice configuration
const SLICES = [
    { // Outermost / largest
        top: '8vh',
        right: '-8vw',
        width: 'clamp(220px, 28vw, 380px)',
        height: 'clamp(280px, 40vh, 480px)',
        radius: '35% 65% 55% 45% / 40% 35% 65% 60%',
        rotation: -8,
        floatDuration: 10,
        floatY: 12,
        floatX: 8,
        baseOpacity: 0.06,
        recordingOpacity: 0.10,
    },
    { // Second layer
        top: '14vh',
        right: '-4vw',
        width: 'clamp(180px, 22vw, 300px)',
        height: 'clamp(220px, 32vh, 380px)',
        radius: '45% 55% 50% 50% / 35% 45% 55% 65%',
        rotation: 4,
        floatDuration: 12,
        floatY: -10,
        floatX: -6,
        baseOpacity: 0.08,
        recordingOpacity: 0.14,
    },
    { // Third layer
        top: '22vh',
        right: '2vw',
        width: 'clamp(140px, 16vw, 220px)',
        height: 'clamp(160px, 24vh, 280px)',
        radius: '50% 50% 45% 55% / 45% 50% 50% 55%',
        rotation: -3,
        floatDuration: 8,
        floatY: 8,
        floatX: 5,
        baseOpacity: 0.10,
        recordingOpacity: 0.18,
    },
    { // Innermost / brightest
        top: '28vh',
        right: '6vw',
        width: 'clamp(80px, 10vw, 140px)',
        height: 'clamp(100px, 14vh, 180px)',
        radius: '50%',
        rotation: 0,
        floatDuration: 6,
        floatY: -6,
        floatX: -3,
        baseOpacity: 0.14,
        recordingOpacity: 0.24,
    },
];

export const HeroSculpture: React.FC<HeroSculptureProps> = ({ isRecording }) => {
    return (
        <>
            {SLICES.map((slice, index) => (
                <motion.div
                    key={index}
                    animate={{
                        y: [0, slice.floatY, 0, -slice.floatY * 0.6, 0],
                        x: [0, slice.floatX, 0, -slice.floatX * 0.5, 0],
                        opacity: isRecording ? slice.recordingOpacity : slice.baseOpacity,
                    }}
                    transition={{
                        y: {
                            duration: slice.floatDuration,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        },
                        x: {
                            duration: slice.floatDuration * 1.3,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        },
                        opacity: {
                            duration: 0.3,
                            ease: motionTokens.easing,
                        },
                    }}
                    style={{
                        position: 'absolute',
                        top: slice.top,
                        right: slice.right,
                        width: slice.width,
                        height: slice.height,
                        borderRadius: slice.radius,
                        transform: `rotate(${slice.rotation}deg)`,
                        pointerEvents: 'none',
                        zIndex: 2,
                    }}
                >
                    {/* Slice fill — subtle gradient */}
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            borderRadius: 'inherit',
                            background: `linear-gradient(
                                135deg,
                                ${colors.coralAccent}18 0%,
                                ${colors.warmPink}12 50%,
                                transparent 100%
                            )`,
                            filter: 'blur(20px)',
                        }}
                    />

                    {/* Rim light — 1px border effect */}
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            borderRadius: 'inherit',
                            border: `1px solid rgba(255, 180, 160, ${isRecording ? 0.25 : 0.12})`,
                            boxShadow: isRecording
                                ? `inset 0 0 20px rgba(255, 140, 100, 0.08), 0 0 30px rgba(255, 140, 100, 0.06)`
                                : 'none',
                            transition: 'border-color 0.3s, box-shadow 0.3s',
                        }}
                    />
                </motion.div>
            ))}

            {/* Recording breathing ring — appears near bottom-left of sculpture */}
            {isRecording && (
                <motion.div
                    animate={{
                        scale: [1, 1.15, 1],
                        opacity: [0.15, 0.08, 0.15],
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                    style={{
                        position: 'absolute',
                        top: '45vh',
                        right: '12vw',
                        width: 'clamp(60px, 8vw, 100px)',
                        height: 'clamp(60px, 8vw, 100px)',
                        borderRadius: '50%',
                        border: `1px solid ${colors.coralAccent}`,
                        pointerEvents: 'none',
                        zIndex: 2,
                    }}
                />
            )}
        </>
    );
};

export default HeroSculpture;
