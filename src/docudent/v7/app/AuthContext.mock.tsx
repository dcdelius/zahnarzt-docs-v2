/**
 * Mock Auth Context — For Development/Testing
 *
 * ═══════════════════════════════════════════════════════════════
 * Provides mocked user + role + practice for UI development.
 * Switch MOCK_USER to test different role scenarios.
 * ═══════════════════════════════════════════════════════════════
 *
 * RULES:
 * ✅ UI role only (not RBAC)
 * ✅ Switchable via const
 * ❌ No Firestore logic
 * ❌ No real auth
 */

import React, { createContext, useContext, ReactNode, useState } from 'react';
import { UIRole } from './routes';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface MockUser {
    uid: string;
    email: string;
    displayName: string;
    role: UIRole;
    orgId: string;
    orgName: string;
    practiceId: string;
    practiceName: string;
}

export interface AuthContextValue {
    user: MockUser | null;
    role: UIRole;
    claims: null;
    orgId: string | null;
    practiceId: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    hasPractices: boolean;
    setMockRole: (role: UIRole) => void;
    signOut: () => Promise<void>;
    selectOrg: (orgId: string) => void;
    selectPractice: (practiceId: string) => void;
    forceRefreshClaims: () => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════
// MOCK USER PRESETS
// ═══════════════════════════════════════════════════════════════

const MOCK_USERS: Record<UIRole, MockUser> = {
    software_admin: {
        uid: 'mock_software_admin',
        email: 'admin@docudent.io',
        displayName: 'System Admin',
        role: 'software_admin',
        orgId: 'org_docudent',
        orgName: 'Docudent GmbH',
        practiceId: 'prac_internal',
        practiceName: 'Internal',
    },
    org_admin: {
        uid: 'mock_org_admin',
        email: 'mueller@praxis-mueller.de',
        displayName: 'Dr. Müller',
        role: 'org_admin',
        orgId: 'org_mueller',
        orgName: 'Praxis Müller Gruppe',
        practiceId: 'prac_mueller_1',
        practiceName: 'Praxis Müller Berlin',
    },
    practice_admin: {
        uid: 'mock_practice_admin',
        email: 'schmidt@praxis.de',
        displayName: 'Dr. Schmidt',
        role: 'practice_admin',
        orgId: 'org_test',
        orgName: 'Test Organisation',
        practiceId: 'prac_test_1',
        practiceName: 'Testpraxis Berlin',
    },
    provider: {
        uid: 'mock_provider',
        email: 'weber@praxis.de',
        displayName: 'Dr. Weber',
        role: 'provider',
        orgId: 'org_test',
        orgName: 'Test Organisation',
        practiceId: 'prac_test_1',
        practiceName: 'Testpraxis Berlin',
    },
    assistant: {
        uid: 'mock_assistant',
        email: 'mustermann@praxis.de',
        displayName: 'Anna Mustermann',
        role: 'assistant',
        orgId: 'org_test',
        orgName: 'Test Organisation',
        practiceId: 'prac_test_1',
        practiceName: 'Testpraxis Berlin',
    },
};

// ═══════════════════════════════════════════════════════════════
// DEFAULT MOCK ROLE — CHANGE THIS TO TEST DIFFERENT ROLES
// ═══════════════════════════════════════════════════════════════

const DEFAULT_MOCK_ROLE: UIRole = 'provider';

// ═══════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════

const AuthContext = createContext<AuthContextValue | null>(null);

export function MockAuthProvider({ children }: { children: ReactNode }) {
    const [role, setRole] = useState<UIRole>(DEFAULT_MOCK_ROLE);
    const mockUser = MOCK_USERS[role];

    const value: AuthContextValue = {
        user: mockUser,
        role,
        claims: null,
        orgId: mockUser.orgId,
        practiceId: mockUser.practiceId,
        isLoading: false,
        isAuthenticated: true,
        hasPractices: true,
        setMockRole: setRole,
        signOut: async () => { /* no-op in mock */ },
        selectOrg: () => { /* no-op in mock */ },
        selectPractice: () => { /* no-op in mock */ },
        forceRefreshClaims: async () => { /* no-op in mock */ },
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within MockAuthProvider');
    }
    return context;
}

/**
 * Role switcher component for dev toolbar.
 */
export function RoleSwitcher() {
    const { role, setMockRole } = useAuth();

    return (
        <select
            value={role}
            onChange={(e) => setMockRole(e.target.value as UIRole)}
            style={{
                padding: '4px 8px',
                fontSize: '12px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                background: '#f5f5f5',
            }}
        >
            <option value="software_admin">🔧 Software Admin</option>
            <option value="org_admin">🏢 Org Admin</option>
            <option value="practice_admin">👔 Practice Admin</option>
            <option value="provider">⚕️ Provider</option>
            <option value="assistant">👩‍⚕️ Assistant</option>
        </select>
    );
}
