# Wiring Report — V7 UI Mounting Audit

**Generated**: 2024-12-18  
**Status**: PATH PREFIX BUG IDENTIFIED

---

## Executive Summary

V7ShellEntry **IS** mounted correctly at `/docudent/*` and **IS** using designTokens + Navigation + routes.ts. However, **navigation links break** because routes.ts paths lack the `/docudent` prefix, causing clicks to exit the V7 shell.

---

## 1. Root Router Map

**File**: `src/App.jsx`

```jsx
// Lines 126-152
<Routes>
  {/* V7 routes - OUTSIDE Layout */}
  <Route path="/docudent" element={<V7ShellEntry />} />
  <Route path="/docudent/*" element={<V7ShellEntry />} />
  
  {/* Legacy routes - INSIDE Layout */}
  <Route element={<Layout />}>
    <Route path="/" element={<Login />} />
    <Route path="/home" element={<HomePage />} />
    <Route path="/docudent/v6" element={<DocudentV6 />} />
    <Route path="/docudent/v5" element={<DocudentV5 />} />
    <Route path="/dashboard" element={<Navigate to="/home" />} />
  </Route>
</Routes>
```

**Verdict**: ✅ V7 routing is correct (outside Layout).

---

## 2. V7 Wiring Proof

### 2.1 V7ShellEntry Imports

**File**: `src/docudent/v7/app/V7ShellEntry.tsx`

```typescript
// Lines 14-18
import { Navigation } from './Navigation';
import { ROUTES, PUBLIC_ROUTES, getDefaultRoute } from './routes';
import { MockAuthProvider, useAuth } from './AuthContext.mock';
import { colors, gradients, space, radii, typography, glass, shadows, motion as motionTokens } from './designTokens';
```

**Verdict**: ✅ All correct imports.

### 2.2 Route Mapping

```typescript
// Lines 323-334
{ROUTES.map((route) => (
    <Route
        key={route.path}
        path={route.path}  // ← Uses path from routes.ts directly
        element={
            <PageWrapper>
                <route.component />
            </PageWrapper>
        }
    />
))}
```

**Verdict**: ⚠️ Uses routes.ts paths directly (which lack `/docudent` prefix).

### 2.3 Navigation Derivation

**File**: `src/docudent/v7/app/Navigation.tsx`

```typescript
// Lines 22-24
const { role } = useAuth();
const groupedRoutes = getGroupedRoutes(role);
// ... renders NavLink to={route.path}
```

**Verdict**: ✅ Navigation derives from routes.ts (not hardcoded).

---

## 3. THE BUG: Path Prefix Mismatch

### Evidence

**routes.ts** (line 87):
```typescript
{
    path: '/dashboard',  // ← Path is /dashboard
    label: 'Dashboard',
    ...
}
```

**Navigation.tsx** (line 76):
```typescript
<NavLink to={route.path}>  // ← Links to /dashboard
```

**App.jsx** (line 148):
```typescript
<Route path="/dashboard" element={<Navigate to="/home" replace />} />
// ← /dashboard is a LEGACY redirect to /home!
```

### What Happens

1. User visits `/docudent` → V7ShellEntry loads ✅
2. User clicks "Dashboard" in sidebar → Browser navigates to `/dashboard`
3. `/dashboard` does NOT match `/docudent/*` pattern
4. Falls through to legacy Layout routes
5. Hits redirect: `/dashboard` → `/home`
6. User sees legacy HomePage instead of V7 DashboardPage

### Impact

All V7 navigation links are broken:
- `/dashboard` → redirects to `/home`
- `/settings` → 404 or falls through
- `/team` → 404 or falls through
- `/billing` → 404 or falls through

---

## 4. UI Style Gate Audit

### 4.1 Global CSS

**File**: `src/index.css`

```css
body {
  @apply bg-gray-50 text-gray-900 antialiased;
}
```

**Impact**: Body has light gray background (`bg-gray-50`). V7 needs to override with its own background.

