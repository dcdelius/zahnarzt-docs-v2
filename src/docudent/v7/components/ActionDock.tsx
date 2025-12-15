/**
 * ActionDock — Jeton-grade Segmented Pill (InsuranceSelector exact DNA)
 *
 * Design principles:
 * - EXACT same outer container as InsuranceSelector
 * - Single absolute thumb that moves with layoutId
 * - Compact instrument sizing (not CTA)
 * - Subtle effects, no "gamer" pulsing arrays
 *
 * Segments: Mic | Send (icons only)
 *
 * State rules (unchanged from spec):
 * - isProcessing: both disabled, thumb stays where it was
 * - isRecording: active = mic; send disabled; subtle pulse
 * - hasText (and not recording): active = send; mic disabled
 * - else: active = mic; send disabled
 *
 * ❌ NO logic — only UI state from props
 */

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mic, Send } from 'lucide-react';
import {
    colors,
    gradients,
    shadows,
    radii,
    motion as motionTokens,
} from '../styles/tokens';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

type ActiveSegment = 'mic' | 'send';

interface ActionDockProps {
    hasText: boolean;
    isRecording: boolean;
    isProcessing: boolean;
    recordTime?: number; // seconds
    onMicClick: () => void;
    onSendClick: () => void;
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const SEGMENT_WIDTH = 48;
const SEGMENT_HEIGHT = 40;
const BAR_PADDING = 5;

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function ActionDock({
    hasText,
    isRecording,
    isProcessing,
    recordTime = 0,
    onMicClick,
    onSendClick,
}: ActionDockProps) {
    const [isBarHovered, setIsBarHovered] = useState(false);
    const lastActiveRef = useRef<ActiveSegment>('mic');

    // Derive active segment
    let activeSegment: ActiveSegment;
    if (isProcessing) {
        activeSegment = lastActiveRef.current;
    } else if (isRecording) {
        activeSegment = 'mic';
    } else if (hasText) {
        activeSegment = 'send';
    } else {
        activeSegment = 'mic';
    }

    // Update ref for next processing state
    if (!isProcessing) {
        lastActiveRef.current = activeSegment;
    }

    // Disabled states
    const micDisabled = isProcessing || (hasText && !isRecording);
    const sendDisabled = isProcessing || !hasText || isRecording;

    // Format record time
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Thumb x position
    const thumbX = activeSegment === 'mic' ? 0 : SEGMENT_WIDTH;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {/* Main bar — InsuranceSelector exact DNA */}
            <motion.div
                onMouseEnter={() => setIsBarHovered(true)}
                onMouseLeave={() => setIsBarHovered(false)}
                animate={{
                    y: isBarHovered ? -2 : 0,
                    boxShadow: isBarHovered ? shadows.barHover : shadows.barDefault,
                }}
                transition={{
                    duration: motionTokens.durationSmall,
                    ease: motionTokens.easing,
                }}
                style={{
                    position: 'relative',
                    display: 'inline-flex',
                    alignItems: 'stretch',
                    borderRadius: radii.pill,
                    padding: `${BAR_PADDING}px`,
                    background: gradients.insuranceBar,
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    boxShadow: shadows.barDefault,
                    alignSelf: 'flex-start',
                }}
            >
                {/* Inner highlight for materiality */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '50%',
                        background: gradients.innerHighlight,
                        borderRadius: `${radii.pill} ${radii.pill} 0 0`,
                        pointerEvents: 'none',
                    }}
                />

                {/* Single absolute thumb — moves with layout animation */}
                <motion.div
                    layoutId="actionDockThumb"
                    animate={{
                        x: thumbX,
                        opacity: isRecording ? [1, 0.7, 1] : 1,
                    }}
                    transition={
                        isRecording
                            ? {
                                x: { duration: motionTokens.durationMedium, ease: motionTokens.easing },
                                opacity: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' },
                            }
                            : {
                                duration: motionTokens.durationMedium,
                                ease: motionTokens.easing,
                            }
                    }
                    style={{
                        position: 'absolute',
                        top: BAR_PADDING,
                        left: BAR_PADDING,
                        width: SEGMENT_WIDTH,
                        height: SEGMENT_HEIGHT,
                        borderRadius: radii.pill,
                        background: colors.segmentActive,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                        pointerEvents: 'none',
                        zIndex: 1,
                    }}
                >
                    {/* Thumb inner highlight */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '50%',
                            background: 'linear-gradient(180deg, rgba(255,255,255,0.35) 0%, transparent 100%)',
                            borderRadius: `${radii.pill} ${radii.pill} 0 0`,
                            pointerEvents: 'none',
                        }}
                    />
                    {/* Subtle glow behind thumb */}
                    <div
                        style={{
                            position: 'absolute',
                            inset: '-3px',
                            borderRadius: radii.pill,
                            background: 'rgba(255,255,255,0.25)',
                            filter: 'blur(12px)',
                            zIndex: -1,
                            pointerEvents: 'none',
                        }}
                    />
                </motion.div>

                {/* Mic segment — hit target only */}
                <button
                    type="button"
                    onClick={micDisabled ? undefined : onMicClick}
                    style={{
                        position: 'relative',
                        zIndex: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: SEGMENT_WIDTH,
                        height: SEGMENT_HEIGHT,
                        border: 'none',
                        background: 'transparent',
                        cursor: micDisabled ? 'not-allowed' : 'pointer',
                        color: activeSegment === 'mic' ? colors.segmentActiveText : colors.segmentInactiveText,
                        opacity: micDisabled && activeSegment !== 'mic' ? 0.4 : 1,
                        borderRadius: radii.pill,
                        transition: 'color 0.15s, opacity 0.15s',
                    }}
                >
                    <Mic size={18} />
                </button>

                {/* Send segment — hit target only */}
                <button
                    type="button"
                    onClick={sendDisabled ? undefined : onSendClick}
                    style={{
                        position: 'relative',
                        zIndex: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: SEGMENT_WIDTH,
                        height: SEGMENT_HEIGHT,
                        border: 'none',
                        background: 'transparent',
                        cursor: sendDisabled ? 'not-allowed' : 'pointer',
                        color: activeSegment === 'send' ? colors.segmentActiveText : colors.segmentInactiveText,
                        opacity: sendDisabled && activeSegment !== 'send' ? 0.4 : 1,
                        borderRadius: radii.pill,
                        transition: 'color 0.15s, opacity 0.15s',
                    }}
                >
                    <Send size={16} />
                </button>
            </motion.div>

            {/* Microtext hint below dock */}
            <div
                style={{
                    height: '14px',
                    fontSize: '10px',
                    color: 'rgba(255,255,255,0.24)',
                    fontVariantNumeric: 'tabular-nums',
                    paddingLeft: '2px',
                }}
            >
                {isRecording ? (
                    <span>● REC {formatTime(recordTime)}</span>
                ) : hasText && !isProcessing ? (
                    <span>⌘+Enter</span>
                ) : null}
            </div>
        </div>
    );
}

export default ActionDock;
