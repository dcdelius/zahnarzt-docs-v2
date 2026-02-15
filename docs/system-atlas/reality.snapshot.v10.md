# V10 Reality Snapshot

**Updated:** 2026-02-14 (Procedure wiring + live audits)
**Status:** ✅ PIPELINE STABLE — Ready for Praxis-Test
**Changes:** Procedure layer is SSOT for chip emission; live real-dictation + medical scenario audits executed; online dependency checks support Firestore client fallback.

---

## Core Contracts & Verified Invariants

> **Billing output is BillingRef IDs** — never hardcoded codes in runtime.
> **perInstance is SSOT** — global `billingCodes` derived via `flatMap` (no dedup).
> **Askbacks are Merged** — `medical_kb` required askbacks + Procedure required facts; fallback `QuestionServiceV2` matrix kept as a safety net.
> **Dictation Trumps Settings** — Explicitly dictated facts (e.g., "Leitungsanästhesie") override user preferences.
> **Combinability BLOCK → Askback** — default is `state='questions'` with an explicit override question (no user-facing error).
> **BillingIntent controls lookups** — `allowBema` / `allowGoz` / `allowGozAddon` prevent forbidden catalog access.

See [README.md SSOT vs Derived table](./README.md#ssot-vs-derived-canonical-reference) for complete data lineage.

---

## Pipeline Stages

| Stage | Entry File | Output | Contract/Gate | Status |
|-------|-----------|--------|---------------|--------|
| **Extraction** | `src/docudent/v10/extraction/selectExtractor.ts` | ExtractionResult | - | ✅ |
| **Facts** | `src/docudent/v10/facts/buildFactsFromExtraction.ts` | TreatmentFacts | facts closure | ✅ |
| **Procedure** | `src/docudent/v10/procedure/resolver/matchProcedureGraph.ts` | matched nodes + requiredAskbacks + chip IDs | procedure coverage gates | ✅ |
| **Medical KB** | `src/docudent/medical_kb/engine/applyMedicalKb.ts` | requiredAskbacks (chip emission disabled in V10) | gate-medical-kb-* | ✅ |
| **Questions** | `core/questions/questionServiceV2.ts` | QuestionBundle | gate-askback-sufficiency | ✅ |
| **Renderer** | `src/docudent/v10/renderer/renderFromKbChips.ts` | perInstance text + billingRefs | gate-no-text-without-chip | ✅ |
| **Composer** | `src/docudent/v10/output/outputComposerV10.ts` | Sections[] | - | ✅ |
| **Billing** | `src/docudent/v10/billing/surfaceBillingResolver.ts` | BillingRefs[] | gate-billingref-closure | ✅ |
| **Combinability** | `src/docudent/v10/billing/combinability/checkCombinabilityFromKb.ts` | Verdict | gate-combinability | ✅ |

---

## Entry Points

| Component | File | Purpose |
|-----------|------|---------|
| Pipeline Orchestrator | `src/docudent/v10/pipeline/runV10.ts` | Main entry |
| UI Hook | `src/docudent/v10/hooks/useV10Pipeline.ts` | V10 UI state + runV10 calls |
| BillingIntent | `src/docudent/v10/types.ts:47` | `computeBillingIntent()` |

---

## BillingIntent (Channelization)

From `types.ts:33-41`:

```typescript
interface BillingIntent {
    mode: 'GKV' | 'PKV' | 'MKV';
    allowBema: boolean;      // Allow BEMA catalog lookups
    allowGoz: boolean;       // Allow GOZ catalog lookups
    allowGozAddon: boolean;  // Allow GOZ addon for MKV (Mehrkosten)
}
```

| Insurance | allowBema | allowGoz | allowGozAddon | Result |
|-----------|-----------|----------|---------------|--------|
| GKV | ✅ | ❌ | ❌ | BEMA only |
| PKV | ❌ | ✅ | ❌ | GOZ only |
| MKV (default) | ✅ | ❌ | ❌ | BEMA base |
| MKV (mehrkosten) | ✅ | ❌ | ✅ | BEMA base + GOZ addon |
| MKV (nurKasse) | ✅ | ❌ | ❌ | BEMA only (addon suppressed) |

---

## System Invariants

| Invariant | Gate Test | Status |
|-----------|-----------|--------|
| No text without chip | gate-ssot-chip-closure | ✅ |
| No chip without KB | gate-ssot-chip-closure | ✅ |
| No silent billing defaults | gate-no-silent-defaults | ✅ |
| BillingRef = DB key only | gate-billingref-closure | ✅ |
| GKV never GOZ | gate-insurance-channelization | ✅ |
| PKV never BEMA | gate-insurance-channelization | ✅ |
| MKV addon controlled | gate-insurance-channelization | ✅ |
| perInstance no dedup | gate-billing-multiplicity | ✅ |

---

## Verification Suites

| Suite | Command | Tests | What It Proves | Report |
|-------|---------|-------|----------------|--------|
| Build | `npm run build` | - | Compiles | - |
| Practice Check | `npm run v10:practice-check` | 8 | Basic scenarios | - |
| Medical E2E | `npx vitest run gate-v10-medical-e2e-v2` | 10 | Medical logic | - |
| Gate Suite | `npm test` | 3511+ | All contracts | `PASSED` |
| Final Audit | `npm run v10:final-audit` | - | Online deps + V10 gates + scenario audits | `artifacts/_latest/*` |
| E2E Wiring | `npm run e2e:v10:wiring` | 10 | UI → pipeline | - |
| Praxis-16 | `npm run e2e:v10:praxis16` | 16 | Real dictations | `artifacts/_latest/v10-praxis-16/` |
| Endo-16 | `npm run e2e:v10:endo16` | 16 | Endo UI flows | `artifacts/_latest/v10-endo-16/` ✅ |
| Endo Headless | `npm run v10:scenario-run:endo` | 5 | Endo logic (headless) | `artifacts/_latest/v10-scenario-run-endo/` |

---

## Treatment Packs

| Pack | unified.json | Chip Count | surface_mapping | E2E Suite |
|------|--------------|------------|-----------------|-----------|
| fuellung | `src/docudent/core/billing/knowledgeBase/treatments/fuellung/unified.json` | 21 | ✅ | Praxis-16 ✅ |
| endo | `src/docudent/core/billing/knowledgeBase/treatments/endo/unified.json` | 24 | ❌ | Endo‑16 (E2E) ✅; Headless 5‑case PASS |

---

## New Facts Detectors (2026-01-27)

| Detector | Source | Output |
|----------|--------|--------|
| `detectVitality` | rawDictation | `pos` \| `neg` \| `unknown` |
| `detectPercussion` | rawDictation | `pos` \| `neg` \| `unknown` |
| `detectExkavation` | rawDictation | `boolean` |
| `detectFinishing` | rawDictation | `boolean` |
| `detectSurfaceAnesthesia` | rawDictation | `boolean` |
| `detectLayering` | rawDictation | `yes` \| `unknown` |
| `detectIsolationMentioned` | rawDictation | `rubberDam` \| `relative` \| `unknown` |
| `detectEndoDiagnosis` | text | pulpitis \| necrosis \| ... |
| `detectEndoStep` | text | trepanation \| obturation \| ... |

---

## Gear Documentation

| Gear | Doc | Status |
|------|-----|--------|
| Askback Registry | [gear.askback-registry.md](./gear.askback-registry.md) | ✅ |
| Billing Multiplicity | [gear.billing-multiplicity.md](./gear.billing-multiplicity.md) | ✅ |
| No Hardcoded Billing | [no-hardcoded-billing.md](./no-hardcoded-billing.md) | ✅ |

---

## Related Docs

- [README.md](./README.md) — Atlas overview + extension guides
- [atlas.map.md](./atlas.map.md) — Component responsibility matrix
- [known-gaps.md](./known-gaps.md) — Non-blocking risks
- [coverage.index.v10.md](./coverage.index.v10.md) — Chip/Askback coverage

---

*Previous update: 2026-01-01*
