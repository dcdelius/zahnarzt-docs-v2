# Billing DB Usage

**Generated**: 2025-12-26T16:25:00Z

---

## 1. Code Lookup Modules

| Module | File:Line | Catalog | Purpose |
|--------|-----------|---------|---------|
| treatmentEngine | `logic/treatmentEngine.ts:16-18` | bema.json, goz.json, goa.json | Main billing code lookup |
| bel2Catalog | `logic/bel2Catalog.ts:12` | bel2_2022.json | Lab codes lookup |
| renderFromKbChips | `v7/output/renderFromKbChips.ts:119-122` | unified.json | Chip→billingRef resolution |

---

## 2. Combinability Check Modules

| Module | File:Line | KB Used | Verdict Types |
|--------|-----------|---------|---------------|
| checkCombinabilityFromKb | `v10/billing/combinability/checkCombinabilityFromKb.ts` | kombinationen.json | PASS/WARN/BLOCK |
| checkCombinability | `core/billing/combinability/billingCombinabilityChecker.ts` | kombinationen.json | PASS/WARN/BLOCK |
| regelEngine | `logic/regelEngine.ts:64-76` | kombinationen.json | Rule evaluation |
| crossValidator | `logic/crossValidator.ts:12` | kombinationen.json | Cross-validation |
| billingValidation | `logic/billingValidation.ts:7` | kombinationen.json | Validation |

---

## 3. "Darf/Darf nicht" Artefacts

| Artifact | Path | Purpose |
|----------|------|---------|
| kombinationen.json | `regeln/kombinationen.json` | BLOCK/WARN rules |
| fuellung_regeln.json | `regeln/fuellung_regeln.json` | Treatment-specific rules |
| splitting_regeln.json | `regeln/splitting_regeln.json` | Splitting rules |

---

## 4. Billing Flow: Chip → Code → Validation

```
1. applyMedicalKb()
   → Emits chipIds based on facts
   
2. renderFromKbChips()
   → Looks up unified.json for each chipId
   → Returns billingRef (GKV/PKV/MKV codes)
   
3. applyBillingGuard()
   → Filters chips by provenance eligibility
   
4. checkCombinabilityFromKb()
   → Checks kombinationen.json
   → Returns verdict: PASS/WARN/BLOCK
   
5. Output
   → If BLOCK: state=error
   → If PASS/WARN: state=output with codes
```

---

## 5. Evidence Locations

### V10 Combinability (Primary Path)
```
v10/pipeline/runV10.ts:478-484
  → calls checkCombinabilityFromKb(billingCodes, context)
  → uses kombinationen.json via regelEngine
```

### V7 Multitreatment Combinability
```
v7/multitreatment/orchestrator.ts:176-179
  → calls checkCombinability(allCodeStrings, 'multi', insuranceType)
  → uses kombinationen.json via core/billing/combinability
```

### Renderer billingRef Lookup
```
v7/output/renderFromKbChips.ts:119-122
  → require() unified.json for fuellung/endo
  → Extracts chip.billingRef[insuranceType]
```

---

## 6. No Shadow DBs Proof

| Check | Result |
|-------|--------|
| Duplicate kombinationen.json | 0 |
| Duplicate unified.json loaders | Only authorized loaders |
| Legacy billing imports | 0 (gate enforced) |
