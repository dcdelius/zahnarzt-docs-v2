/**
 * mapClaimsToRole — Firebase Custom Claims → UIRole
 *
 * ═══════════════════════════════════════════════════════════════
 * Maps Firebase custom claims to UI role for navigation visibility.
 * ═══════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type UIRole =
    | 'software_admin'
    | 'org_admin'
    | 'practice_admin'
    | 'provider'
    | 'assistant';

export interface CustomClaims {
    isSoftwareAdmin?: boolean;
    orgs?: Record<string, string[]>;  // orgId -> array of roles
    practices?: Record<string, string[]>; // practiceId -> array of roles
}

export interface RoleContext {
    role: UIRole;
    orgId: string | null;
    practiceId: string | null;
}

// ═══════════════════════════════════════════════════════════════
// MAPPING LOGIC
// ═══════════════════════════════════════════════════════════════

/**
 * Map custom claims to UIRole and context.
 * 
 * Priority:
 * 1. isSoftwareAdmin flag → software_admin
 * 2. orgs[orgId] contains 'org_admin' → org_admin
 * 3. practices[practiceId] contains 'practice_admin' → practice_admin
 * 4. practices[practiceId] contains 'provider' → provider
 * 5. default → assistant
 */
export function mapClaimsToRole(
    claims: CustomClaims | null,
    selectedOrgId?: string,
    selectedPracticeId?: string
): RoleContext {
    // No claims = no auth
    if (!claims) {
        return { role: 'assistant', orgId: null, practiceId: null };
    }

    // 1. Software admin
    if (claims.isSoftwareAdmin) {
        return {
            role: 'software_admin',
            orgId: selectedOrgId ?? null,
            practiceId: selectedPracticeId ?? null,
        };
    }

    // Get org/practice IDs
    const orgIds = Object.keys(claims.orgs ?? {});
    const practiceIds = Object.keys(claims.practices ?? {});

    // Use selected or first available
    const orgId = selectedOrgId ?? orgIds[0] ?? null;
    const practiceId = selectedPracticeId ?? practiceIds[0] ?? null;

    // 2. Org admin
    if (orgId && claims.orgs?.[orgId]?.includes('org_admin')) {
        return { role: 'org_admin', orgId, practiceId };
    }

    // 3. Practice admin
    if (practiceId && claims.practices?.[practiceId]?.includes('practice_admin')) {
        return { role: 'practice_admin', orgId, practiceId };
    }

    // 4. Provider
    if (practiceId && claims.practices?.[practiceId]?.includes('provider')) {
        return { role: 'provider', orgId, practiceId };
    }

    // 5. Default: assistant
    return { role: 'assistant', orgId, practiceId };
}

/**
 * Get all orgs a user has access to.
 */
export function getAccessibleOrgs(claims: CustomClaims | null): string[] {
    if (!claims) return [];
    if (claims.isSoftwareAdmin) return ['*']; // All orgs
    return Object.keys(claims.orgs ?? {});
}

/**
 * Get all practices a user has access to.
 */
export function getAccessiblePractices(claims: CustomClaims | null): string[] {
    if (!claims) return [];
    if (claims.isSoftwareAdmin) return ['*']; // All practices
    return Object.keys(claims.practices ?? {});
}
