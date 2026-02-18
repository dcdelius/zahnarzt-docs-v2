# V10 Treatment Expansion Plan (20 Behandlungen)

Prepared: 2026-02-16
Owner: Product + Engineering + Medical QA

Execution board (hard implementation checklist):
- `docs/system-atlas/procedure/treatment-expansion-20-execution-board-2026-02-16.md`

Supporting source SSOT documents:
- `docs/system-atlas/medical/treatment-frequency-basis-2026-02-16.md`
- `docs/system-atlas/medical/treatment-evidence-matrix.v1.md`

## 1) Zielbild

Docudent V10 soll von aktuell stabilen Kernpfaden (v. a. `fuellung`, `endo`) auf ein belastbares Portfolio von 20 Behandlungen wachsen, ohne SSOT/Determinismus zu verlieren.

Leitprinzipien:
- Medizinische Standards aus Leitlinien/Regelwerken als Quelle der Obligations
- Billing-Entscheidungen weiter strikt SSOT-deterministisch
- Askbacks nur evidenzgetrieben (kein UI-Ratespiel)
- Jede neue Behandlung nur mit Gate- und Hosted-E2E-Abdeckung

## 2) Verbindliche Quellenbasis (extern)

Regulatorik/Abrechnung (Deutschland):
- G-BA Behandlungsrichtlinie: https://www.g-ba.de/richtlinien/32/
- G-BA PAR-Richtlinie: https://www.g-ba.de/richtlinien/124/
- G-BA Individualprophylaxe-Richtlinie: https://www.g-ba.de/richtlinien/31/
- G-BA Festzuschuss-Richtlinie: https://www.g-ba.de/richtlinien/27/
- KZBV Gebührenverzeichnisse (BEMA/GOZ Kontext): https://www.kzbv.de/zahnaerzte/rechtsgrundlagen/bema-und-goz/gebuehrenverzeichnisse/
- KZBV Festzuschüsse: https://www.kzbv.de/zahnaerzte/rechtsgrundlagen/festzuschuesse/
- GOZ (amtliche Fassung): https://www.gesetze-im-internet.de/goz_1987/
- SGB V §28 Zahnbehandlung/Mehrkostenlogik: https://www.gesetze-im-internet.de/sgb_5/__28.html
- SGB V §55 Festzuschüsse: https://www.gesetze-im-internet.de/sgb_5/__55.html

Klinische Leitlinien (AWMF/DGZMK):
- Direkte Kompositrestaurationen (S3): https://www.dgzmk.de/direkte-kompositrestaurationen-an-bleibenden-zaehnen-im-front-und-seitenzahnbereich
- Therapie des dentalen Traumas bleibender Zähne: https://www.awmf.org/service/awmf-aktuell/therapie-des-dentalen-traumas-bleibender-zaehne
- Therapie pulpaler und apikaler Erkrankungen (S3 in Arbeit/Anmeldung): https://www.awmf.org/aktuelles-und-angebot/awmf-aktuell/therapie-pulpaler-und-apikaler-erkrankungen
- Wurzelspitzenresektion: https://www.awmf.org/aktuelles-und-angebot/awmf-aktuell/wurzelspitzenresektion
- Fissuren- und Grübchenversiegelung: https://www.awmf.org/service/awmf-aktuell/fissuren-und-gruebchenversiegelung-1
- Kariesprävention bleibende Zähne: https://www.awmf.org/service/awmf-aktuell/kariespraevention-bei-bleibenden-zaehnen-grundlegende-empfehlungen-1
- Diabetes und Parodontitis: https://www.awmf.org/service/awmf-aktuell/diabetes-und-parodontitis
- Periimplantäre Infektionen: https://www.awmf.org/service/awmf-aktuell/die-behandlung-periimplantaerer-infektionen-an-zahnimplantaten
- Implantationszeitpunkte: https://www.awmf.org/service/awmf-aktuell/implantationszeitpunkte
- Dentale DVT: https://www.awmf.org/service/awmf-aktuell/dentale-digitale-volumentomographie

Hinweis: Für das Produkt sollten nur Quellen mit klarer Aktualität, Leitlinienstatus und fachlicher Trägerschaft in den SSOT-Quellenindex übernommen werden.

## 3) Datenbasis: "häufigste Behandlungen" in Deutschland

Für die Priorisierung nutzen wir primär KZBV-Jahrbuchdaten (GKV-Versorgung), v. a. die Tabelle
"Die häufigsten konservierend-chirurgischen Leistungen je 100 Behandlungsfälle, 2024".

Quelle:
- KZBV Jahrbuch 2025 (PDF): https://www.kzbv.de/system-info/2025-02-10_kzbv_jahrbuch_2025.pdf
- KZBV Jahrbuch-Downloadseite: https://www.kzbv.de/jahrbuch-2025.1773.de.html

