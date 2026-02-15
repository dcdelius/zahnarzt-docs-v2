# V10 Scenario Suites (Headless, Deterministic)

**Updated:** 2026-02-01  
**Goal:** Multi-Treatment Integration absichern (Endo + Fuellung + Extraktion in einer Sitzung) inkl. Kombinierbarkeit + MKV-Logik – ohne Browser, deterministisch.

---

## Why This Exists

Wir brauchen eine **reproduzierbare** Test-Schicht zwischen Unit/Gates und Playwright:
- **Headless** (kein UI, keine Browser-Flakes)
- **Deterministisch** (keine "LLM entscheidet", keine Randomness)
- **Goldene Erwartungen**: Codes + Text-Snippets + Kombinierbarkeits-Verhalten

---

## Entry Points

### A) Multi-Treatment Suite (Vitest, canonical in CI)

- Test: `src/docudent/v10/__tests__/multitreatment/multitreatment.scenario-suite.test.ts`
- Scenario file: `scripts/v10/scenarios.v10.multitreatment.json`

Run:
```bash
npx vitest run src/docudent/v10/__tests__/multitreatment/multitreatment.scenario-suite.test.ts
```

Was wird validiert:
- `planFromDictation()` erkennt Segmente (endo/fuellung/extraction)
- `runV10Bundle()` fuehrt alle Segmente in **einer Sitzung** aus
- Billing-Codes: `mustIncludeCodes`, `mustNotIncludePrefixes` (z.B. kein `GOZ_` bei "nur Kasse")
- MKV Add-on: erwartete GOZ Add-on Codes (z.B. `GOZ_2100`) nur bei echten MKV-Signalen
- Session-Combinability: `runSessionCombinability()` muss **nicht** `BLOCK` liefern

Determinismus-Policy:
- Scenario-Antworten (falls vorhanden) gewinnen.
- Fehlende Antworten werden deterministisch auto-gefuellt (erste Option / Defaults), damit die Suite nicht wegen optionaler Askbacks "haengt".

---

### B) Multi-Treatment Runner (Artifacts/Report)

- Runner: `scripts/v10/runV10MultiTreatmentScenarioRun.ts`
- Scenario file: `scripts/v10/scenarios.v10.multitreatment.json`
- Package script: `npm run v10:scenario-run:multitreatment`

Output/Artifacts:
- `docs/system-atlas/artifacts/_latest/v10-multitreatment-scenario-run/`

Hinweis:
- Der Runner ist fuer lokale Reports gedacht (Artifacts + Summary).
- In eingeschraenkten Umgebungen kann `npx tsx` fehlen; dann ist die Vitest-Suite die Referenz.

---

### C) Single-Treatment Scenario Runner (per Pack)

Neue Scenario Files:
- `scripts/v10/scenarios.v10.endo.json`
- `scripts/v10/scenarios.v10.extraction.json`

Runner:
- `scripts/v10/runV10ScenarioRun.ts` (unterstuetzt `--file`)

Package scripts:
- `npm run v10:scenario-run:endo`
- `npm run v10:scenario-run:extraction`

Output/Artifacts:
- `docs/system-atlas/artifacts/_latest/v10-scenario-run-<treatmentId>/`

---

### D) ExplainRun (Single Case Trace)

- Runner: `scripts/v10/explain-run.ts`
- Package script: `npm run v10:explain-run`

Beispiel:
```bash
npm run v10:explain-run -- --dictation "Zahn 36 mo Komposit, Okklusion geprüft." --treatment fuellung --insurance GKV
```

Output/Artifacts:
- `docs/system-atlas/artifacts/_latest/v10-explain-run/`

---

## Scenario File Contracts (Minimal)

### Multi-Treatment: `scripts/v10/scenarios.v10.multitreatment.json`

- `dictation` ist **ein String**; Segmente werden per `;` getrennt (deterministisches Segmenting).
- `expected.mustIncludeTreatmentIds` stellt sicher, dass die Klassifikation stabil bleibt.
- `expected.mustIncludeCodes` / `mustNotIncludePrefixes` sind "golden".

---

## Extraction: SSOT Alignment Notes (Warum das noetig war)

Damit Extraction in Multi-Treatment nicht "leer" endet, braucht es konsistente SSOT-Bausteine:

- Facts-Mapping fuer Extraction: `src/docudent/v10/facts/buildFactsFromExtraction.ts`
  - `anesthesia` wird aus Dictation erkannt (infiltr/leitung/ila/none)
- Baseline-Chips im Pipeline-Flow: `src/docudent/v10/pipeline/runV10.ts`
  - `extraktion_einfach` wird fuer `treatmentId === 'extraction'` immer gesetzt
- Chip-ID vereinheitlicht: `la_infiltr` statt pack-spezifischem Alias
  - KB: `src/docudent/core/billing/knowledgeBase/treatments/extraction/unified.json`
  - UI: `src/docudent/v10/packs/extraction/ui.contract.ts`
- Template-Migration: `src/docudent/core/billing/knowledgeBase/treatments/extraction/template.json`
  - Muss dem `OutputComposer`-Schema entsprechen (u.a. `dedupeRules.byCategory`), sonst Crash.

---

## Extending (Add More Goldens)

1. Neuen Goldfall in `scripts/v10/scenarios.v10.multitreatment.json` anlegen
2. Sicherstellen: Segmente klar (z.B. "Endo ...; Fuellung ...; Extraktion ...")
3. `expected.mustIncludeTreatmentIds` setzen (gegen Klassifikations-Drift)
4. `expected.mustIncludeCodes` und Text-Snippets definieren
5. Vitest laufen lassen

---

## Related Docs

- `docs/system-atlas/test-strategy.md` (Pyramide + CI Definition)
- `docs/system-atlas/atlas.map.md` (Gear Matrix)
- `docs/system-atlas/README.md` (How to Verify)
