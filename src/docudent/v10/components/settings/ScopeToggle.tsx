/**
 * ScopeToggle - Animated Practice vs User toggle
 * 
 * Visual distinction between Practice and User settings
 * with smooth gradient transitions
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Building2, User } from 'lucide-react';
import { colors, radii, spacing, typography } from '../../styles/tokens';

interface ScopeToggleProps {
  activeScope: 'practice' | 'user';
  onChange: (scope: 'practice' | 'user') => void;
}

const scopeConfig = {
  practice: {
    label: 'Praxis',
    icon: Building2,
    color: '#4A90D9',
    bgGradient: 'linear-gradient(135deg, rgba(74,144,217,0.2) 0%, rgba(46,90,140,0.3) 100%)',
    description: 'Praxisweite Einstellungen',
  },
  user: {
    label: 'Benutzer',
    icon: User,
    color: '#D94A90',
    bgGradient: 'linear-gradient(135deg, rgba(217,74,144,0.2) 0%, rgba(140,46,90,0.3) 100%)',
    description: 'Persönliche Defaults',
  },
};

export const ScopeToggle: React.FC<ScopeToggleProps> = ({
  activeScope,
  onChange,
}) => {
  const isPractice = activeScope === 'practice';

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        background: 'rgba(0,0,0,0.3)',
        borderRadius: radii.pill,
        padding: 4,
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      {/* Sliding Background */}
      <motion.div
        style={{
          position: 'absolute',
          top: 4,
          bottom: 4,
          width: 'calc(50% - 4px)',
          borderRadius: radii.pill,
          background: isPractice 
            ? 'linear-gradient(135deg, #4A90D9 0%, #2E5A8C 100%)'
            : 'linear-gradient(135deg, #D94A90 0%, #8C2E5A 100%)',
          boxShadow: `0 4px 20px ${isPractice ? 'rgba(74,144,217,0.4)' : 'rgba(217,74,144,0.4)'}`,
        }}
        initial={false}
        animate={{
          x: isPractice ? 0 : '100%',
        }}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 30,
        }}
      />

      {/* Practice Button */}
      <button
        type="button"
        onClick={() => onChange('practice')}
        style={{
          position: 'relative',
          zIndex: 1,
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          padding: `${spacing.sm}px ${spacing.md}px`,
          borderRadius: radii.pill,
          border: 'none',
          background: 'transparent',
          color: isPractice ? colors.textPrimary : colors.textSecondary,
          fontSize: typography.body,
          fontWeight: typography.semibold,
          cursor: 'pointer',
          transition: 'color 0.2s ease',
        }}
      >
        <Building2 size={18} />
        <span>Praxis</span>
      </button>

      {/* User Button */}
      <button
        type="button"
        onClick={() => onChange('user')}
        style={{
          position: 'relative',
          zIndex: 1,
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          padding: `${spacing.sm}px ${spacing.md}px`,
          borderRadius: radii.pill,
          border: 'none',
          background: 'transparent',
          color: !isPractice ? colors.textPrimary : colors.textSecondary,
          fontSize: typography.body,
          fontWeight: typography.semibold,
          cursor: 'pointer',
          transition: 'color 0.2s ease',
        }}
      >
        <User size={18} />
        <span>Benutzer</span>
      </button>
    </div>
  );
};

export default ScopeToggle;