Top-20 BEMA-Positionen laut KZBV-Tabelle 2024 (konservierend/chirurgisch):
1. `01`
2. `Ä1`
3. `40`
4. `107`
5. `8`
6. `12`
7. `04`
8. `13b`
9. `Ä925a`
10. `105`
11. `41a`
12. `106`
13. `13a`
14. `38`
15. `Ä935d`
16. `IP4`
17. `10`
18. `IP1`
19. `IP2`
20. `25`

Interpretation für Produktplanung:
- Die Liste ist positionsbasiert (nicht "treatment-pack"-basiert).
- Für V10 wird sie auf klinisch sinnvolle Behandlungs-Packs gemappt.
- Daraus folgt: zuerst stark frequentierte konservierend/chirurgische + Prophylaxe-Pfade, danach PAR/prothetische und implantologische Pfade.

## 4) Portfolioziel: 20 Behandlungen

Status heute im Runtime-Pfad:
- `fuellung`, `endo`, `extraction`, `crown_prep`, `pzr`

Vorschlag Zielportfolio 20 (inkl. bestehender 5):
1. Füllungstherapie
2. Endodontie
3. Extraktion
4. Kronenpräparation
5. PZR
6. Fissurenversiegelung
7. Individualprophylaxe/Fluoridierung
8. Parodontitis systematische Therapie (PAR)
9. Unterstützende PAR-Therapie (UPT)
10. Wurzelspitzenresektion (WSR)
11. Dentales Trauma (Akutversorgung)
12. Direkte Frontzahn-Kompositversorgung (ästhetisch)
13. Inlay/Onlay/Teilkrone
14. Vollkrone
15. Brückenversorgung
16. Modellguss-/Teilprothese
17. Totalprothese
18. Implantation
19. Periimplantitis-/Mukositis-Therapie
20. Schienentherapie (CMD/Bruxismus, sofern im Leistungsrahmen)

## 5) Priorisierung für Umsetzung (nicht alles gleichzeitig)

Welle A (häufige GKV-Fälle, direkt aus Top-Leistungsprofil ableitbar):
- 6 Fissurenversiegelung
- 7 Individualprophylaxe/Fluoridierung
- 8 PAR
- 9 UPT
- 12 Frontzahn-Komposit

Welle B (chirurgisch/endo-nah, evidenzkritisch):
- 10 WSR
- 11 Dentales Trauma
- 19 Periimplantitis
- 18 Implantation

Welle C (prothetische Strecke/Festzuschuss-intensiv):
- 13 Inlay/Onlay/Teilkrone
- 14 Vollkrone
- 15 Brücke
- 16 Teilprothese
- 17 Totalprothese
- 20 Schiene

## 6) Architekturhärtung gegen Redundanz/Drift

### 6.1 Ein zentraler "Treatment Manifest" als einziges Registry-SSOT

Problem heute:
- Treatment-Listen liegen verteilt (`kzv/registry`, preanalysis allowlist, classifier, UI/selector).

Ziel:
- Ein zentrales Manifest, aus dem alle Listen abgeleitet werden.

Vorschlag:
- Neue SSOT-Datei: `src/docudent/contracts/treatments.manifest.ts`
- Felder je Treatment:
  - `treatmentId`
  - `status` (`active|beta|planned`)
  - `domains` (`conservative|endo|surgery|prothetic|prevention|periodontal|implant`)
  - `packSupport` (`procedureGraph`, `kzvTemplate`, `findingMap`, `billingDb`, `obligations`)
  - `sourceProfileId` (Verweis auf medizinische Quellenmatrix)

Alle folgenden Stellen dürfen nur noch aus Manifest lesen:
- `src/docudent/v10/kzv/registry/treatmentRegistry.ts`
- `src/docudent/v10/preanalysis/treatmentIntentContract.ts`
- `src/docudent/v10/multitreatment/classifyTreatment.ts`
- UI-Treatment-Dropdown/-Labels

### 6.2 Zentraler Obligations-Layer (GAP-33 zuerst)

Einführung eines zentralen Moduls vor weiterer Pack-Expansion:
- Regeltyp: `when -> requiresEvidence -> askbackOptions -> outcome`
- Outcome-Werte: `done | not_done | deferred_next_visit`
- Scopes: `global | treatment | instance | tooth`
- Trace: jede Obligation mit `sourceRef` und `ruleId`

Ziel: medizinische Pflichtnachweise nicht mehr über mehrere Event-Dateien verstreuen.

### 6.3 Schichtenmodell mit klaren Grenzen (kein Regel-Duplikat)

Layer A: `facts` (extraction + answers + settings)
- Keine Billing-Entscheidung

Layer B: `obligations` (medizinisch-forensische Muss/Soll-Logik)
- Keine Code-Zuweisung, nur Evidence-/Askback-Entscheidung

Layer C: `procedure graph` (treatment-spezifische Ablauf- und Chip-Logik)
- Nutzt Facts + Obligations-Outcome

