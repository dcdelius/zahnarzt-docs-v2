/**
 * SmartSettingsCard - Modern animated settings component
 * 
 * Features:
 * - 3D tilt on hover
 * - Mini preview visualization
 * - Impact indicator
 * - Smooth expand/collapse
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Sparkles, TrendingUp } from 'lucide-react';
import { colors, radii, spacing, typography } from '../../styles/tokens';

interface SmartSettingsCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  description?: string;
  impact?: {
    percentage: number;
    label: string;
  };
  isRecommended?: boolean;
  isModified?: boolean;
  preview?: React.ReactNode;
  children?: React.ReactNode;
  onClick?: () => void;
}

const cardVariants = {
  idle: {
    scale: 1,
    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
  },
  hover: {
    scale: 1.02,
    boxShadow: '0 8px 40px rgba(0,0,0,0.3)',
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
    },
  },
  tap: {
    scale: 0.98,
    boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
  },
};

const contentVariants = {
  collapsed: {
    height: 0,
    opacity: 0,
    transition: {
      height: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
      opacity: { duration: 0.2 },
    },
  },
  expanded: {
    height: 'auto',
    opacity: 1,
    transition: {
      height: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
      opacity: { duration: 0.2, delay: 0.1 },
    },
  },
};

export const SmartSettingsCard: React.FC<SmartSettingsCardProps> = ({
  icon,
  title,
  value,
  description,
  impact,
  isRecommended,
  isModified,
  preview,
  children,
  onClick,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setMousePosition({ x, y });
  };

  const rotateX = (mousePosition.y - 0.5) * -10;
  const rotateY = (mousePosition.x - 0.5) * 10;

  return (
    <motion.div
      style={{
        position: 'relative',
        background: `linear-gradient(135deg, rgba(30,30,40,0.8) 0%, rgba(21,21,29,0.9) 100%)`,
        borderRadius: radii.card,
        border: '1px solid rgba(255,255,255,0.08)',
        overflow: 'hidden',
        cursor: children ? 'pointer' : 'default',
        transformStyle: 'preserve-3d',
        perspective: 1000,
      }}
      variants={cardVariants}
      initial="idle"
      whileHover="hover"
      whileTap={children ? "tap" : undefined}
      onMouseMove={handleMouseMove}
      onClick={() => {
        if (children) {
          setIsExpanded(!isExpanded);
          onClick?.();
        }
      }}
      animate={{
        rotateX,
        rotateY,
      }}
      transition={{
        rotateX: { type: 'spring', stiffness: 300, damping: 30 },
        rotateY: { type: 'spring', stiffness: 300, damping: 30 },
      }}
    >
      {/* Glow Effect for Recommended */}
      {isRecommended && (
        <motion.div
          style={{
            position: 'absolute',
            inset: -2,
            background: 'linear-gradient(135deg, rgba(255,139,107,0.2), rgba(255,107,74,0.4))',
            borderRadius: radii.card,
            zIndex: -1,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}

      {/* Main Content */}
      <div style={{ padding: spacing.lg }}>
        {/* Header Row */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: spacing.md,
        }}>
          {/* Icon */}
          <motion.div
            style={{
              width: 48,
              height: 48,
              borderRadius: radii.cardSmall,
              background: 'linear-gradient(135deg, rgba(255,107,74,0.2), rgba(232,90,58,0.3))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FF8B6B',
              flexShrink: 0,
            }}
            whileHover={{ rotate: 5, scale: 1.1 }}
          >
            {icon}
          </motion.div>

          {/* Title & Value */}
          <div style={{ flex: 1 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
              marginBottom: spacing.xs,
            }}>
              <span style={{
                fontSize: typography.body,
                fontWeight: typography.semibold,
                color: colors.textPrimary,
              }}>
                {title}
              </span>
              
              {isModified && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#FF6B4A',
                  }}
                />
              )}
              
              {isRecommended && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '2px 8px',
                    borderRadius: radii.pill,
                    background: 'rgba(255,107,74,0.2)',
                    color: '#FF8B6B',
                    fontSize: typography.caption,
                    fontWeight: typography.semibold,
                  }}
                >
                  <Sparkles size={12} />
                  Empfohlen
                </motion.div>
              )}
            </div>

            <motion.div
              key={value}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                fontSize: typography.bodyLarge,
                fontWeight: typography.bold,
                color: colors.textPrimary,
                marginBottom: spacing.xs,
              }}
            >
              {value}
            </motion.div>

            {description && (
              <p style={{
                fontSize: typography.bodySmall,
                color: colors.textSecondary,
                lineHeight: typography.lineHeightRelaxed,
                margin: 0,
              }}>
                {description}
              </p>
            )}
          </div>

          {/* Expand Indicator */}
          {children && (
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
              style={{ color: colors.textSecondary }}
            >
              <ChevronRight size={20} />
            </motion.div>
          )}
        </div>

        {/* Impact Indicator */}
        {impact && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
              marginTop: spacing.md,
              padding: spacing.sm,
              borderRadius: radii.cardSmall,
              background: 'rgba(16,185,129,0.1)',
              border: '1px solid rgba(16,185,129,0.2)',
            }}
          >
            <TrendingUp size={16} color="#10B981" />
            <span style={{
              fontSize: typography.bodySmall,
              color: colors.textSecondary,
            }}>
              {impact.label}: <strong style={{ color: '#10B981' }}>{impact.percentage}%</strong>
            </span>
          </motion.div>
        )}

        {/* Mini Preview */}
        {preview && !isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            style={{
              marginTop: spacing.md,
              padding: spacing.md,
              borderRadius: radii.cardSmall,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {preview}
          </motion.div>
        )}
      </div>

      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && children && (
          <motion.div
            variants={contentVariants}
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            style={{
              overflow: 'hidden',
              borderTop: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div style={{ padding: spacing.lg }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SmartSettingsCard;
