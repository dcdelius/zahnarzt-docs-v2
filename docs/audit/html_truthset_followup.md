# HTML Truthset Follow-Up: GOZ Exclusion Rules Integration

**Date:** 2025-12-23  
**Source:** `html_extract_v2.json` (SHA-256: `1301a6c81a8b4e50afa403a070762d03e069a55b9be2c725f274962dc6724403`)

## Summary

Based on the HTML Truth Audit (`html_vs_db_diff.md`), 5 high-severity GOZ exclusion rules were identified as **missing in DB** but present in the HTML source. These rules have now been materialized in `combinability_kb.v1.json`.

---

## Rules Added

| Rule ID | Primary Code | Scope | Blocked Codes | Source Anchor |
|---------|--------------|-------|---------------|---------------|
| `regel_goz2012_nicht_neben_impl_kfo` | PHANTOM_REMOVED | TOOTH | 2410, 2440, 3090, 9010, 9040, 9120, 9130 | `GOZ:PHANTOM_REMOVED:c55f6ec7a03d` |
| `regel_goz2390_nicht_neben_endo` | GOZ_2390 | TOOTH | 2440, 3110, 3120 | `GOZ:GOZ_2390:d088214320f3` |
| `regel_goz3100_nicht_neben_chir` | GOZ_3100 | SESSION | 3000, 3030-3090 | `GOZ:GOZ_3100:38ead7e2b717` |
| `regel_goz9050_nicht_neben_impl_fal` | GOZ_9050 | SESSION | 3000, 3100, 3120, 8010-8250 | `GOZ:GOZ_9050:8d70163c93fe` |
| `regel_goz9110_nicht_neben_sinus` | GOZ_9110 | TOOTH | 9120, 9130 | `GOZ:GOZ_9110:5992291c599f` |

---

## Rule Details

### 1️⃣ PHANTOM_REMOVED — Nicht neben Implantat-/KFO-Leistungen

- **Scope:** TOOTH
- **Blocked:** GOZ_2410, GOZ_2440, GOZ_3090, GOZ_9010, GOZ_9040, GOZ_9120, GOZ_9130
- **Rationale:** Multi-surface restoration codes are mutually exclusive with implant preparation and KFO anchoring codes.

### 2️⃣ GOZ_2390 — Nicht neben bestimmten Endo-Leistungen

- **Scope:** TOOTH
- **Blocked:** GOZ_2440, GOZ_3110, GOZ_3120
- **Rationale:** Electric pulp length measurement cannot be combined with root canal completion or surgical endo codes.

### 3️⃣ GOZ_3100 — Nicht neben Chirurgie-Codes 3000-3090

- **Scope:** SESSION
- **Blocked:** GOZ_3000, GOZ_3030, GOZ_3040, GOZ_3050, GOZ_3060, GOZ_3070, GOZ_3080, GOZ_3090
- **Rationale:** Plastic surgery coverage code (3100) is mutually exclusive with other wound/surgery codes in same session.

### 4️⃣ GOZ_9050 — Nicht neben Implantat-/FAL-Leistungen

- **Scope:** SESSION
- **Blocked:** GOZ_3000, GOZ_3100, GOZ_3120, GOZ_8010-8250
- **Rationale:** Implant abutment screw operations (9050) cannot be combined with functional analysis or other surgical codes.

### 5️⃣ GOZ_9110 — Nicht neben Sinuslift-Leistungen

- **Scope:** TOOTH
- **Blocked:** GOZ_9120, GOZ_9130
- **Rationale:** Closed sinus elevation (9110) is mutually exclusive with open sinus elevation codes (9120, 9130) for same implant cavity.

---

## Technical Details

- **Priority:** 2000 (below existing rules at 1000)
- **Schweregrad:** regress (highest severity)
- **Marker:** `"added_from_html_truthset": true`
- **JSON Path:** `src/docudent/v10/kb/combinability/combinability_kb.v1.json`

---

## Gate Tests

| Test File | Purpose |
|-----------|---------|
| `gate-truthset-highseverity-goz-blocks.test.ts` | Verify each rule blocks the correct codes |
| `gate-truthset-highseverity-goz-determinism.test.ts` | Verify consistent loading across 30 iterations |
| `gate-truthset-highseverity-goz-sources-present.test.ts` | Verify sourceRefs are valid and complete |

**Run command:**
```bash
npx vitest run --reporter=verbose src/docudent/__tests__/gates/gate-truthset*.test.ts
```

---

## Verification

After this integration, re-running the HTML audit should show:
- High-severity gaps reduced from 5 to 0
- Verdict upgraded from PARTIAL to closer to SOLID
