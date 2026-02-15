# V10 Questions Contract Lock — Report

**Date:** 2026-01-11  
**Status:** ✅ COMPLETE

## Contract Summary

| Rule | Status |
|------|--------|
| `type='single'` requires `options[]` | ✅ Enforced |
| No Ja/Nein fallback for single | ✅ Removed (error card) |
| Answers stored as strings | ✅ Enforced |
| No "true"/"false" in output | ✅ Boolean guard |

## KB Askbacks with Options (10/10)

| Askback ID | Options |
|------------|---------|
| `askback-ueberkappung` | indirekt / direkt / keine |
| `askback-ueberkappung-material` | Ca(OH)₂ / MTA / Biodentine |
| `askback-material` | Komposit / GIZ |
| `askback-isolation` | Kofferdam / Relativ |
| `askback-la-type` | Infiltration / Leitung / Keine |
| `askback-sensitivity-followup` | Ja / Nein (strings) |
| `askback-kofferdam` | Ja / Nein (strings) |
| `askback-mkv-confirmed` | Mehrkosten / Nur Kasse |
| `askback-adhesive-technique` | Ja / Nein (strings) |
| `askback-hemostasis` | Ja / Nein (strings) |

## Test Results

```
✅ 9/9 tests pass
✅ Build: 3.83s
✅ No DEV contract errors
```

## Data-TestIDs Added

| TestID | Location |
|--------|----------|
| `v10-docudent-page` | DocudentV10Page.tsx |
| `v10-questions-flow-v2` | QuestionsFlowV2.tsx |
| `error-no-options` | Error card for missing options |

## Files Modified

- `schema.v1.ts` — Added `options` field to AskbackDefinition
- `medical_kb.v1.json` — Added options to 10 askbacks
- `compileAskbacksToQuestions.ts` — DEV error for missing options
- `QuestionsFlow.tsx` — Error card for missing options
- `QuestionsFlowV2.tsx` — Error card + testid
- `DocudentV10Page.tsx` — testid
- `renderFromKbChips.ts` — Boolean guard
