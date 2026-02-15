# Gates to Modules v3

**Generated**: 2025-12-26T16:40:00Z  
**Total Gate Files**: 139

---

## SSOT Gates (Chip/Billing Integrity)

| Gate | Module Protected | Invariant | Hard Rule |
|------|------------------|-----------|-----------|
| gate-m25-no-chipid-collision | unified.json | Common chips have identical billingRef | ✅ |
| gate-m25-common-chip-set-snapshot | unified.json | Common chip set stable | ✅ |
| gate-m25-no-duplicate-concepts | unified.json | No concept duplicates | ✅ |
| gate-m25-pack-coverage-still-100 | v10/packs | 100% billing coverage | ✅ |
| gate-m26-no-billing-mismatch | unified.json | No billingRef mismatch | ✅ |
| gate-m26-text-drift-explicit | textDriftAllowlist | Text drift approved | ❌ soft |
| gate-m26-emit-rules-target-valid-chips | medical_kb | No orphan emit rules | ✅ |
| gate-m26-common-chip-classification | unified.json | Classification stable | ❌ soft |

---

## Billing Gates

| Gate | Module Protected | Invariant |
|------|------------------|-----------|
| gate-billing-combinability | kombinationen.json | Combinability rules valid |
| gate-billing-no-legacy-imports-runtime | v10, v7 | No v6/_legacy imports |
| gate-billing-no-runtime-html-dependency | core/billing | No HTML in runtime |
| gate-billing-goae-lookup | kataloge/goa.json | GOÄ lookup works |
| gate-no-billing-without-confirmed-fact | runV10 | Billing needs confirmation |
| gate-no-text-drives-billing | renderFromKbChips | Text from KB only |

---

## Medical Gates

| Gate | Module Protected | Invariant |
|------|------------------|-----------|
| gate-medical-required-questions | medical_kb | Required askbacks fire |
| gate-medical-askbacks-override-when | medical_kb | Override conditions work |
| gate-endo-canonical-alignment | v7/medical | Endo IDs match |
| gate-endo-medical-golden | medical_kb | Endo goldens pass |
| gate-fuellung-question-logic | medical_kb | Fuellung logic correct |

---

## Pipeline Gates

| Gate | Module Protected | Invariant |
|------|------------------|-----------|
| gate-m17-endo-determinism-50x | runV10 | Deterministic output |
| gate-m21-determinism-50x-endo-core | runV10 | Core determinism |
| gate-m21-endo-false-positive-prevention | medical_kb | No false positives |
| gate-m22-no-false-positive-endo-billing | runV10 | Billing correctness |
| gate-p14-multiinstance-2teeth | runV10Bundle | Multi-tooth works |
| gate-p14-questions-retry-produces-output | runV10 | Retry flow works |
| gate-pipeline-questionbundle-always-present | runV10 | Bundle returned |

---

## Coverage Summary

| Category | Gate Count | Coverage |
|----------|------------|----------|
| SSOT/Chip | 8 | ✅ Full |
| Billing | 6 | ✅ Full |
| Medical | 5 | ✅ Full |
| Pipeline | 7 | ✅ Full |
| Other | 113 | — |

---

## Modules Without Gate Protection

| Module | Status | Risk |
|--------|--------|------|
| v10/trace/ | No gate | LOW (observability) |
| v10/compat/milchzahn | No gate | LOW |
| core/billing/knowledgeBase/logic/* | Partial | MEDIUM |

---

## Hard vs Soft Rules

| Type | Count | Examples |
|------|-------|----------|
| Hard (FAIL blocks merge) | 20+ | billing-mismatch, orphan-emit-rules |
| Soft (WARN only) | 5+ | text-drift-explicit |
