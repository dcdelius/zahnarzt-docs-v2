/**
 * SetupProgress - Gamified onboarding progress
 * 
 * Features:
 * - Animated progress rings
 * - Step completion with checkmarks
 * - Click to navigate to incomplete steps
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Check, Circle, Lock, ChevronRight } from 'lucide-react';
import { colors, radii, spacing, typography } from '../../styles/tokens';

interface SetupStep {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  locked?: boolean;
}

interface SetupProgressProps {
  steps: SetupStep[];
  currentStep?: string;
  onStepClick: (stepId: string) => void;
}

const stepVariants = {
  incomplete: {
    scale: 1,
    opacity: 0.7,
  },
  completed: {
    scale: 1.02,
    opacity: 1,
  },
  current: {
    scale: 1.05,
    opacity: 1,
    boxShadow: '0 0 20px rgba(255,107,74,0.3)',
  },
};

const checkVariants = {
  hidden: {
    pathLength: 0,
    opacity: 0,
  },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1],
    },
  },
};

export const SetupProgress: React.FC<SetupProgressProps> = ({
  steps,
  currentStep,
  onStepClick,
}) => {
  const completedCount = steps.filter(s => s.completed).length;
  const progress = (completedCount / steps.length) * 100;

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(30,30,40,0.8) 0%, rgba(21,21,29,0.9) 100%)',
        borderRadius: radii.card,
        border: '1px solid rgba(255,255,255,0.08)',
        padding: spacing.lg,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: spacing.lg,
        }}
      >
        <div>
          <h3
            style={{
              fontSize: typography.bodyLarge,
              fontWeight: typography.bold,
              color: colors.textPrimary,
              margin: 0,
            }}
          >
            Einrichtung
          </h3>
          <p
            style={{
              fontSize: typography.bodySmall,
              color: colors.textSecondary,
              margin: `${spacing.xs}px 0 0`,
            }}
          >
            {completedCount} von {steps.length} Schritten abgeschlossen
          </p>
        </div>

        {/* Progress Ring */}
        <div style={{ position: 'relative', width: 60, height: 60 }}>
          {/* Background Ring */}
          <svg width="60" height="60" style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx="30"
              cy="30"
              r="26"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="4"
            />
            {/* Progress Ring */}
            <motion.circle
              cx="30"
              cy="30"
              r="26"
              fill="none"
              stroke="#FF6B4A"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 26}`}
              initial={{ strokeDashoffset: `${2 * Math.PI * 26}` }}
              animate={{
                strokeDashoffset: `${2 * Math.PI * 26 * (1 - progress / 100)}`,
              }}
              transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
            />
          </svg>
          {/* Percentage */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: typography.body,
              fontWeight: typography.bold,
              color: colors.textPrimary,
            }}
          >
            {Math.round(progress)}%
          </div>
        </div>
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
        {steps.map((step, index) => {
          const isCurrent = currentStep === step.id;
          const isCompleted = step.completed;
          const isLocked = step.locked;

          return (
            <motion.button
              key={step.id}
              variants={stepVariants}
              initial="incomplete"
              animate={isCurrent ? 'current' : isCompleted ? 'completed' : 'incomplete'}
              whileHover={!isLocked ? { scale: 1.02, x: 4 } : {}}
              whileTap={!isLocked ? { scale: 0.98 } : {}}
              onClick={() => !isLocked && onStepClick(step.id)}
              disabled={isLocked}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.md,
                padding: spacing.md,
                borderRadius: radii.cardSmall,
                background: isCurrent
                  ? 'rgba(255,107,74,0.15)'
                  : isCompleted
                  ? 'rgba(16,185,129,0.1)'
                  : 'rgba(255,255,255,0.03)',
                border: `1px solid ${
                  isCurrent
                    ? 'rgba(255,107,74,0.3)'
                    : isCompleted
                    ? 'rgba(16,185,129,0.2)'
                    : 'rgba(255,255,255,0.05)'
                }`,
                cursor: isLocked ? 'not-allowed' : 'pointer',
                textAlign: 'left',
                border: 'none',
                width: '100%',
              }}
            >
              {/* Status Icon */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isCompleted
                    ? 'rgba(16,185,129,0.2)'
                    : isCurrent
                    ? 'rgba(255,107,74,0.2)'
                    : 'rgba(255,255,255,0.05)',
                  color: isCompleted ? '#10B981' : isCurrent ? '#FF8B6B' : colors.textMuted,
                }}
              >
                {isCompleted ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  >
                    <Check size={18} />
                  </motion.div>
                ) : isLocked ? (
                  <Lock size={18} />
                ) : (
                  <Circle size={18} />
                )}
              </div>

              {/* Step Info */}
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: typography.body,
                    fontWeight: typography.semibold,
                    color: isLocked ? colors.textMuted : colors.textPrimary,
                    marginBottom: 2,
                  }}
                >
                  {step.label}
                </div>
                <div
                  style={{
                    fontSize: typography.caption,
                    color: colors.textSecondary,
                  }}
                >
                  {step.description}
                </div>
              </div>

              {/* Arrow */}
              {!isCompleted && !isLocked && (
                <ChevronRight size={18} color={colors.textMuted} />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Completion Message */}
      {completedCount === steps.length && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            marginTop: spacing.md,
            padding: spacing.md,
            borderRadius: radii.cardSmall,
            background: 'rgba(16,185,129,0.1)',
            border: '1px solid rgba(16,185,129,0.2)',
            textAlign: 'center',
          }}
        >
          <span style={{ color: '#10B981', fontWeight: typography.semibold }}>
            🎉 Einrichtung abgeschlossen!
          </span>
        </motion.div>
      )}
    </div>
  );
};

export default SetupProgress;
