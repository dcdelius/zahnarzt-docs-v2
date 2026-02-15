# V10 Questions UI Refresh (Step‑2)

**Date:** 2026-02-15  
**Goal:** Align the “Rückfragen” step with the Jeton look (space, type, depth) while keeping the 3‑step wiring intact.

## What changed
- Two‑column layout: **Erkannt & Standards** on the left, **Rückfragen** on the right.
- Cleaner optional toggle and progress pill (reduced copy).
- Question rows are now more airy and readable (stacked label + options).

## Files touched
- `src/docudent/v10/components/QuestionsFlowV2.tsx`
- `src/docudent/v10/components/QuestionsFlowV2.css`
- `src/docudent/v10/components/V10QuestionRow.tsx`

## Non‑goals
- No logic changes (askbacks remain facts‑only).
- No new controls or hidden actions.
