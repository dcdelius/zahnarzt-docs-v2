# Fuellung ToDo List (Priority Order)

## Critical Path to "Perfekt"

| # | Task | Impact | Effort | File(s) |
|---|------|--------|--------|---------|
| 1 | ✅ Auto-resolve GOZ_2197 | No error screen | Done | `checkCombinabilityFromKb.ts` |
| 2 | ✅ Filter droppedCodes from output | Correct final billing | Done | `runV10.ts:759-779` |
| 3 | ✅ SSOT proof (grep evidence) | Architecture lock | Done | `ssot-reality-proof.md` |
| 4 | ✅ Add finishing facts (Politur/Okklusion) | Better text | Done | `buildFactsFromExtraction.ts` + `applyAnswersToFacts.ts` |
| 5 | ✅ Implement Explain Report | Debug visibility | Done | `scripts/v10/explain-run.ts` + `howto/explain-run.md` |
| 6 | ✅ Add 30 truthcase gate | Regression lock | Done | `gate-fuellung-truthcases-30.test.ts` |
| 7 | ✅ Überkappungsmaterial askback | Complete text | Low | KB rule + UI |
| 8 | ✅ MKV askback matrix enforcement | Minimal questions | Done | `questionServiceV2.ts` + `v10.fuellung-mkv-askback-matrix.test.ts` |
| 9 | ✅ Scope enforcement (PER_TOOTH) | Multi-treatment ready | Done | `runV10.ts` |
| 10 | ✅ KB compiler validation | CI fail-fast | Done | `gate-combinability-kb-compile.test.ts` |
| 11 | MKV Begründung in Output | Juristisch sauber | Done | `mkv_begruendung` |
| 12 | Flowable-Base Default wiring | Praxis-Standard | Done | `settingsResolver.ts` |
| 13 | ✅ Endo-Defaults verdrahten | Vollständigkeit | Done | `settingsResolver.ts` + Endo facts |
| 14 | ✅ Kombinatorik-Coverage Report | Vollständigkeit | Done | `gate-combinability-coverage.test.ts` |
| 15 | ✅ Settings↔Askback Coverage fix | Klarheit | Done | `settings-coverage.md` |
| 16 | ✅ LA ambiguity → default infiltration | Fewer askbacks | Done | `buildFactsFromExtraction.ts` + `v10.fuellung-la-ambiguity-default.test.ts` |

## Status

- **Done**: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16 (core SSOT + MKV + Flowable + Endo defaults + coverage)
- **Next**: (select next migration item)

## Verification Command

```bash
npm test -- --run src/docudent/v10/__tests__/gates
```

Notes (local run 2026-02-03):
- Fixed: `gate-ssot-chip-ids` (added `optisch_elektronisch`)
- Fixed: `gate-combinability-auto-resolve` (coverage for GOZ_0090/0100)
- New: `gate-combinability-coverage` added (passes)
- New: MKV askback matrix test + LA ambiguity default test (both pass)

Notes (local run 2026-02-09):
- Added: MKV confirmed askback for GKV Komposit an Seitenzahn (toothRegion fact + KB rule)

Notes (local run 2026-02-10):
- Settings-Defaults können Mention-Flags (z. B. Matrix/Flowable) auch bei false überschreiben → Matrix-Default Test aktiv
- Pipeline-Tests nutzen Auto-Answer-Helper, um nach Questions-State deterministisch Output zu prüfen
- MKV-Askback für GKV-Komposit Seitenzahn: KB-Rule auf `insuranceType` umgestellt (Concept + Rule) + Gate-Test hinzugefügt
- Gates: QuestionBank `chipActivation` verboten + AnswerMap `alwaysOnChipIds` verboten
