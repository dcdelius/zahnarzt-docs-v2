# Askback Filtering by Known Facts

**Date:** 2026-02-15  
**Goal:** Reduce unnecessary askbacks by skipping any question whose underlying fact is already known (from dictation, settings defaults, or prior answers).

## Rule
- If a fact is **known**, the corresponding askback is **removed** from both required and optional lists.
- Askbacks remain **facts-only** (no chip activation).

## Implementation
- `runV10` filters askback IDs via `isFactKnownForAskback()` before question bundle creation.
- `isFactKnownForAskback()` is shared from `settingsResolver` to keep a single mapping for “known fact” detection.

## Why
- Avoid redundant questions (dentist already dictated the fact).
- Keep the 3‑step flow clean and minimize interruption.

## Next
- Expand the mapping for any new askbacks introduced in future packs.
