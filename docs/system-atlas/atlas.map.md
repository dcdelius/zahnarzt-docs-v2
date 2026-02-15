# V10 Atlas Map — Component Responsibility Matrix

**Updated:** 2026-02-15

This document answers: "What does each component do, where is the SSOT, and how do I debug failures?"

See [README.md SSOT vs Derived table](./README.md#ssot-vs-derived-canonical-reference) for authoritative data lineage.

---

## Gear Matrix

| Component | Responsibility | SSOT Source | Failure Modes | Where to Debug |
|-----------|----------------|-------------|---------------|----------------|
| **Extraction** | Parse dictation → structured fields | Regex/NLP patterns | Missing field, wrong tooth | Log ExtractionResult |
| **Facts** | Derive treatment facts | `buildFactsFromExtraction.ts` | Wrong fact value | Log TreatmentFacts |
| **Procedure** | Facts + contract → matched nodes → chipIds[] + requiredAskbacks[] | `v10/procedure/*` + `event_bundles/*.json` | Missing chip, wrong constraint | Trace tab / procedure gates |
| **Medical KB** | Medical validations + required askbacks | `medical_kb.v1.v10.json` | Missing askback, wrong askback | Trace tab |
| **Askbacks** | Build questions from requiredAskbacks[] | `medical_kb.v1.v10.json` + Procedure requirements + `QuestionServiceV2` (fallback) | Missing question definition | `medicalAskbackAdapter.ts` / `runV10.ts` |
| **Renderer** | Chips → text + billingRefs | `unified.json` chips | Missing text | KB tab |
| **Billing Resolver** | Surface count → F-code | `unified.json` surface_mapping | Wrong F-code | Trace resolver |
| **BillingIntent** | Control catalog lookups | `computeBillingIntent()` | Wrong channel | Log BillingIntent |
| **Combinability** | BillingRefs → verdict | `combinability_kb.v1.json` | False positive/negative | Combi tab |
| **KB Release Pinning** | Session/bundle-level KB version lock | `kbReleaseId` in `runV10` / `runV10Bundle` | Mixed-version traces | Trace tab (`KB Release`) |
| **Multi-Treatment Planner** | Split dictation → segments + instances | `planFromDictation.ts` + `segmentDictation.ts` | Misclassification, wrong segment split | Log planned segments / `classifyTreatment.ts` |
| **Aggregation** | perInstance → billingCodes | `runV10.ts` flatMap | Dedup bug (fixed) | Billing tab |

---

## BillingIntent Enforcement

From `types.ts`:

```typescript
interface BillingIntent {
    mode: 'GKV' | 'PKV' | 'MKV';
    allowBema: boolean;
    allowGoz: boolean;
    allowGozAddon: boolean;
}
```

| Insurance | allowBema | allowGoz | allowGozAddon | Lookup Behavior |
|-----------|-----------|----------|---------------|-----------------|
| GKV | ✅ | ❌ | ❌ | BEMA only, GOZ blocked |
| PKV | ❌ | ✅ | ❌ | GOZ only, BEMA blocked |
| MKV | ✅ | ❌ | mehrkostenActive | BEMA base, GOZ addon if allowed |
| MKV+nurKasse | ✅ | ❌ | ❌ | nurKasse suppresses addon |

**Where enforced:** `surfaceBillingResolver.ts` checks `billingIntent.allowBema` / `allowGoz` before lookup.

---

## Multiplicity Preservation

| Source | SSOT? | Notes |
|--------|-------|-------|
| `perInstance` | ✅ SSOT | Per-tooth billing, never aggregated |
| `billingCodes` | Derived | `flatMap(perInstance.billingRefs)` — NO DEDUP |

**Key:** `flatMap` without `Set` preserves multiplicity.

---

## Debug Strategy by Symptom

| Symptom | Likely Gear | Check |
|---------|-------------|-------|
| Missing billing code | Renderer / Resolver | Is chip emitted? Mapping in unified.json? |
| Wrong channelization | BillingIntent | Is `allowGoz` false for GKV? |
| Askback not showing | Askbacks | Does a concept emit `require_askback`? Is questionKey mapping correct? |
| Text missing | Renderer | Chip in unified.json? |
| Combinability false positive | Combinability KB | Rule too broad? |
| Multiplicity lost | Aggregation | Check for accidental Set() |

---

## Related Docs

- [README.md](./README.md) — Atlas overview
- [reality.snapshot.v10.md](./reality.snapshot.v10.md) — Current status
- [known-gaps.md](./known-gaps.md) — Non-blocking risks

---

*Updated: 2026-01-29*
