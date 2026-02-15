# V10 UI Audit — 3‑Step Flow (Dictation → Askbacks/Review → Output)

**Date:** 2026-02-15  
**Scope:** V10 “Jeton” UI wiring + cleanliness review for the core 3‑step experience.

---

## Goal

Ensure the UI is **structurally aligned** with the V10 architecture:

- Dictation is the single entry point.
- Askbacks are **Facts-only** (no chip activation in UI).
- Review step shows **derived chips** + provenance tags (DICT/STD/USER/AUTO).
- Output is always reachable (no “dead end” screens).
- No redundant action docks or duplicate navigation elements.

---

## Current Wiring (Verified)

**1) Dictation**

- Screen: “Was wurde durchgeführt?”
- Entry: `src/docudent/v10/pages/DocudentV10Page.tsx` (state `idle`)
- Actions: mic recording + “Dokumentieren”

**2) Askbacks (Questions)**

- Screen: “Rückfragen → Details klären”
- Entry: `src/docudent/v10/pages/DocudentV10Page.tsx` (state `questions`)
- Renderer: `src/docudent/v10/components/QuestionsFlowV2.tsx`
- Notes:
  - QuestionBundle is the UI contract (required vs optional).
  - No legacy Questions renderer remains.

**3) Review / Extracted Details (Analysis)**

- Screen: “Analyse → Extrahierte Details prüfen”
- Entry: `src/docudent/v10/pages/DocudentV10Page.tsx` (state `output`, step override `analysis`)
- Renderer: `src/docudent/v10/components/V10PostAnalysisDashboard.tsx`
- Notes:
  - Chips are shown as SSOT (“Aus Fakten abgeleitet”).
  - Manual chip overrides are behind an explicit opt‑in section.

**4) Final Output**

- Screen: “Output → Behandlungsdokumentation”
- Entry: `src/docudent/v10/pages/DocudentV10Page.tsx` (step override `output`)
- Renderer: `src/docudent/v10/components/OutputFlow.tsx`

---

## UI Cleanliness Decisions

- The floating “action dock” is now **dictation-only** (no mic/run buttons while questions are open).
- Questions rendering is unified via `QuestionsFlowV2` (bundle-based), removing the legacy `QuestionsFlow` path.

---

## Verification

- Vitest V10 gate suite: `npm test -- --run src/docudent/v10/__tests__/gates`
- Playwright wiring: `npm run e2e:v10:wiring`

