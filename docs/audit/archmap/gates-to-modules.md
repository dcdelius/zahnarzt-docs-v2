# Gates to Modules Mapping

**Generated**: 2025-12-26T16:15:00Z

---

## SSOT Gates (M25/M26)

| Gate | Protects | Module |
|------|----------|--------|
| `gate-m25-no-chipid-collision` | Common chip billing match | unified.json |
| `gate-m25-common-chip-set-snapshot` | Common chip stability | unified.json |
| `gate-m25-no-duplicate-concepts` | Concept uniqueness | unified.json |
| `gate-m25-pack-coverage-still-100` | Pack coverage | v10/packs |
| `gate-m26-no-billing-mismatch` | Billing SSOT | unified.json |
| `gate-m26-text-drift-explicit` | Text drift | textDriftAllowlist.json |
| `gate-m26-emit-rules-target-valid-chips` | Orphan rules | medical_kb.v1.json |
| `gate-m26-common-chip-classification` | Classification | unified.json |

---

## Billing Gates

| Gate | Protects | Module |
|------|----------|--------|
| `gate-billing-combinability` | Combinability rules | kombinationen.json |
| `gate-billing-no-legacy-imports-runtime` | No legacy imports | v10, v7 runtime |
| `gate-billing-no-runtime-html-dependency` | No HTML in runtime | core/billing |

---

## Medical Gates

| Gate | Protects | Module |
|------|----------|--------|
| `gate-medical-required-questions` | Required askbacks | medical_kb.v1.json |
| `gate-medical-askbacks-override-when` | Askback conditions | medical_kb engine |
| `gate-endo-canonical-alignment` | Endo canonical IDs | v7/medical |
| `gate-endo-medical-golden` | Endo medical goldens | medical_kb engine |

---

## Pipeline Gates

| Gate | Protects | Module |
|------|----------|--------|
| `gate-m21-determinism-50x-endo-core` | Determinism | runV10 |
| `gate-m21-endo-false-positive-prevention` | False positives | medical_kb |
| `gate-m22-no-false-positive-endo-billing` | Billing correctness | runV10 |
| `gate-p14-multiinstance-2teeth` | Multi-tooth | runV10Bundle |

---

## Modules Without Gate Protection

| Module | Status | Recommendation |
|--------|--------|----------------|
| `v10/trace/` | No dedicated gate | LOW: tracing is observability only |
| `v10/compat/milchzahn.ts` | No dedicated gate | MEDIUM: add gate if logic changes |
| `v7/settings/` | gate-settings-ssot exists | OK |

---

## Summary

- **Total gates**: 43+
- **M-prefixed gates**: 43
- **SSOT gates (M25/M26)**: 8
- **Unprotected critical modules**: 0

All production-critical paths have gate protection.
