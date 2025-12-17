# App Shell V1 — Intent & Next Steps

## Overview

This is the foundational application shell for Docudent V7:
- **Layout**: Sidebar + header + content area
- **Routing**: Role-aware navigation with lazy loading
- **Auth**: Mock auth context with role switching (dev only)

## Structure

```
v7/app/
├── routes.ts           # Central route config + visibility
├── AuthContext.mock.tsx# Mocked user/role for development
├── Navigation.tsx      # Role-aware sidebar nav
├── AppRouter.tsx       # React Router definitions
└── AppShell.tsx        # Main layout wrapper

v7/pages/
├── DashboardPage.tsx   # All roles
├── DictationPage.tsx   # provider, assistant, practice_admin
├── CasesPage.tsx       # provider, assistant, practice_admin
├── SettingsPage.tsx    # practice_admin, provider
├── TeamPage.tsx        # practice_admin
└── AdminPage.tsx       # software_admin only
```

## Navigation Visibility Matrix

| Route      | software_admin | org_admin | practice_admin | provider | assistant |
|------------|:--------------:|:---------:|:--------------:|:--------:|:---------:|
| dashboard  | ✅              | ✅         | ✅              | ✅        | ✅         |
| dictation  | ❌              | ❌         | ✅              | ✅        | ✅         |
| cases      | ❌              | ❌         | ✅              | ✅        | ✅         |
| settings   | ❌              | ❌         | ✅              | ✅        | ❌         |
| team       | ❌              | ❌         | ✅              | ❌        | ❌         |
| admin      | ✅              | ❌         | ❌              | ❌        | ❌         |

## Development Usage

```tsx
// To test different roles, change DEFAULT_MOCK_ROLE in AuthContext.mock.tsx
// Or use the role switcher dropdown in the header

// To use the shell:
import { AppShell } from './app/AppShell';

function App() {
    return <AppShell />;
}
```

## Next Steps

### TODO: Integrate Existing V7

1. **DictationPage**: Import and render existing `DocudentV7` component
2. **Connect to real auth**: Replace `MockAuthProvider` with Firebase Auth

### TODO: Implement Pages

1. **SettingsPage**: Use `contracts/settingsValidator` + `settingsOverridesService`
2. **TeamPage**: Membership CRUD
3. **CasesPage**: Case list with filters
4. **DashboardPage**: Stats, recent cases, quick actions

### TODO: Real Auth

```tsx
// Replace MockAuthProvider with:
import { AuthProvider } from 'core/auth/AuthContext';

// Map Firebase claims to UIRole:
function mapClaimsToRole(claims): UIRole {
    if (claims.isSoftwareAdmin) return 'software_admin';
    if (claims.orgs?.[orgId]?.includes('org_admin')) return 'org_admin';
    // etc.
}
```

## Architecture Rules (Enforced)

- ✅ V7 UI imports only from `core/services/*` and `contracts/*`
- ✅ No direct Firestore access in UI components
- ✅ No v6 imports
- ✅ Pages are lazy-loadable
- ❌ No business logic in shell or pages

---

## Production Status (2025-12-17)

### ✅ DONE (Production Ready)

| Feature | Notes |
|---------|-------|
| **AppShell + Routing** | Lazy-loaded pages, role-aware navigation |
| **DictationPage** | Full pipeline: dictation → extraction → output |
| **SettingsPage** | 5 curated settings, real Firestore writes |
| **CasesPage** | List, filters, drawer, copy ID, review CTA |
| **TeamPage** | Member list, role pills, invite modal |
| **DashboardPage** | Hero, quick actions, activity feed |
| **Auth Foundation** | Real Firebase Auth, claims, forceRefreshClaims |
| **Custom Claims** | org/practice role mapping |
| **Invite System** | Create invite, copy link, accept flow |
| **Design Gates** | Jeton compliance enforced |

### 🧪 BETA (Functional, Needs Testing)

| Feature | Notes |
|---------|-------|
| **Case Review Engine** | Quality checks, findings UI |
| **Cloud Functions** | Not deployed yet, need `firebase deploy` |
| **Real Auth Mode** | Toggle `VITE_USE_MOCK_AUTH=false` to activate |

### 📋 PLANNED (Not Started)

| Feature | Notes |
|---------|-------|
| **AdminPage** | Impersonation, org list |
| **Real-time updates** | Firestore listeners for cases |
| **Provider docs** | Auto-created on invite accept |
| **Billing integration** | When billing engine is ready |

---

## Architecture Rules (ENFORCED)

```
✅ V7 imports only from core/services/* and contracts/*
✅ No direct Firestore access in v7/**
✅ No v6 imports in v7/**
✅ Pages are lazy-loadable
✅ All writes through core services
❌ No business logic in pages
```

---

## Running Gates

```bash
# Jeton design integrity
npm test src/docudent/__tests__/gates/gate-jeton-design-integrity.test.ts

# No Firestore in v7
grep -r "firebase/firestore" src/docudent/v7 | wc -l  # must be 0

# No core/billing in v7
grep -r "core/billing" src/docudent/v7 | wc -l        # must be 0
```
