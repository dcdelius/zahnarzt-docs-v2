# Connection Matrix — Docudent V7 Wiring Audit

**Generated**: 2024-12-18  
**Source**: Code analysis via ripgrep + file tracing

---

## TABLE A — Route → Component → File

| Route | Mounted Component | File Path | Wrapper | Uses V7 Shell? | Notes |
|-------|-------------------|-----------|---------|----------------|-------|
| `/docudent` | V7ShellEntry | `v7/app/V7ShellEntry.tsx` | None (outside Layout) | ✅ YES | Catches exact match |
| `/docudent/*` | V7ShellEntry | `v7/app/V7ShellEntry.tsx` | None (outside Layout) | ✅ YES | Wildcard for all V7 |
| `/docudent/v6` | DocudentV6Page | `v6/pages/DocudentV6Page.tsx` | Layout.jsx | ❌ NO | Inside legacy Layout |
| `/docudent/v5` | DocudentV5Page | `v5/pages/DocudentV5Page.tsx` | Layout.jsx | ❌ NO | Inside legacy Layout |
| `/` | Login | `App.jsx` inline | Layout.jsx | ❌ NO | Login page |
| `/home` | HomePage | `pages/HomePage.tsx` | Layout.jsx | ❌ NO | Legacy home |
| `/dashboard` | Redirect → /home | N/A | N/A | N/A | Legacy redirect |

---

## TABLE B — V7 Internal Routes (from routes.ts)

| Route Path | Label | Component | Nav Group | Badge |
|------------|-------|-----------|-----------|-------|
| `/dashboard` | Dashboard | DashboardPage | workflow | - |
| `/dictation` | Diktat | DictationPage | workflow | - |
| `/cases` | Fälle | CasesPage | workflow | - |
| `/settings` | Einstellungen | SettingsPage | organisation | - |
| `/team` | Team | TeamPage | organisation | - |
| `/billing` | Abrechnung | BillingBetaPage | finance | beta |
| `/admin` | Admin | AdminPage | system | - |
| `/onboarding` | - | OnboardingPage | (public) | - |
| `/accept-invite` | - | AcceptInvitePage | (public) | - |

⚠️ **CRITICAL BUG**: routes.ts paths are `/dashboard` not `/docudent/dashboard`!

---

## TABLE C — Component → Token Usage

| Component/File | Uses designTokens? | Uses framer-motion? | Uses glass tokens? | Notes |
|----------------|-------------------|---------------------|-------------------|-------|
| V7ShellEntry.tsx | ✅ YES | ✅ YES | ✅ YES | Full shell |
| DashboardPage.tsx | ✅ YES | ✅ YES | ✅ YES | Jeton hero |
| SettingsPage.tsx | ✅ YES | ✅ YES | ✅ YES | Settings form |
| TeamPage.tsx | ✅ YES | ✅ YES | ✅ YES | Team list |
| Navigation.tsx | ✅ YES | ✅ YES | ❌ NO | Sidebar nav |
| CasesPage.tsx | ✅ YES | ✅ YES | ✅ YES | Case list |

---

## TABLE D — Navigation → Route Coverage

| Nav Item | Target Path | In routes.ts? | Route Mounted? | Notes |
|----------|-------------|---------------|----------------|-------|
| Dashboard | /dashboard | ✅ YES | ⚠️ MISMATCH | Path missing /docudent prefix |
| Diktat | /dictation | ✅ YES | ⚠️ MISMATCH | Path missing /docudent prefix |
| Fälle | /cases | ✅ YES | ⚠️ MISMATCH | Path missing /docudent prefix |
| Einstellungen | /settings | ✅ YES | ⚠️ MISMATCH | Path missing /docudent prefix |
| Team | /team | ✅ YES | ⚠️ MISMATCH | Path missing /docudent prefix |
| Abrechnung | /billing | ✅ YES | ⚠️ MISMATCH | Path missing /docudent prefix |

---

## TABLE E — Domain Engines (Canonical Codes)

| Domain | SSOT Vocab | Parser | Playbook | Renderer | Validation | Golden Vectors |
|--------|------------|--------|----------|----------|------------|----------------|
| Endo | `core/endo/vocab/endoCanonicalVocab.ts` | `playbooks/endo/endoSignalParser.ts` | `playbooks/endo/endoPlaybookV1.ts` | `playbooks/endo/endoTextRenderer.ts` | `questionEngine/fieldValidation.ts` | `endoGoldenVectors.test.ts` |
| Filling | `core/filling/vocab/fillingCanonicalVocab.ts` | `core/filling/fillingSignalParser.ts` | `core/filling/fillingPlaybookV1.ts` | `core/filling/fillingTextRenderer.ts` | `questionEngine/fieldValidation.ts` | `fillingGoldenVectors.test.ts` |

---

## PATH PREFIX BUG ANALYSIS

**Root Cause**: routes.ts defines paths as `/dashboard` but V7ShellEntry is mounted at `/docudent/*`.

**Effect**: When user clicks "Dashboard" in nav, browser goes to `/dashboard` which:
1. Does NOT match `/docudent/*` pattern
2. Falls through to legacy Layout routes
3. Hits redirect `/dashboard` → `/home`
4. User sees legacy Home page instead of V7 Dashboard

**Evidence**:
```typescript
// routes.ts line 87-93
{
    path: '/dashboard',  // ← MISSING /docudent prefix!
    label: 'Dashboard',
    component: DashboardPage,
    ...
}
```

**Fix Required**: Either:
- A) Add `/docudent` prefix to all routes.ts paths
- B) OR use relative paths in V7ShellEntry routing
