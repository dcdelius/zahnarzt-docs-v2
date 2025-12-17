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

## What Works Now (V7 Wiring Sprint)

| Page | Status | Notes |
|------|--------|-------|
| **DictationPage** | ✅ Functional | Lazy-loads DocudentV7Page (legacy) |
| **SettingsPage** | ✅ Functional | 5 curated settings, real Firestore write via service |
| **CasesPage** | ✅ Functional | Case list with filters, drawer, copy-ID |
| **Case Review** | ✅ Functional | Quality check with findings (Beta) |
| **TeamPage** | 🟡 Stub | Mock providers/rooms, Coming Soon buttons |
| **AdminPage** | 🟡 Stub | Impersonate via header, org list placeholder |
| **DashboardPage** | ✅ Functional | Hero + quick actions |

### New Components (N7-N9)

- `core/case/caseRepository.ts` — Query layer for case listing
- `core/review/caseReviewEngine.ts` — Quality/compliance rules
- `core/auth/AuthContext.tsx` — Real Firebase auth
- `core/auth/mapClaimsToRole.ts` — Claims to UIRole mapping
- `v7/hooks/useCases.ts` — Hook for case loading
- `JetonToast`, `SettingsForm`, `useSettingsService` — (N4-N6)

---

## What's Next

1. **Real Auth**: Replace MockAuthProvider with Firebase Auth
2. **CasesPage**: Case list with filters
3. **Billing**: Beta features when ready

---

## Running Gate Tests

```bash
npm test src/docudent/__tests__/gates/gate-jeton-design-integrity.test.ts
```

Checks:
- No card grids, no raw hex colors, no magic motion durations
- All pages import designTokens
- Legacy DocudentV7Page is excluded

