# Hosted V10 Audit 20 Cases

- Date: 2026-02-18T07:00:39.445Z
- Base URL: http://localhost:4173
- Auth Mode: localBypass=true, forceRealAuth=false
- Cases: 1
- Summary: extraction.llm=0/1, preanalysis.llm=0/1, preanalysis.fallback=1/1, preanalysis.loginRequired=1/1

## S6 — Multitooth GKV
- Treatment/Insurance: fuellung / GKV
- Runtime: extraction=stub (none), preanalysis=fallback, fallback=true
- Preanalysis diagnostics: llm-error:attempt1:Login required | llm-retry:attempt2 | llm-error:attempt2:Login required | segment-skipped-no-treatment-signal:2 | tooth-context-ambiguous
- Askbacks (erkannt): none
- Askbacks (beantwortet): 1
- QA [option] seg-3-1-1:untoothed::fuellung_material::tooth:14: Welches Füllungsmaterial?KompositGlasionomerzement (GIZ) => Komposit
- Billing: BEMA_13, BEMA_13B, BEMA_12
- Output excerpt: Kofferdam angelegt. Zahn 36 (OD): Füllungstherapie. Okklusion geprüft/eingeschliffen. Ausarbeitung und Politur. Füllung mit lichthärtendem Komposit (komposit) durchgeführt. Kofferdam angelegt. Zahn 14 (OD): Füllungstherapie. Okklusion geprüft/eingeschliffen. Ausarbeitung und Politur. Füllung mit lichthärtendem Komposit
- Output fulltext:
```text
Kofferdam angelegt. Zahn 36 (OD): Füllungstherapie. Okklusion geprüft/eingeschliffen. Ausarbeitung und Politur. Füllung mit lichthärtendem Komposit (komposit) durchgeführt.

Kofferdam angelegt. Zahn 14 (OD): Füllungstherapie. Okklusion geprüft/eingeschliffen. Ausarbeitung und Politur. Füllung mit lichthärtendem Komposit (komposit) durchgeführt.

Zahn 14 (O): Füllungstherapie. Okklusion geprüft/eingeschliffen. Ausarbeitung und Politur. Füllung mit lichthärtendem Komposit (komposit) durchgeführt.
```

