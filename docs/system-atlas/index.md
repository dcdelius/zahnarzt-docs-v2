# System Overview

## Single Runtime Entry

```
UI: DocudentV10Page
     ↓ runPipeline()
Hook: useV10Pipeline
     ↓
Orchestrator: v10/pipeline/runV10.ts
     ├─ selectExtractor()      → extraction
     ├─ buildFactsFromExtraction()
     ├─ applyMedicalKb()       → askbacks (chip emission disabled in V10)
     ├─ matchProcedureGraph()  → chips + askbacks (SSOT)
     ├─ buildMedicalQuestionsFromKb() + QuestionServiceV2 merge
     ├─ applyBillingGuard()    → filter chips
     ├─ renderFromKbChips()    → fullText + billingRefs
     └─ checkCombinabilityFromKb()
```

## Known Truth (SSOT Contracts)

| Contract | Enforcement |
|----------|-------------|
| **No text without chip** | Output text comes only from `unified.json` |
| **No chip without KB** | Every chip ID must exist in treatment KB |
| **Critical askbacks non-skippable** | Tooth/surface missing → mandatory questions |
| **Precedence** | dictation negation > dictation explicit > override > settings > default |

## Repro Set

| ID | Scenario | Expected |
|----|----------|----------|
| R1 | Single Füllung MKV: "Zahn 26 mod, tiefe Karies, Kofferdam, Anästhesie" | questions → medical_ueberkappung visible |
| R2 | Multi Endo+Füllung: "Wurzelfüllung 1.4, danach Füllung, ohne Anästhesie" | 2 instances; negation scoped to fuellung only |

## Where Bugs Hide

| Drop Point | Symptom | Check |
|------------|---------|-------|
| `medicalAskbackAdapter` | Askback → fallback question | Missing askback definition or questionKey mismatch |
| `QuestionServiceV2 merge` | Duplicate/missing questions | De-dupe by questionKey broken |
| `billingEligibilityGuard` | Billing empty | Check blockedChips in diagnostic |
| `selectExtractor` | Empty extraction | Stub mode off, LLM failed |

## Product Docs

- [product.plan.md](./product.plan.md) — Dictation → Chip Control Center → Final output (SSOT)
- [frontend/v10-3step-ui-audit.md](./frontend/v10-3step-ui-audit.md) — UI wiring + Jeton-style coherence for the 3-step flow
- [benchmark.sonia-vs-dokumaster.md](./benchmark.sonia-vs-dokumaster.md) — Markt-Must-Haves + Benchmark (Soll vs Ist)
- [architecture.scaling.plan.md](./architecture.scaling.plan.md) — Plan to scale to 20-30 packs + multi-treatment (1 then 2)
- [status-2026-02-15.md](./status-2026-02-15.md) — Agent handoff snapshot (current)
- [procedure/v10-remediation-plan-2026-02-15.md](./procedure/v10-remediation-plan-2026-02-15.md) — Active execution board (audit findings -> sequential remediation)
- [procedure/multi-treatment-llm-orchestration-plan-2026-02-15.md](./procedure/multi-treatment-llm-orchestration-plan-2026-02-15.md) — Detailed handoff plan for LLM-driven multi-treatment orchestration + UI flow
- [procedure/treatment-pack-onboarding.v10.md](./procedure/treatment-pack-onboarding.v10.md) — 1-day onboarding contract + mandatory gates
- [procedure/v10-release-checklist-2026-02-15.md](./procedure/v10-release-checklist-2026-02-15.md) — Release gate checklist (pinning, determinism, trace, realistic E2E)

## Artifact Links

- [Wiring Graph](./artifacts/m79/wiring.graph.json) — 22 nodes, 21 edges
- [Atlas Files](./artifacts/m79/atlas.files.jsonl) — 1681 file classifications
- [Billing Risk Map](./artifacts/m82/billing.risk_map.json) — DO NOT DELETE list
- [Test Status](./artifacts/m81/status.json) — 45 failed / 360 passed

## Cleanup Radar

- [Dead Code Candidates](./dead-code.candidates.jsonl) — confirmed unused UI/speech helpers added
- [Delete Plan](./delete-plan.md) — includes Bucket 4 legacy UI + speech cleanup
