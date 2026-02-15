# Audit.Billing.md — Billing & Catalog Verification

**Generated:** 2025-12-30  
**Status:** ✅ VERIFIED

---

## 1. Catalog Summary

| Catalog | File | Lines | Entries |
|---------|------|-------|---------|
| BEMA (GKV) | `kataloge/bema.json` | 5273 | 615 |
| GOZ (PKV) | `kataloge/goz.json` | 2115 | 221 |
| BEL II | `kataloge/bel2_2022.json` | 1947 | ~300 |
| GOÄ | `kataloge/goa.json` | 458 | ~50 |
| Festzuschüsse | `kataloge/festzuschuesse.json` | 183 | ~20 |

---

## 2. BillingRef Coverage

### GKV Codes (BEMA) Referenced in unified.json:
| Code | In Catalog? | Used By |
|------|-------------|---------|
| BEMA_12 | ✅ OK | Kofferdam |
| BEMA_13 | ✅ OK | Füllung 1F |
| BEMA_13b | ✅ OK | Füllung 2F |
| BEMA_13c | ✅ OK | Füllung 3F |
| BEMA_13d | ✅ OK | Füllung 4+F |
| BEMA_25 | ✅ OK | Cp (indirect capping) |
| BEMA_26 | ✅ OK | P (direct capping) |
| BEMA_31 | ✅ OK | Trepanation |
| BEMA_32 | ✅ OK | Kanalaufbereitung |
| BEMA_34 | ✅ OK | Wurzelfüllung |
| BEMA_35 | ✅ OK | Med. Einlage |
| BEMA_40 | ✅ OK | LA Infiltration |
| BEMA_41a | ✅ OK | LA Leitung |
| BEMA_Ä925a | ✅ OK | Röntgen |
| BEMA_IP4 | ✅ OK | Fluoridierung |
| BEMA_107 | ✅ OK | Extraction |
| BEMA_107a | ✅ OK | Extraction |

### PKV Codes (GOZ) Referenced in unified.json:
| Code | In Catalog? | Used By |
|------|-------------|---------|
| GOZ_0080 | ✅ OK | Oberflächenanästhesie |
| GOZ_0090 | ✅ OK | LA Infiltration |
| GOZ_0100 | ✅ OK | LA Leitung |
| GOZ_1020 | ✅ OK | Fluoridierung |
| GOZ_1040 | ✅ OK | PZR |
| GOZ_2040 | ✅ OK | Kofferdam |
| GOZ_2060 | ✅ OK | Füllung 1F |
| GOZ_2080 | ✅ OK | Füllung 2F |
| GOZ_2100 | ✅ OK | Füllung 3F |
| GOZ_2120 | ✅ OK | Füllung 4+F |
| GOZ_2210 | ✅ OK | |
| GOZ_2260 | ✅ OK | |
| GOZ_2330 | ✅ OK | Cp |
| GOZ_2340 | ✅ OK | P |
| GOZ_2360 | ✅ OK | Endo Trep |
| GOZ_2400 | ✅ OK | Elektr. Längenmessung |
| GOZ_2410 | ✅ OK | Kanalaufbereitung |
| GOZ_2430 | ✅ OK | |
| GOZ_2440 | ✅ OK | Wurzelfüllung |
| GOZ_3000 | ✅ OK | Krone |
| GOZ_5000 | ✅ OK | Extraktion |

---

## 3. Eligibility Guard

**File:** `src/docudent/v10/pipeline/billingEligibilityGuard.ts`

### Implementation:
- Chips are classified by `factSources`: `dictation`, `user`, `settings`, `inferred`
- Only chips with `dictation`, `user`, or `settings` sources are billing-eligible
- `inferred` chips are **blocked** from billing

### Trace Output:
```json
{ "allowed": 5, "blocked": 1, "blockedChipIds": ["some_inferred_chip"] }
```

### ✅ Silent Drop Protection:
If billing is blocked, the trace explicitly shows:
- `billingGuard.blocked` count
- `billingGuard.blockedChipIds` array

---

## 4. Allowlist Status

**File:** `docs/system-atlas/artifacts/catalog-coverage/allowlist.json` (209 lines)

### Entries:
- ~30 entries for analog/placeholder codes
- Categories: `ANALOG_PLACEHOLDER`, `KNOWN_PATTERN`, `RULE_REFERENCE`, `UI_STUB`, `TEST_ARTIFACT`

### ⚠️ Observations:
- Some entries reference GOZ 8xxx codes (Implantology) with "should be added to catalog" notes
- These were marked as "action required" but not yet resolved

---

## 5. Summary

| Question | Answer |
|----------|--------|
| All BillingRefs in catalog? | ✅ YES (100% verified) |
| Phantom codes detected? | ✅ NO (0 phantom GOZ codes per previous audit) |
| Silent billing drops? | ✅ NO (billingGuard logs blocked chips) |
| Eligibility sources clear? | ✅ YES (dictation/user/settings) |
| Allowlist exists? | ⚠️ YES (some items need resolution) |
