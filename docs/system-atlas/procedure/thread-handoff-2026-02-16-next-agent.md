# Thread Handoff — 2026-02-16 (for next coding agent)

## 1) Product Zielbild (non-negotiable)

Docudent V10 soll aus realen Zahnarzt-Diktaten deterministisch liefern:
1. medizinisch plausible strukturierte Facts,
2. nur notwendige, fachlich sinnvolle Rueckfragen (Askbacks),
3. forensisch/KZV-nahe Dokumentationstext in kurz/mittel/lang,
4. SSOT-basierte Abrechnung (BEMA/GOZ, keine hardcoded drift),
5. reproduzierbares Verhalten (gleiche Inputs -> gleiche Outputs).

Wichtig aus Produktsicht:
- V10 + Settings sind aktiv; andere UI-Pfade sind legacy.
- LLM darf erkennen/vorsortieren, aber Entscheidungen fuer Billing/Rules bleiben SSOT-deterministisch.
- Fokus ist realer Praxisfluss im Frontend (hosted, mit echter Auth/LLM/Firestore), nicht nur lokale Unit-Tests.

---

## 2) Was in diesem Thread bereits fix/hart gemacht wurde

### A) Pipeline + Fakten-Haertung
- Endo-Kanalzahl wird zahnlogisch geclamped (anatomy guardrail), statt unplausibel durchzulaufen.
- Surface parsing fuer MOD/MODB etc. wurde robuster gegen Ambiguitaetsbegriffe (z. B. Kontaktpunkt).
- GKV-Narrativ wurde gegen MKV-Leakage gehaertet (kein Mehrkosten-Text in reinem GKV-Pfad).
- Preanalysis bekam Retry vor Fallback (reduziert false fallback in hosted runs).

### B) Endo-Askback-Qualitaet
- Endo-Fallback-Fragen wurden von Rohkeys auf lesbare Fachfragen gehoben:
  - wf_technique
  - irrigation
  - medication
  - canal_count
- Semantische Askback-Deduplizierung im Merge eingefuehrt (nicht nur id-basiert).

### C) Frontzahn-Shortform Surface-Fix
- Diktat-Shortform wie `11 ib ...` wurde korrigiert:
  - `i` (inzisal) wird wie okklusal (`o`) behandelt,
  - bei Konflikt extraction vs. explizites Diktat wird Diktat bevorzugt.
- Dadurch werden OB/IB-Faelle nicht mehr auf OL/1-flaechig verfuehrt.

### D) Hosted Testbetrieb skaliert
- Reale hosted E2E-Laeufe mit Login und LLM/Firebase wurden mehrfach durchgefuehrt.
- 20er-Audit-Suite wurde aufgebaut (gemischte Versicherungen + Treatments).
- Runtime-Meta (preanalysis/extraction/fallback) wird in den Tests geprueft.

---

## 3) Wichtige aktuelle Findings (fachlich/architektonisch)

1. **Klinische Obligationslogik ist noch verteilt**
   - Teilweise in procedure bundles, teilweise medical KB, kein zentraler cross-treatment obligations layer.
   - Beispiel: "Wurzelfuellung -> roentgenologische Kontrolle dokumentieren" sollte zentral regelbar sein.

2. **Varianz realer Diktate bleibt groesster Fehlertreiber**
   - Synonyme, Abkuerzungen, Mischformen, mehrere Materialien/Loesungen in einem Satz.
   - Loesung: Normalizer + obligations + askback quality + regression gates.

3. **Hosted-E2E ist der richtige Hauptkanal**
   - Lokale Tests decken nicht alle realen Driftpfade (LLM phrasing variance, hosted auth timing, etc.) ab.

---

## 4) Atlas-Entscheidungen, die jetzt gelten

1. Es gibt einen neuen strategischen Gap:
   - `GAP-33` in `docs/system-atlas/known-gaps.md`
   - Thema: **central clinical-obligations engine**

