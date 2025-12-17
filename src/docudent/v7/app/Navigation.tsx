/**
 * V7 Navigation V2 — JETON_UI_DIREKTIV_V1 + IA Lockdown
 *
 * ═══════════════════════════════════════════════════════════════
 * Uses navGroup + order + badge from routes.ts.
 * Text-first design with soft pill active and hover morph.
 * ═══════════════════════════════════════════════════════════════
 */

import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from './AuthContext.mock';
import { getGroupedRoutes, NAV_GROUP_CONFIG, RouteConfig, NavGroup } from './routes';
import { colors, gradients, space, radii, typography, shadows, motion as motionTokens } from './designTokens';

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function Navigation() {
    const { role } = useAuth();
    const groupedRoutes = getGroupedRoutes(role);

    return (
        <nav style={{
            display: 'flex',
            flexDirection: 'column',
            gap: space['6'],
            padding: `0 ${space['3']}`,
        }}>
            {Array.from(groupedRoutes.entries()).map(([group, routes]) => (
                <NavGroupSection key={group} group={group} routes={routes} />
            ))}
        </nav>
    );
}

function NavGroupSection({ group, routes }: { group: NavGroup; routes: RouteConfig[] }) {
    const config = NAV_GROUP_CONFIG[group];

    return (
        <div>
            {config.label && (
                <div style={{
                    fontSize: typography.label,
                    fontWeight: typography.semibold,
                    color: colors.textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: typography.wideTracking,
                    padding: `0 ${space['4']}`,
                    marginBottom: space['2'],
                }}>
                    {config.label}
                </div>
            )}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: space['1'],
            }}>
                {routes.map((route) => (
                    <NavItemComponent key={route.path} route={route} />
                ))}
            </div>
        </div>
    );
}

function NavItemComponent({ route }: { route: RouteConfig }) {
    const location = useLocation();
    const isActive = location.pathname === route.path;

    return (
        <NavLink
            to={route.path}
            style={{ textDecoration: 'none' }}
        >
            <motion.div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: `${space['3']} ${space['4']}`,
                    borderRadius: radii.lg,
                    fontSize: typography.body,
                    fontWeight: isActive ? typography.semibold : typography.medium,
                    color: isActive ? colors.textOnAccent : colors.textSecondary,
                    background: isActive ? gradients.activePill : 'transparent',
                    boxShadow: isActive ? shadows.pillActive : 'none',
                    cursor: 'pointer',
                }}
                whileHover={{
                    background: isActive ? gradients.activePill : gradients.hoverTint,
                    color: isActive ? colors.textOnAccent : colors.textPrimary,
                    y: -1,
                }}
                whileTap={{ scale: 0.98 }}
                transition={{
                    duration: motionTokens.fast,
                    ease: motionTokens.ease,
                }}
            >
                <span>{route.label}</span>

                {/* Badge */}
                {route.badge && (
                    <Badge type={route.badge} isActive={isActive} />
                )}
            </motion.div>
        </NavLink>
    );
}

function Badge({ type, isActive }: { type: 'beta' | 'soon'; isActive: boolean }) {
    const config = {
        beta: { bg: colors.accentLight, color: colors.accent, label: 'Beta' },
        soon: { bg: gradients.peachRose, color: colors.textPrimary, label: 'Soon' },
    };

    const c = config[type];

    return (
        <span style={{
            background: isActive ? 'rgba(255,255,255,0.2)' : c.bg,
            color: isActive ? colors.textOnAccent : c.color,
            fontSize: '10px',
            fontWeight: typography.bold,
            padding: `2px ${space['2']}`,
            borderRadius: radii.pill,
            textTransform: 'uppercase',
            letterSpacing: typography.wideTracking,
        }}>
            {c.label}
        </span>
    );
}

export default Navigation;
