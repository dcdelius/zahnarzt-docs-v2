/**
 * AuthContext — Real Firebase Auth for V7
 *
 * ═══════════════════════════════════════════════════════════════
 * Provides auth state, claims, and role mapping.
 * Falls back to mock if USE_MOCK_AUTH=true or no Firebase.
 * ═══════════════════════════════════════════════════════════════
 */

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { getAuth, onAuthStateChanged, signOut as firebaseSignOut, type User } from 'firebase/auth';
import { mapClaimsToRole, type UIRole, type RoleContext } from './mapClaimsToRole';
import type { CustomClaims } from './authTypes';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface AuthUser {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
}

export interface AuthContextValue {
    // State
    user: AuthUser | null;
    claims: CustomClaims | null;
    role: UIRole;
    orgId: string | null;
    practiceId: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    hasPractices: boolean;

    // Actions
    signOut: () => Promise<void>;
    selectOrg: (orgId: string) => void;
    selectPractice: (practiceId: string) => void;
    forceRefreshClaims: () => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════

const AuthContext = createContext<AuthContextValue | null>(null);

// ═══════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
    const [claims, setClaims] = useState<CustomClaims | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
    const [selectedPracticeId, setSelectedPracticeId] = useState<string | null>(null);

    // Load claims from user
    const loadClaims = useCallback(async (user: User | null) => {
        if (user) {
            const tokenResult = await user.getIdTokenResult();
            setClaims(tokenResult.claims as unknown as CustomClaims);
        } else {
            setClaims(null);
        }
    }, []);

    // Listen to auth state
    useEffect(() => {
        try {
            const auth = getAuth();
            const unsubscribe = onAuthStateChanged(auth, async (user) => {
                setFirebaseUser(user);
                await loadClaims(user);
                setIsLoading(false);
            });

            return unsubscribe;
        } catch {
            // Firebase not initialized - leave as loading=false with no user
            setIsLoading(false);
        }
    }, [loadClaims]);

    // Derive role context
    const roleContext: RoleContext = mapClaimsToRole(claims, selectedOrgId ?? undefined, selectedPracticeId ?? undefined);

    // Map to AuthUser
    const user: AuthUser | null = firebaseUser
        ? {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
        }
        : null;

    // Check if user has any practices
    const hasPractices = claims?.practices ? Object.keys(claims.practices).length > 0 : false;

    const signOut = useCallback(async () => {
        try {
            const auth = getAuth();
            await firebaseSignOut(auth);
        } catch {
            // Ignore if Firebase not available
        }
    }, []);

    const selectOrg = useCallback((orgId: string) => {
        setSelectedOrgId(orgId);
    }, []);

    const selectPractice = useCallback((practiceId: string) => {
        setSelectedPracticeId(practiceId);
    }, []);

    // Force refresh claims (after accepting invite or creating practice)
    const forceRefreshClaims = useCallback(async () => {
        if (firebaseUser) {
            // Force token refresh
            await firebaseUser.getIdToken(true);
            // Reload claims
            await loadClaims(firebaseUser);
        }
    }, [firebaseUser, loadClaims]);

    const value: AuthContextValue = {
        user,
        claims,
        role: roleContext.role,
        orgId: roleContext.orgId,
        practiceId: roleContext.practiceId,
        isLoading,
        isAuthenticated: !!user,
        hasPractices,
        signOut,
        selectOrg,
        selectPractice,
        forceRefreshClaims,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ═══════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}

export default AuthContext;

