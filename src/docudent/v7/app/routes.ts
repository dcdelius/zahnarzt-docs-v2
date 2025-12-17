/**
 * V7 Route Configuration — Central Route Definitions
 *
 * ═══════════════════════════════════════════════════════════════
 * SSOT for all V7 routes with IA lockdown (navGroup, order, badge).
 * ═══════════════════════════════════════════════════════════════
 *
 * RULES:
 * ✅ Only UI role visibility (not RBAC permissions)
 * ✅ Routes are lazy-loadable
 * ✅ Every route in exactly one navGroup
 * ❌ No Firestore logic
 * ❌ No v6 imports
 */

import { lazy, ComponentType, LazyExoticComponent } from 'react';

// ═══════════════════════════════════════════════════════════════
// UI ROLES
// ═══════════════════════════════════════════════════════════════

export type UIRole =
    | 'software_admin'
    | 'org_admin'
    | 'practice_admin'
    | 'provider'
    | 'assistant';

export const ALL_UI_ROLES: UIRole[] = [
    'software_admin',
    'org_admin',
    'practice_admin',
    'provider',
    'assistant',
];

// ═══════════════════════════════════════════════════════════════
// NAV GROUPS
// ═══════════════════════════════════════════════════════════════

export type NavGroup = 'workflow' | 'organisation' | 'finance' | 'system';

export const NAV_GROUP_CONFIG: Record<NavGroup, { label: string | null; order: number }> = {
    workflow: { label: null, order: 0 },        // No label for main section
    organisation: { label: 'Organisation', order: 1 },
    finance: { label: 'Finance', order: 2 },
    system: { label: 'System', order: 3 },
};

// ═══════════════════════════════════════════════════════════════
// ROUTE DEFINITION
// ═══════════════════════════════════════════════════════════════

export type Badge = 'beta' | 'soon' | null;

export interface RouteConfig {
    path: string;
    label: string;
    component: LazyExoticComponent<ComponentType<unknown>>;
    visibleTo: UIRole[];
    navGroup: NavGroup;
    order: number;          // Order within group
    badge?: Badge;
}

// ═══════════════════════════════════════════════════════════════
// LAZY-LOADED PAGE COMPONENTS
// ═══════════════════════════════════════════════════════════════

const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const DictationPage = lazy(() => import('../pages/DictationPage'));
const CasesPage = lazy(() => import('../pages/CasesPage'));
const SettingsPage = lazy(() => import('../pages/SettingsPage'));
const TeamPage = lazy(() => import('../pages/TeamPage'));
const AdminPage = lazy(() => import('../pages/AdminPage'));
const BillingBetaPage = lazy(() => import('../pages/BillingBetaPage'));
const OnboardingPage = lazy(() => import('../pages/OnboardingPage'));
const AcceptInvitePage = lazy(() => import('../pages/AcceptInvitePage'));

// ═══════════════════════════════════════════════════════════════
// ROUTE REGISTRY
// ═══════════════════════════════════════════════════════════════

export const ROUTES: RouteConfig[] = [
    // ═══ WORKFLOW ═══
    {
        path: '/dashboard',
        label: 'Dashboard',
        component: DashboardPage,
        visibleTo: ALL_UI_ROLES,
        navGroup: 'workflow',
        order: 0,
    },
    {
        path: '/dictation',
        label: 'Diktat',
        component: DictationPage,
        visibleTo: ['org_admin', 'practice_admin', 'provider', 'assistant'],
        navGroup: 'workflow',
        order: 1,
    },
    {
        path: '/cases',
        label: 'Fälle',
        component: CasesPage,
        visibleTo: ['org_admin', 'practice_admin', 'provider', 'assistant'],
        navGroup: 'workflow',
        order: 2,
    },

    // ═══ ORGANISATION ═══
    {
        path: '/settings',
        label: 'Einstellungen',
        component: SettingsPage,
        visibleTo: ['org_admin', 'practice_admin', 'provider'],
        navGroup: 'organisation',
        order: 0,
    },
    {
        path: '/team',
        label: 'Team',
        component: TeamPage,
        visibleTo: ['org_admin', 'practice_admin'],
        navGroup: 'organisation',
        order: 1,
    },

    // ═══ FINANCE ═══
    {
        path: '/billing',
        label: 'Abrechnung',
        component: BillingBetaPage,
        visibleTo: ['org_admin', 'practice_admin', 'provider'],
        navGroup: 'finance',
        order: 0,
        badge: 'beta',
    },

    // ═══ SYSTEM ═══
    {
        path: '/admin',
        label: 'Admin',
        component: AdminPage,
        visibleTo: ['software_admin'],
        navGroup: 'system',
        order: 0,
    },
];

// ═══════════════════════════════════════════════════════════════
// PUBLIC ROUTES (no auth required, not in nav)
// ═══════════════════════════════════════════════════════════════

export interface PublicRouteConfig {
    path: string;
    component: LazyExoticComponent<ComponentType<unknown>>;
}

export const PUBLIC_ROUTES: PublicRouteConfig[] = [
    { path: '/onboarding', component: OnboardingPage },
    { path: '/accept-invite', component: AcceptInvitePage },
];

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Get routes visible to a specific role, grouped by navGroup.
 */
export function getGroupedRoutes(role: UIRole): Map<NavGroup, RouteConfig[]> {
    const grouped = new Map<NavGroup, RouteConfig[]>();

    // Initialize groups in order
    const groupOrder: NavGroup[] = ['workflow', 'organisation', 'finance', 'system'];
    for (const group of groupOrder) {
        grouped.set(group, []);
    }

    // Add routes to groups
    for (const route of ROUTES) {
        if (route.visibleTo.includes(role)) {
            grouped.get(route.navGroup)!.push(route);
        }
    }

    // Sort each group by order
    for (const [group, routes] of grouped) {
        routes.sort((a, b) => a.order - b.order);
    }

    // Remove empty groups
    for (const [group, routes] of grouped) {
        if (routes.length === 0) {
            grouped.delete(group);
        }
    }

    return grouped;
}

/**
 * Get default route for a role.
 */
export function getDefaultRoute(role: UIRole): string {
    const grouped = getGroupedRoutes(role);
    const firstGroup = grouped.values().next().value;
    return firstGroup && firstGroup.length > 0 ? firstGroup[0].path : '/dashboard';
}
