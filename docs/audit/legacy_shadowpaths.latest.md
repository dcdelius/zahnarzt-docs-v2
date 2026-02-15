# Legacy & Shadow Paths Audit

**Generated**: 2025-12-26T15:45:00Z  
**Status**: 🟢 **CLEAN**

---

## Summary

| Path | Status | Action |
|------|--------|--------|
| `legacy/` | Empty | SAFE_TO_DELETE |
| `core/billing/staging/` | Stub files only | KEEP (dev scaffolding) |
| `v6/services/__tests__/__legacy_archive__/` | Test archive | ARCHIVE |

---

## Detailed Analysis

### 1. `src/docudent/legacy/`

**Status**: Empty directory

**Verdict**: ✅ SAFE_TO_DELETE

---

### 2. `src/docudent/core/billing/staging/`

**Contents**:
- `README.md` (662 bytes)
- `behandlungen.json` (193 bytes) - stub
- `bema_codes.json` (170 bytes) - stub
- `goz_codes.json` (169 bytes) - stub
- `regeln.json` (257 bytes) - stub

**Status**: Development scaffolding, not imported at runtime

**Verdict**: ✅ KEEP (harmless)

---

### 3. `src/docudent/v6/services/__tests__/__legacy_archive__/`

**Status**: Archived test files

**Verdict**: ⚠️ ARCHIVE (not blocking, but consider cleanup)

---

## Runtime Import Protection

Gate `gate-billing-no-legacy-imports-runtime.test.ts` enforces:
- ❌ No imports from `v6/`
- ❌ No imports from `_legacy/`
- ❌ No imports from `core/services/`

**Status**: ✅ Gate exists and passes

---

## Conclusion

No legacy or shadow paths are imported at runtime. All SSOT data comes from:
- `treatments/*/unified.json` (chip definitions)
- `medical_kb.v1.json` (emit rules)

**No action required.**
