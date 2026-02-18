# Hosted V10 Audit 20 Cases

- Date: 2026-02-18T07:10:25.455Z
- Base URL: http://localhost:4173
- Auth Mode: localBypass=true, forceRealAuth=false
- Cases: 1
- Summary: extraction.llm=0/1, preanalysis.llm=0/1, preanalysis.fallback=1/1, preanalysis.loginRequired=1/1

## S6 — Multitooth GKV
- Treatment/Insurance: fuellung / GKV
- Runtime: extraction=stub (none), preanalysis=fallback, fallback=true
- Preanalysis diagnostics: llm-error:attempt1:Login required | llm-retry:attempt2 | llm-error:attempt2:Login required | segment-skipped-no-treatment-signal:2 | tooth-context-ambiguous | ambiguous-untoothed-intent-demoted:seg-3-1-1:fuellung | ambiguous-untoothed-note-attached:seg-1-1-2
- Askbacks (erkannt): Welches Füllungsmaterial?KompositGlasionomerzement (GIZ)
- Askbacks (beantwortet): 1
- QA [option] seg-1-1-2:tooth:14::fuellung_material::tooth:14: Welches Füllungsmaterial?KompositGlasionomerzement (GIZ) => Komposit
- Billing: BEMA_13, BEMA_12, BEMA_13B
- Output excerpt: Kofferdam angelegt. Zahn 36 (OD): Füllungstherapie. Füllung mit lichthärtendem Komposit (komposit) durchgeführt. Zahn 14 (O): Füllungstherapie. Füllung mit lichthärtendem Komposit (komposit) durchgeführt.
- Output fulltext:
```text
Kofferdam angelegt. Zahn 36 (OD): Füllungstherapie. Füllung mit lichthärtendem Komposit (komposit) durchgeführt.

Zahn 14 (O): Füllungstherapie. Füllung mit lichthärtendem Komposit (komposit) durchgeführt.
```

