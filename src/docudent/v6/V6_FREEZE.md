# V6 Freeze Contract

> **STATUS: FROZEN** ❄️
> **Effective Date: 2025-12-17**

## Why V6 is Frozen

V6 was the previous-generation pipeline implementation. It has been superseded by:
- **V7 Pipeline** for UI orchestration
- **CORE Services** for business logic

V6 remains in the codebase **only** as a transitional dependency via CORE facades.
No new development, bug fixes, or feature additions are permitted in V6.

---

## What is Allowed

| Action | Allowed | Via |
|--------|---------|-----|
| Read V6 source code | ✅ | Direct file access |
| Import from V6 | ✅ | **ONLY via** `core/services/` facades |
| Reference V6 for analysis | ✅ | Historical context only |

---

## What is Forbidden

| Action | Status | Reason |
|--------|--------|--------|
| Modify V6 files | ❌ FORBIDDEN | Frozen codebase |
| Add new exports to V6 | ❌ FORBIDDEN | Feature creep |
| Add new imports to V6 | ❌ FORBIDDEN | Increasing entanglement |
| Create tests that assert V6 behavior | ❌ FORBIDDEN | Tests should use CORE |
| Import V6 directly from V7 | ❌ FORBIDDEN | Must use core/services facade |
| Import V6 directly from CORE (except facades) | ❌ FORBIDDEN | Only core/services may import |

---

## Migration Strategy

### Current Architecture
```
V7 Pipeline → core/services (facade) → v6/services (frozen)
```

### Target Architecture
```
V7 Pipeline → core/services (native implementation)
```

### Migration Steps

1. **Clone V6 service into `core/services/impl/`**
2. **Update facade to import from `impl/` instead of `v6/`**
3. **Run parity tests**
4. **Delete V6 file only after parity confirmed**

Repeat for each service:
- [x] `extractionService` ✅ Ported to core/extraction (2025-12-17)
- [ ] `questionService`
- [ ] `outputService`

---

## Enforcement

This contract is enforced by:
- `gate-no-v6-mutation.test.ts` — fails CI if V6 is modified
- `gate-v7-ssot-boundaries.test.ts` — fails CI if V7 imports V6 directly

---

## Contact

For exceptions or questions, escalate to project architect.