**Verdict**: ⚠️ Potential issue if V7 container doesn't cover full viewport.

### 4.2 Layout.jsx (Legacy)

**File**: `src/components/Layout.jsx`

```jsx
// Lines 16-19
const isDarkPage = location.pathname === '/docudent' ||
    location.pathname.startsWith('/docudent/v6') ||
    location.pathname.startsWith('/docudent/v7');
```

**Verdict**: ✅ isDarkPage check is correct, but V7 is outside Layout anyway so this doesn't apply.

### 4.3 V7 DesignTokens Usage

All V7 components properly use designTokens:
- `V7ShellEntry.tsx`: `gradients.background`, `glass.sidebar`, `glass.header`
- `DashboardPage.tsx`: `colors.textPrimary`, `gradients.primary`
- `Navigation.tsx`: `colors`, `gradients`, `typography`

**Verdict**: ✅ Token usage is correct.

---

## 5. TOP 5 ROOT CAUSES (Ranked)

### #1 — Path Prefix Mismatch ⚠️ CRITICAL

**Evidence**: `routes.ts` paths lack `/docudent` prefix.
**Impact**: All navigation breaks on click.
**Fix**: Add `/docudent` prefix to all paths in routes.ts.

```typescript
// routes.ts - BEFORE
path: '/dashboard'

// routes.ts - AFTER  
path: '/docudent/dashboard'
```

### #2 — Legacy /dashboard Redirect Interference

**Evidence**: `App.jsx` line 148: `/dashboard` → `/home`
**Impact**: Even if user manually types `/dashboard`, they get redirected to legacy home.
**Fix**: Remove or update this redirect after fixing #1.

### #3 — Body Background (Minor)

**Evidence**: `index.css`: `body { @apply bg-gray-50 }`
**Impact**: Light gray may show through if V7 container doesn't cover viewport.
**Fix**: V7ShellEntry sets `height: 100vh` so this should be covered.

### #4 — Navigation Uses Absolute Paths

**Evidence**: `Navigation.tsx` uses `<NavLink to={route.path}>` with absolute paths.
**Impact**: Clicking nav exits V7 shell context if paths don't match.
**Fix**: Paths in routes.ts must be absolute and match App.jsx patterns.

### #5 — No Error Boundaries

**Evidence**: If V7 component throws, entire shell crashes silently.
**Impact**: User might see loading spinner indefinitely.
**Fix**: Add error boundary to V7ShellEntry.

---

## 6. Verification Steps

### Before Fix

1. Visit `http://localhost:5173/docudent`
2. Observe: "V7 SHELL ACTIVE ✓" badge visible
3. Click "Dashboard" in sidebar
4. Observe: URL changes to `/dashboard`, shows legacy home page
5. **Bug confirmed**: Navigation breaks

### After Fix (Expected)

1. Visit `http://localhost:5173/docudent`
2. Observe: "V7 SHELL ACTIVE ✓" + "DASHBOARD ✓" badges
3. Click "Dashboard" in sidebar
4. Observe: URL is `/docudent/dashboard`, V7 dashboard loads
5. Click "Settings" → URL is `/docudent/settings`, V7 settings loads

---

## 7. Recommended Fix

Update `routes.ts` to use `/docudent` prefixed paths:

```typescript
// routes.ts
export const ROUTES: RouteConfig[] = [
    {
        path: '/docudent/dashboard',  // ← Add prefix
        label: 'Dashboard',
        ...
    },
    {
        path: '/docudent/dictation',  // ← Add prefix
        label: 'Diktat',
        ...
    },
    // ... etc
];
```

And update V7ShellEntry root redirect:
```typescript
<Route path="/" element={<Navigate to="/docudent/dashboard" replace />} />
```

---

## 8. Files to Modify

1. `src/docudent/v7/app/routes.ts` — Add `/docudent` prefix to all paths
2. `src/App.jsx` — Remove legacy `/dashboard` redirect (optional)
