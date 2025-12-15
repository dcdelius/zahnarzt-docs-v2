/**
 * DictationAura — Jeton-inspired recording animation
 *
 * When recording:
 * - Soft halo behind input (radial gradient, slow pulse)
 * - 2 drifting orbs (blurred circles)
 * - Wave trace line below input
 *
 * NO FFT bars. Calm, organic, premium.
 *
 * ❌ NO business logic
 * ✅ Pure visual effect
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { colors, motion as motionTokens } from '../styles/tokens';

interface DictationAuraProps {
    isRecording: boolean;
}

export const DictationAura: React.FC<DictationAuraProps> = ({ isRecording }) => {
    return (
        <AnimatePresence>
            {isRecording && (
                <>
                    {/* Halo — soft radial glow behind input */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{
                            opacity: [0.08, 0.12, 0.08],
                            scale: [1, 1.04, 1],
                        }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{
                            duration: 5,
                            repeat: Infinity,
                            ease: motionTokens.easing,
                        }}
                        style={{
                            position: 'absolute',
                            top: '-60px',
                            left: '-80px',
                            width: '400px',
                            height: '300px',
                            borderRadius: '50%',
                            background: `radial-gradient(ellipse at center, ${colors.coralAccent} 0%, transparent 70%)`,
                            filter: 'blur(100px)',
                            pointerEvents: 'none',
                            zIndex: -1,
                        }}
                    />

                    {/* Orb 1 — drifting */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{
                            opacity: [0.06, 0.10, 0.06],
                            x: [0, 20, 0],
                            y: [0, -12, 0],
                        }}
                        exit={{ opacity: 0 }}
                        transition={{
                            duration: 7,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                        style={{
                            position: 'absolute',
                            top: '-40px',
                            right: '20%',
                            width: '180px',
                            height: '180px',
                            borderRadius: '50%',
                            background: colors.orbPink,
                            filter: 'blur(80px)',
                            pointerEvents: 'none',
                            zIndex: -1,
                        }}
                    />

                    {/* Orb 2 — counter-drift */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{
                            opacity: [0.05, 0.08, 0.05],
                            x: [0, -16, 0],
                            y: [0, 10, 0],
                        }}
                        exit={{ opacity: 0 }}
                        transition={{
                            duration: 9,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                        style={{
                            position: 'absolute',
                            top: '20px',
                            left: '10%',
                            width: '140px',
                            height: '140px',
                            borderRadius: '50%',
                            background: colors.orbApricot,
                            filter: 'blur(60px)',
                            pointerEvents: 'none',
                            zIndex: -1,
                        }}
                    />

                    {/* Wave Trace — subtle sine wave line */}
                    <motion.svg
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        style={{
                            position: 'absolute',
                            bottom: '-8px',
                            left: 0,
                            width: '100%',
                            height: '16px',
                            pointerEvents: 'none',
                            overflow: 'visible',
                        }}
                    >
                        <motion.path
                            d="M0,8 Q25,4 50,8 T100,8 T150,8 T200,8 T250,8 T300,8 T350,8 T400,8 T450,8 T500,8 T550,8 T600,8"
                            stroke={colors.coralAccent}
                            strokeWidth="1"
                            strokeOpacity="0.3"
                            fill="none"
                            initial={{ pathOffset: 0 }}
                            animate={{ pathOffset: 1 }}
                            transition={{
                                duration: 3,
                                repeat: Infinity,
                                ease: 'linear',
                            }}
                            style={{
                                strokeDasharray: '4 8',
                            }}
                        />
                    </motion.svg>
                </>
            )}
        </AnimatePresence>
    );
};

export default DictationAura;
