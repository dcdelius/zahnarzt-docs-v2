# Development Rules

> What must NEVER be done and where new code is allowed.

---

## 🚫 NEVER DO THESE

### 1. Never Import Commentary Files in UI

```typescript
// ❌ FORBIDDEN
import commentIndex from '../secondary/commentIndex_bema.json';

// ✅ ALLOWED
import thinIndex from '../secondary/commentIndex_analog_thin.json';
```

**Why:** Copyright infringement risk. Gate tests will fail.

---

### 2. Never Hardcode Billing Codes

```typescript
// ❌ FORBIDDEN
if (code === 'BEMA_13a') { ... }

// ✅ ALLOWED
const codeInfo = lookupBillingCode(code);
if (codeInfo?.kategorie === 'Konservierend') { ... }
```

**Why:** Codes change. Use catalog lookups from SSOT.

---

### 3. Never Move or Rename Core Files

These directories are **frozen**:

```
src/docudent/core/billing/knowledgeBase/
src/docudent/core/behandlungen/
src/docudent/v5/
src/docudent/v6/
src/docudent/v7/
```

**Why:** Breaks imports across the codebase. Requires full audit first.

---

### 4. Never Put Business Logic in V7 Page

```typescript
// ❌ FORBIDDEN in DocudentV7Page.tsx
const billingCodes = extracted.surfaces.map(s => inferCode(s));

// ✅ ALLOWED - Use pipeline
const result = await pipeline.run(input);
```

**Why:** V7 is a pure UI renderer. All logic lives in `pipeline/index.ts`.

---

### 5. Never Export Commentary Text

```typescript
// ❌ FORBIDDEN
const exportData = {
    code: 'GOZ-A',
    sections: card.sections,        // ❌ Copyright!
    evidenceSnippet: card.snippet   // ❌ Copyright!
};

// ✅ ALLOWED
const exportData = buildAnalogExportPayload(justifications);
```

**Why:** Legal liability. Use `analogExportGuard.ts`.

---

### 6. Never Bypass Gate Tests

```bash
# ❌ FORBIDDEN
npm test -- --skip gate-*

# ✅ REQUIRED before deploy
npm test -- --run gate-e2e-golden-dictations
npm test -- --run gate-no-comment-index-in-ui
npm test -- --run gate-build-smoke
```

**Why:** Gates are safety nets. All 3 must pass.

---

## ✅ WHERE NEW CODE IS ALLOWED

### Safe Locations

| Location | When to Use |
|----------|-------------|
| `src/docudent/v7/components/` | New V7 UI components |
| `src/docudent/v7/pipeline/` | New pipeline stages |
| `src/docudent/core/behandlungen/{treatment}/` | New treatment types |
| `src/components/ui/` | Shared UI components |
| `docs/architecture/` | Documentation |
| `scripts/` | One-time scripts (not imported) |

### Adding a New Treatment

1. Create folder: `src/docudent/core/behandlungen/{name}/`
2. Add definition: `{name}_unified.json`
3. Register in: `src/docudent/core/behandlungen/index.ts`
4. Add to catalog: `getTreatment('{name}')`

### Adding a New Gate Test

1. Create: `src/docudent/__tests__/gates/gate-{name}.test.ts`
2. Follow naming: `gate-{category}-{what}.test.ts`
3. Add to CI: Ensure it runs in pipeline

---

## Code Review Checklist

Before merging any PR:

- [ ] No imports from `_legacy/`
- [ ] No direct `commentIndex_*.json` imports in UI
- [ ] No hardcoded billing codes
- [ ] No business logic in V7 page components
- [ ] All gate tests pass
- [ ] No new Firestore writes without review

---

## File Ownership

| Path | Owner | Stability |
|------|-------|-----------|
| `src/docudent/core/` | Billing Team | 🔒 Frozen |
| `src/docudent/v5/` | V5 Team | 🔒 Frozen |
| `src/docudent/v6/` | V6 Team | ⚠️ Maintenance |
| `src/docudent/v7/` | V7 Team | 🟢 Active |
| `src/_legacy/` | Nobody | 💀 Dead |
| `docs/` | Everyone | 📝 Open |

---

## Quick Reference

```bash
# Check if file is safe to modify
grep -r "from.*{filename}" src/

# Check for forbidden imports
npm test -- --run gate-no-comment-index-in-ui

# Check billing logic changes
npm test -- --run gate-e2e-golden-dictations

# Before deploy
npm test -- --run gate-*
```
