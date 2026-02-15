# Chip Contract — V10 SSOT

## Categories

| Category | Definition | BillingRef Rule |
|----------|------------|-----------------|
| **COMMON_IDENTICAL** | Same chipId + billingRef + text across treatments | Must match |
| **COMMON_BILLING_ONLY** | Same chipId + billingRef, approved text drift | Must match |
| **TREATMENT_SPECIFIC** | ChipId unique to one treatment | N/A |

---

## Hard Rules

### Rule 1: Same ChipId ⇒ BillingRef Must Match
If `chip.id` exists in multiple treatment KBs, `billingRef` must be byte-identical.

**Enforced by**: `gate-m25-no-duplicate-concepts.test.ts`

### Rule 2: Text Drift Requires Approval
If `chip.id` exists in multiple KBs with different text:
- Must be in `textDriftAllowlist.json`
- Must have documented reason

**Enforced by**: `gate-m26-text-drift-explicit.test.ts`

### Rule 3: No Orphan Emit Rules
Every `emit_chip` target in `medical_kb.v1.json` must exist in at least one treatment KB.

**Enforced by**: `gate-m25-no-orphan-emit-rules.test.ts`

---

## Common Chips (7 total)

### COMMON_IDENTICAL (4)
| ChipId | BillingRef | Treatments |
|--------|------------|------------|
| vipr_pos | null | fuellung, endo |
| vipr_neg | null | fuellung, endo |
| perk_pos | null | fuellung, endo |
| perk_neg | null | fuellung, endo |

### COMMON_BILLING_ONLY (3)
| ChipId | BillingRef | Drift Reason |
|--------|------------|--------------|
| kofferdam | BEMA_12/GOZ_2040 | Fuellung: detail. Endo: sterility. |
| la_infiltr | BEMA_40/GOZ_0090 | Fuellung: OA ref. Endo: concise. |
| la_leitung | BEMA_41a/GOZ_0100 | Fuellung: timing. Endo: concise. |

---

## Canonical Source

Common chips have no single canonical source. Each treatment KB maintains its own copy.

**Future consideration**: If canonicalization is needed, introduce `common_chips.json` and:
1. Mark chips as `source: "canonical"` 
2. Gate to verify canonical copies are in sync

---

## Files

| File | Purpose |
|------|---------|
| `v10/qa/textDriftAllowlist.json` | Approved drift list |
| `docs/audit/chip_classification.latest.json` | Full classification |
| `docs/audit/chip_inventory.latest.json` | Chip counts |

---

## Verification

```bash
npx vitest run src/docudent/__tests__/gates/gate-m25*.test.ts \
  src/docudent/__tests__/gates/gate-m26*.test.ts \
  --reporter=verbose
```