2. Es gibt ein formales Arbeitsmodell fuer die naechsten Iterationen:
   - `docs/system-atlas/procedure/iterative-clinical-test-loop-2026-02-16.md`
   - Hosted-Rinse-Repeat: testen -> analysieren -> root-cause fix -> gates -> retest

3. Statussnapshot wurde um den hosted hardening loop erweitert:
   - `docs/system-atlas/status-2026-02-15.md` (Addendum 12)

---

## 5) Naechster grosser Block (priorisiert)

## Block X: Clinical Variability + Central Obligations

Warum jetzt:
- Das ist der groesste verbleibende Qualitaetshebel fuer medizinische Plausibilitaet und KZV-Forensik.

Inhalt (in dieser Reihenfolge):
1. **Terminology/Fact Normalization erweitern**
   - Endo-Spuelloesungen robust als Multi-Set (auch 3+ Loesungen), Synonyme/Abkuerzungen.
2. **Central Obligations Engine designen und anbinden**
   - Regeltyp `when -> requires evidence -> askback options` (inkl. `done | not_done | deferred_next_visit`).
3. **Askback Quality Layer**
   - Keine Duplikate, klare Sprache, keine Rohkeys im UI.
4. **Forensic/KZV consistency checks in output**
   - Pflichtnachweise bei relevanten Behandlungsschritten.
5. **Regression locking**
   - Unit + Gate + Hosted slices fuer jede Root-Cause-Klasse.

Wichtig:
- Kein Pilot-Einzelfall-Hack.
- Zentrale Loesung zuerst, dann Behandlungsspezifika mappen.

---

## 6) Teststrategie fuer den naechsten Agenten

- Primär: hosted UI Tests mit realem Stack.
- Zyklus pro Iteration:
  1. 20-30 realistische Diktate fahren,
  2. pro Fall Askbacks + Output + Billing + Runtime-Meta dokumentieren,
  3. Findings in Root-Cause-Gruppen clustern,
  4. zentrale Fixes bauen,
  5. betroffene hosted Faelle gezielt re-run,
  6. danach kompletten Pack wieder laufen lassen.

Empfohlene Root-Cause-Kategorien:
- Medical logic
- KZV/forensic evidence
- Billing coherence
- Askback UX quality
- Determinism/orchestration

---

## 7) Aktuell relevante Dateien (Code)

- Pipeline orchestrator:
  - `src/docudent/v10/pipeline/runV10.ts`
- Askback builder/wording:
  - `src/docudent/v10/askbacks/buildQuestionsFromAskbacks.ts`
- Surface normalization:
  - `src/docudent/v10/extraction/surfaces/normalizeSurfaces.ts`
- Endo procedure bundles (inkl. strict evidence):
  - `src/docudent/v10/procedure/events/endo.ts`
- Medizinische SSOT Regeln/Askbacks:
  - `src/docudent/medical_kb/medical_kb.v1.v10.json`

Tests:
- `src/docudent/v10/__tests__/pipeline/v10.surface-lexicon.test.ts`
- `src/docudent/v10/__tests__/pipeline/v10.endo-question-dedupe.test.ts`
- `src/docudent/v10/__tests__/askbacks/buildQuestionsFromAskbacks-endo-fallbacks.test.ts`
- `e2e/v10-hosted-audit-20.e2e.spec.ts`
- `e2e/v10-realistic-praxis-test.e2e.spec.ts`

Reports:
- `docs/system-atlas/procedure/hosted-audit-20-2026-02-16.md`
- `docs/system-atlas/procedure/stresstest-2026-02-16-hosted.md`

---

## 8) Praktische Uebergabe-Hinweise

- Dieser Thread hatte sehr viele Iterationen; der neue Agent soll **mit diesem Dokument + status-2026-02-15 Addendum 12 + known-gaps GAP-33** starten.
- Beim Weiterarbeiten strikt am Loop bleiben: hosted evidence zuerst, dann root-cause fixes, dann gates.
- Bei unklaren Fachfaellen nicht raten: explizite guardrail/askback statt stiller Annahme.