Layer D: `billing resolver/combinability`
- Nutzt nur Chips + Versicherungsmodus + SSOT-Billing-KB

Regel:
- Jede Regel existiert genau in einem Layer.
- Gate: gleiche Semantik darf nicht in mehreren Layern wiederholt werden.

### 6.4 Treatment-Onboarding-Contract pro Behandlung

Jede neue Behandlung erhält:
- `treatmentId` + Canonical IDs
- Fact-Schema (Muss-, Soll-, Optional-Felder)
- Obligations-Mapping (mit Leitlinienreferenz)
- Askback-Sätze in Klarsprache
- Procedure-Bundles + Billing-Mapping
- Mindesttestset (Unit + Gate + Hosted Slice)

### 6.5 Gemeinsame Askback-/Terminologie-Bibliothek

Ziel:
- Keine mehrfachen Frageformulierungen/Mapping-Tabellen pro Treatment.

Vorschlag:
- `src/docudent/v10/askbacks/catalog.v1.ts` (kanonische Fragekeys, Labels, Optionen)
- `src/docudent/v10/medical/terminology.v1.json` (Synonyme, Abkürzungen, Varianten)
- Treatments referenzieren nur Keys, nicht eigene Textduplikate.

## 7) Konkrete Umsetzung im Code

Erweiterungen an bestehenden Einstiegspunkten:
- Registry/UI Allowlist:
  - `src/docudent/contracts/treatments.manifest.ts` (neu, zentral)
  - `src/docudent/v10/kzv/registry/treatmentRegistry.ts`
  - `src/docudent/v10/preanalysis/treatmentIntentContract.ts`
  - `src/docudent/v10/multitreatment/classifyTreatment.ts`
- Procedure Graph:
  - `src/docudent/v10/procedure/registry/treatments/index.ts`
  - `src/docudent/v10/procedure/events/*`
- KB/SSOT:
  - `src/docudent/v10/kzv/treatments/<treatmentId>/...`
  - `src/docudent/v10/kb/treatment/...`
- Pipeline wiring:
  - `src/docudent/v10/pipeline/runV10.ts`
  - `src/docudent/v10/pipeline/runV10Bundle.ts`

## 8) Qualitätssicherung (Release-Blocker)

Pro neuer Behandlung verpflichtend:
- Gate: kein unbekannter Chip-Emitter
- Gate: keine fehlenden Event-Bundles
- Gate: deterministischer Output-Hash stabil
- Gate: Billing-Provenance pro Instance
- Hosted E2E: mindestens 3 realistische Diktate (GKV, PKV, Mischfall)

Zusätzlich pro Welle:
- 1 klinischer 20er-Pack mit Root-Cause-Auswertung
- Evidence-Report im Atlas mit Quellenbezug je Pflichtfrage

Neue Architektur-Gates (zusätzlich):
- `gate-treatment-manifest-single-source.test.ts`
  - fail, wenn aktive Treatment-Liste außerhalb Manifest gepflegt wird
- `gate-obligations-layer-no-duplication.test.ts`
  - fail bei semantischen Doppelregeln in Obligations + Event-Bundles
- `gate-askback-catalog-single-source.test.ts`
  - fail bei Inline-Askback-Texten außerhalb Katalog

## 9) Dokumentationsorte (damit es sauber bleibt)

Ablagevorschlag:
- Strategie/Plan:
  - `docs/system-atlas/procedure/treatment-expansion-20-plan-2026-02-16.md`
- Medizinische Quellenmatrix (neu, als SSOT):
  - `docs/system-atlas/medical/treatment-evidence-matrix.v1.md`
- Häufigkeits-/Priorisierungsnachweis (neu):
  - `docs/system-atlas/medical/treatment-frequency-basis-2026-02-16.md`
- Regeln (maschinenlesbar, neu):
  - `src/docudent/v10/procedure/obligations/obligations.v1.json`
- Governance/Gaps:
  - `docs/system-atlas/known-gaps.md` (GAP-33 Fortschritt)

## 10) Praktischer Rollout (empfohlen)

Phase 1 (1-2 Wochen):
- Treatment-Manifest + Obligations-Engine v1 + Gates
- Migration Endo/Füllung auf zentralen Obligations-Layer
- Konsolidierung Askback-Katalog

Phase 2 (2-4 Wochen):
- Welle A (5 neue Behandlungen), inkl. Hosted Audits

Phase 3 (4-8 Wochen):
- Welle B + C inkrementell, pro Behandlung nur mit vollem Testvertrag

## 11) Entscheidungsbedarf

Vor Start sollte Product/Medizinisch entscheiden:
- Welche 5 Behandlungen aus Welle A zuerst (Reihenfolge)
- Welche KZV-/Abrechnungsdetails als Muss in v1 gelten vs. später
- Welche Qualitätskriterien blocker sind (z. B. Pflicht: Hosted grün + Quellenlink pro Obligation)
