# V10 UI Audit — 3-Step Flow (Dictation → Review → Output)

**Date:** 2026-02-14  
**Scope:** V10 frontend wiring + UX coherence for the core 3-step workflow.

---

## Goal (Product Contract)

Deliver a predictable, low-friction documentation flow:

1. **Dictation** — user dictates treatment(s).
2. **Review** — system shows what it derived (**facts + applied standards**) and asks only necessary questions (**askbacks set Facts only**).
3. **Output** — final documentation text + billing refs/codes (channelized) with traceability.

Design contract:
- Jeton-inspired: roomy layout, premium typography, pill controls, glass depth, minimal borders.
- No “random” UI behavior: every displayed element has an owner (Facts/Procedure/KB), not ad-hoc heuristics in the UI.

---

## Current Wiring (Verified)

### Step 1 — Dictation
- Entry: `src/docudent/v10/pages/DocudentV10Page.tsx`
- CTA: `data-testid="v10-run-button"` triggers `runPipeline()` (V10 hook).
- Settings inputs are injected into the pipeline via `useV10Pipeline({ settingsInput })`.

### Step 2 — Review (Askbacks + Derived Chips)
- If required askbacks exist: pipeline state is `questions` and UI renders `QuestionsFlowV2`.
  - UI component: `src/docudent/v10/components/QuestionsFlowV2.tsx`
  - Contract: questions/askbacks only set Facts; they never activate chips directly.
- Once required askbacks are answered: pipeline returns `output` and UI renders the Post-Analysis dashboard (still before final output).
  - UI component: `src/docudent/v10/components/V10PostAnalysisDashboard.tsx`
  - Derived chips are read-only by default (SSOT), manual overrides are behind explicit opt-in.
  - Trace panel shows KB release/hashes + chip emitters + provenance/billing origins.

### Step 3 — Output
- UI component: `src/docudent/v10/components/OutputFlow.tsx`
- Contract: output renders composed text/sections and billing codes derived from BillingDB (no hardcoded codes).

---

## UX Gaps vs Jeton Contract (To Fix)

1. **Visual consistency**
   - Dictation screen uses the Jeton hero layout (`v7-jeton-*`).
   - Review screens (QuestionsFlowV2 + PostAnalysisDashboard) are more “dashboard-like” with separators/borders and denser rhythm.

2. **Information architecture**
   - Review should present:
     - “Recognized from dictation” (signals/facts summary)
     - “Applied standards” (settings-driven defaults)
     - “Askbacks” (required first, optional collapsed)
   - Today this is split across screens and not always visible at the moment the user answers askbacks.

3. **Interaction clarity**
   - Chips are now SSOT read-only (good), but users need clearer labels/legend: DICT / STD / USER / AUTO.

---

## Implemented (2026-02-14)

P0 — Review stage shows “Erkannt” without PII:
- Pipeline now returns a safe `review` payload (no raw dictation) for both `state=questions` and `state=output`.
- UI renders an “Erkannt” glass panel in:
  - `src/docudent/v10/components/QuestionsFlowV2.tsx`
  - `src/docudent/v10/components/V10PostAnalysisDashboard.tsx`
- The panel is instance-aware (multi-tooth) and surfaces/flags are derived from Facts (not from UI heuristics).

P0 — Review stage shows “Standard” defaults:
- `review.instances[].standardChipIds` is computed in the pipeline from Settings (no UI heuristics).
- UI renders those chips as a compact “Standard” pill row (no extra buttons, no raw IDs).

P0 — Shared Review stage header:
- Introduced `src/docudent/v10/components/V10StageHeader.tsx` (kicker + large title + optional subtitle + action slot).
- Refactored:
  - `src/docudent/v10/components/QuestionsFlowV2.tsx` header → `V10StageHeader`
  - `src/docudent/v10/components/V10PostAnalysisDashboard.tsx` header → `V10StageHeader`
- Visual goal: keep the Jeton-inspired typography rhythm consistent across Step 1 and Step 2.

P0 — Output stage aligned with Jeton:
- `src/docudent/v10/components/OutputFlow.tsx` header → `V10StageHeader` (Copy / Bearbeiten / Neuer Fall).
- Billing is always visible as compact pills (`data-testid="v10-billing-codes"`), with a clean details toggle (`data-testid="billing-toggle"`).
- Removed the redundant Output header wrapper in `DocudentV10Page` so Step 3 has one consistent header.

P0 — Visual consistency improvements:
- Review screens reuse the global V10 background (no nested `v7-bg` overlays).
- Review layout uses glass layers + spacing + pill controls (Jeton-inspired) with minimal borders.

P0 — Post-Analysis rhythm tightened:
- `src/docudent/v10/components/V10PostAnalysisDashboard.tsx` now uses a centered container (maxWidth) and puts the “Erkannt/Standard” summary above the grid (so it is never “hidden” in a side column).
- Copy reduced in empty states (“Keine offenen Rückfragen.”) to keep the screen calmer.
- Trace panel is gated behind the Debug affordance (`showDebugToggle`) instead of always being visible.

P0 — Shared “Erkannt/Standard” + option pills:
- Extracted `V10ReviewSummaryCard` so Questions + Post-Analysis render the same “Erkannt” summary (no drift).
- Introduced `V10OptionPillButton` for consistent pill buttons across Step 2.
- Introduced `V10QuestionRow` so Questions + Post-Analysis render identical question controls (type mapping + pill styles).
- `DocudentV10Page` groups Standard vs Dictation chips using `result.review.instances[].standardChipIds` (no UI recomputation).

---

## Next Implementation Steps (UI)

P0 — make “standards + recognized signals” explicit in Review:
- “Recognized” + “Standard” summary is now present; next: add a subtle link/entrypoint to Settings (no extra UI clutter).
- Consider showing a “STD” marker inside pills (design-only) if confusion persists.

P1 — reduce screen switching:
- Consider converging the Questions screen into the Post-Analysis dashboard layout to avoid context breaks.

---

## Verification

- Online Final Audit: `npm run v10:final-audit`
- UI E2E (deterministic): `npm run e2e:v10:wiring`, `npm run e2e:v10:praxis16`, `npm run e2e:v10:endo6`
