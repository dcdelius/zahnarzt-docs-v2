# Debug Billing Playbook

Consolidated guide for debugging billing, combinability, and completeness issues.

## Quick Reference

| Issue | Where to Look |
|-------|---------------|
| Missing billing code | `meta.billingCompleteness.missing` |
| Code was dropped | `meta.combinability.droppedCodes` |
| MKV channelization | Check `mehrkostenConfirmed` / `nurKasse` flags |
| Origin unknown | `meta.billingCompleteness.origins` |

## Step-by-Step Debug

### 1. Run with DEV mode

```typescript
const result = await runV10({
    dictation: 'Your dictation here',
    treatmentId: 'fuellung',
    insuranceType: 'GKV',
    textLength: 'mittel',
});
```

### 2. Check Billing Completeness

```typescript
console.log(result.meta.billingCompleteness);
// { isComplete: true/false, missing: [...], origins: [...] }
```

### 3. Check Combinability

```typescript
console.log(result.meta.combinability);
// { verdict, conflicts, droppedCodes, kbVersion }
```

---

## Common Error Patterns

### Pattern 1: "Code Missing from Output"

**Symptom:** Expected billing code not in `output.billingCodes`

**Debug:**
1. Check `meta.combinability.droppedCodes` → was it dropped by autoResolve?
2. Check `meta.billingCompleteness.origins` → was it ever generated?
3. Check chip's `billingRef` in unified.json → correct branch for insuranceType?

**Fix:**
- If dropped: Review combinability rule, adjust `autoResolve` policy
- If never generated: Check KB concepts → chip emission conditions

---

### Pattern 2: "isComplete: false"

**Symptom:** `meta.billingCompleteness.isComplete === false`

**Debug:**
```typescript
console.log(result.meta.billingCompleteness.missing);
// [{ instanceId, reason, hint }]
```

**Common causes:**
- Chip missing `billingRef` for insuranceType
- `surface_mapping` missing branch
- Code generated outside of KB (hardcoded somewhere)

**Fix:**
- Add missing `billingRef` branch to chip in unified.json
- Add missing `surface_mapping` entry

---

### Pattern 3: "MKV Shows Wrong Codes"

**Symptom:** GOZ codes appear for base services (LA, Kofferdam) in MKV

**Debug:**
1. Check facts: `mehrkostenConfirmed`, `nurKasse`
2. Check chip's `billingRef` → should have `GKV` (not `MKV`) for base services
3. Check renderer logic: LA/Kofferdam use GKV branch even in MKV

**Rules:**
| Service | MKV Billing |
|---------|-------------|
| LA, Kofferdam, Cp | Use GKV branch (BEMA) |
| Addon chips (Mehrschicht) | Use MKV branch (GOZ) if `mehrkostenConfirmed` |
| F-codes | BEMA base + GOZ addon if `mehrkostenConfirmed` |

**Fix:**
- Ensure chip `billingRef` has NO `MKV` branch for base services
- Check `nurKasse` flag → if true, no GOZ at all

---

### Pattern 4: "Unexpected BLOCK Error"

**Symptom:** `state === 'error'` with combinability message

**Debug:**
```typescript
console.log(result.meta.combinability);
// verdict: 'BLOCK', conflicts: [{ ruleId, codesInvolved }]
```

**Fix:**
- Find rule in `combinability_kb.v1.json`
- Add `autoResolve: "drop_anchor"` or `"drop_blockwith"`
- Update source rules: `src/docudent/core/billing/knowledgeBase/regeln/kombinationen.json`
- Regenerate runtime KB via `src/docudent/v10/kb/combinability/compiler.ts` → `src/docudent/v10/kb/combinability/combinability_kb.v1.json`

---

## Gate Commands

```bash
# Run all gates
npm test -- --run src/docudent/v10/__tests__/gates

# Run Fuellung gates only
npm test -- --run src/docudent/v10/__tests__/gates/gate-fuellung

# Run with verbose output
npm test -- --run gate-fuellung-billing-complete --reporter=verbose
```

## Key Files

| File | Purpose |
|------|---------|
| `meta.billingCompleteness` | Origin tracking |
| `meta.combinability` | Conflict + droppedCodes |
| `unified.json` | Chip definitions + billingRef |
| `combinability_kb.v1.json` | Compiled rules |
