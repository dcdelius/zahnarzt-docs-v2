# Hosted V10 Stresstest (LLM + Firebase) — 2026-02-16

## Setup
- Target: `https://zahnarzt-app.web.app`
- Auth: hosted login (kein Bypass)
- Scope: 10 realitätsnahe Diktate (GKV, GKV+MKV, PKV; Füllung/Endo/Krone)
- Prüfpunkte: sichtbare Askbacks, Output-Text, Billing, Runtime-Meta
- LLM/Firebase-Indikator: `v10-llm-runtime-meta` (`data-extraction-method`, `data-preanalysis-source`, `data-extraction-llm-error`)

## Ergebnis kompakt
- 10/10 Szenarien im Hosted-UI bis Output durchgelaufen.
- LLM Extraction: in allen Fällen `data-extraction-method=llm`, `data-extraction-llm-error=none`.
- Preanalysis: 9/10 direkt `llm`; 1 Fall (S7) initial `fallback`, Retry dann `llm`.

## Fälle

### S1 — GKV Füllung MOD
- Askbacks: `Überkappungsmaterial?`
- Output-Kern: 36 MOD profunda, LA Leitung, Kofferdam, Cp, Mehrschicht-Komposit
- Billing-Kern: BEMA 41a, 12, 13c, 25
- Plausibilität: fachlich plausibel, aber für reinen GKV-Standard teils "zu reich" (Cp/Mehrschicht wurden vom Flow aktiv gewählt)

### S2 — GKV+MKV Füllung mit Mehrkosten
- Askbacks: `Mehrkosten-Begründung`, `Mehrkostenbetrag`
- Output-Kern: 16 OD, Kofferdam, Adhäsiv/Mehrschicht, MKV-Vereinbarung + Begründung
- Billing-Kern: BEMA 12, 13b + GOZ 2080
- Plausibilität: gut/stimmig

### S3 — PKV Füllung
- Askbacks: keine
- Output-Kern: 45 O, LA Infiltration, Kofferdam, Adhäsiv/Mehrschicht
- Billing-Kern: GOZ 0090, 2040, 2060
- Plausibilität: kritisch — bei ursprünglich MODB wirkt GOZ 2060 (1-flächig) zu niedrig

### S4 — GKV Endo mit Einlage
- Askbacks: keine
- Output-Kern: 46, Trepanation, AL, 3 Kanäle, NaOCl/EDTA, Ca(OH)2-Einlage
- Billing-Kern: BEMA 31, 32, 35, 12
- Plausibilität: kritisch — Kanal-/Wurzel-Logik wirkt inkonsistent (3 Kanäle vs. BEMA für einwurzelig)

### S5 — PKV Endo warm
- Askbacks: Arbeitslängen/Kanalzahl/Spüllösung/Medikation
- Output-Kern: 11, Kofferdam, AL, rotierend, warm vertikal, Sealer, Rö-Kontrolle
- Billing-Kern: GOZ 2040, 2400, 2410, 2440, 5000
- Plausibilität: teils kritisch — Zahn 11 mit 3 Kanälen aus Askback-Autofill; sollte fachlogisch stärker validiert werden

### S6 — Multitooth GKV
- Askbacks: keine
- Output-Kern: zwei Instanzen (14/36), beide mit Kofferdam + Mehrschichttext
- Billing-Kern: BEMA 12, 13b
- Plausibilität: kritisch — GKV-only Fall enthält Mehrschicht-Adhäsiv-Text, wirkt fachlich/abrechnungslogisch inkonsistent

### S7 — GKV tiefe Karies
- Askbacks: `Überkappung durchgeführt`, `Überkappungsmaterial`
- Output-Kern: 26 MO profunda, Kofferdam, Cp Ca(OH)2
- Billing-Kern: BEMA 12, 13b, 25
- Plausibilität: gut; Hinweis: Preanalysis war im ersten Lauf `fallback`, im Retry `llm`

### S8 — PKV Frontzahn
- Askbacks: keine
- Output-Kern: 11 OB, adhäsive Kompositrestauration, Finieren/Polieren
- Billing-Kern: GOZ 2080
- Plausibilität: gut

### S9 — GKV Endo Revision akut
- Askbacks: Arbeitslängen/Kanalzahl/Isolation/WF-Technik/Medikation
- Output-Kern: 36, Trep, AL, 3 Kanäle, NaOCl/EDTA, Prov.-Verschluss
- Billing-Kern: BEMA 31, 32, 12
- Plausibilität: teils kritisch — analog S4 Kanal-/Wurzel-Mapping

### S10 — PKV Endo mit Dokumentation
- Askbacks: keine
- Output-Kern: 21, Kofferdam, AL, Rö-Kontrolle
- Billing-Kern: GOZ 2040, 2400, 5000
- Plausibilität: grundsätzlich ok, eher minimal dokumentiert

## Wichtigste Findings (priorisiert)
1. Endo Morphologie/Billing-Mapping härten (Kanalzahl, Wurzeltyp, Code-Selection konsistent machen).
2. Füllung GKV vs. Mehrschicht-Text strikt entkoppeln (kein Mehrschicht/Adhäsiv-Text ohne validen MKV/PKV-Pfad).
3. Surface-/Flächen-Konsistenz im PKV-Füllungsfall härten (z. B. MODB darf nicht auf 1-flächig fallen).
4. Preanalysis-Fallback observability + Stabilität verbessern (S7 zeigte einmal fallback).

