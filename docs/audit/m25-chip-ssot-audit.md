# M25 Chip SSOT Audit Report

## Executive Summary

✅ **No Critical Collisions Found**  
✅ **No Concept Duplicates Found**  
✅ **All 4 Gates Pass**

All common chips across treatments have **identical billingRefs**. Text snippet differences exist for 3 chips but are cosmetic - billing integrity is preserved.

---

## Inventory Summary

| Metric | Value |
|--------|-------|
| Registered Packs | 2 (fuellung, endo) |
| Total Chips | 43 |
| Unique ChipIds | 36 |
| Common Chips | 7 |
| BillingRef Collisions | **0** |
| Concept Duplicates | **0** |

### Pack Details

| Pack | Total Chips | Billing Chips | Coverage |
|------|-------------|---------------|----------|
| fuellung | 17 | 7 | 100% |
| endo | 26 | 17 | 100% |

---

## Common Chips Analysis

These chips appear in both fuellung and endo treatments:

| ChipId | BillingRef GKV | BillingRef PKV | Billing Match | Text Drift |
|--------|----------------|----------------|---------------|------------|
| `kofferdam` | BEMA_12 | GOZ_2040 | ✅ | ⚠️ Different long text |
| `la_infiltr` | BEMA_40 | GOZ_0090 | ✅ | ⚠️ Different long text |
| `la_leitung` | BEMA_41a | GOZ_0100 | ✅ | ⚠️ Different long text |
| `perk_neg` | - | - | ✅ | ✅ Identical |
| `perk_pos` | - | - | ✅ | ✅ Identical |
| `vipr_neg` | - | - | ✅ | ✅ Identical |
| `vipr_pos` | - | - | ✅ | ✅ Identical |

### Text Drift Details

> [!NOTE]
> Text drift is cosmetic. BillingRefs match, so billing is safe.

#### kofferdam

| Treatment | textSnippets.lang |
|-----------|-------------------|
| fuellung | "Absolute Trockenlegung durch sorgfältiges Anlegen von Kofferdam mit anatomisch angepasster Klammer unter Sichterhaltung des Operationsfeldes." |
| endo | "Anlegen von Kofferdam zur absoluten Trockenlegung und Keimreduktion." |

#### la_leitung

| Treatment | textSnippets.lang |
|-----------|-------------------|
| fuellung | "Leitungsanästhesie des N. alveolaris inf. mit Ultracain D-S 1,7ml (Articain 4% + Adrenalin 1:200.000); Wirkungseintritt nach ca. 3 min." |
| endo | "Leitungsanästhesie des N. alveolaris inf. mit Ultracain D-S 1,7ml." |

#### la_infiltr

| Treatment | textSnippets.lang |
|-----------|-------------------|
| fuellung | "Nach Oberflächenanästhesie Infiltrationsanästhesie mit Ultracain D-S 1,7ml (Articain 4% + Adrenalin 1:200.000)." |
| endo | "Infiltrationsanästhesie mit Ultracain D-S 1,7ml." |

---

## Billing Shared Groups

These are chips that **legitimately share** billing codes (not duplicates):

| Billing Code | Chips | Reason |
|--------------|-------|--------|
| BEMA_Ä925a / GOZ_5000 | roentgen_einzelzahn, laengenmessung_roentgen, roentgen_kontrolle | Same X-ray code, different clinical purposes |
| BEMA_32 / GOZ_2410 | kanalaufbereitung_1/2/3/4 | Per-canal billing, different canal counts |
| BEMA_34 / GOZ_2440 | wf_kalt, wf_warm, wf_einzel | Per-canal filling, different techniques |

---

## Gates Created

| Gate | Purpose | Status |
|------|---------|--------|
| `gate-m25-no-chipid-collision` | BillingRef must match for common chips | ✅ Pass |
| `gate-m25-common-chip-set-snapshot` | Track common chips, detect new ones | ✅ Pass |
| `gate-m25-pack-coverage-still-100` | All packs must stay at 100% coverage | ✅ Pass |
| `gate-m25-no-duplicate-concepts` | No hidden duplicates (same meaning, different IDs) | ✅ Pass |

---

## Verification Commands

```bash
# Run all M25 gates
npx vitest run src/docudent/__tests__/gates/gate-m25*.test.ts --reporter=verbose

# Verify no regression on M18-M24
npx vitest run src/docudent/__tests__/gates/gate-m18*.test.ts \
  src/docudent/__tests__/gates/gate-m19*.test.ts \
  src/docudent/__tests__/gates/gate-m20*.test.ts \
  src/docudent/__tests__/gates/gate-m21*.test.ts \
  src/docudent/__tests__/gates/gate-m22*.test.ts \
  src/docudent/__tests__/gates/gate-m23*.test.ts \
  src/docudent/__tests__/gates/gate-m24*.test.ts \
  --reporter=dot
```

---

## Recommendation

**No immediate action required.**

Text drift is acceptable for now. If unified text is desired later:
1. Create a shared `common_chips.json` in `core/billing/knowledgeBase/common/`
2. Import into treatment KBs
3. Update gates to enforce single source

---

## Definition of Done

- [x] Audit Report + Inventory generated
- [x] No ChipId Collisions (billingRef matches)
- [x] No Concept Duplicates found
- [x] No new Allowlists, Pack Coverage remains 100%
- [x] All 4 M25 Gates pass
- [x] All M18-M24 Gates remain green
- [x] No UI changes
