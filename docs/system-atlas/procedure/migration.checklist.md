# Procedure Migration Checklist (per Treatment)

**Stand:** 2026-02-11  
**Ziel:** Vollständige Migration auf `Facts → Procedure Graph → Chips → BillingDB`  

---

## Global (für alle Treatments)

- [x] **Coverage-Gate aktivieren**: Alle verwendeten Chips müssen durch Procedure-Nodes emittiert werden (keine Legacy-Emitter). (Test: `src/docudent/v10/__tests__/procedure/procedureCoverageGate.test.ts`)
- [x] **Legacy-Emitter killen**: `question_bank.chipActivation`, `askback.chipEffect`, `answer_map.defaults.alwaysOnChipIds`, `chipResolver` dürfen V10 nicht beeinflussen.
- [x] **No-legacy activation Gates**: `gate-v10-questionbank-no-chipactivation` + `gate-v10-answer-map-no-alwayson`
- [x] **Render-Labels nur über Facts**: `facts.render` befüllen, Composer/Renderer greifen nicht auf Settings zu.
- [x] **KB-Event-Bundle Zielbild**: Trigger/Required/Askback/Emit/Text/Billing/Disclosure pro Event bündeln (SSOT).
- [x] **Event-Bundle Scaffold**: Bundles + `eventBundleId` eingeführt, Gate warnt bei fehlenden Bundles (Common + alle aktuellen Nodes migriert).
- [x] **Bundle‑Meta Registry (alle Treatments)**: Bundle‑Meta erfasst Text/Billing/Disclosure‑Refs, alle aktuellen Treatments nutzen Bundle‑Meta für Chip‑Emission.
- [x] **Disclosure‑Coverage Gate**: Template‑Disclosure‑IDs müssen in Bundle‑Meta vorhanden sein.
- [x] **Billing‑Coverage Gate**: Alle KB‑Billing‑Chips müssen in Bundle‑Meta `billingRefIds` abgedeckt sein.
- [x] **Disclosure‑Overrides autoritativ**: Composer nutzt Bundle‑Meta‑Disclosures, Templates liefern nur Layout.
- [x] **Billing‑Refs aus Bundle‑Meta**: Billing wird aus Bundle‑Meta‑Billable‑Chips abgeleitet.
- [x] **BillingDB Snapshot**: V10 nutzt BillingDB‑Snapshot statt KB als Billing‑Quelle.
- [x] **Combinability Coverage**: harte Gate-Checks pro Treatment + Regelabdeckung dokumentiert.
- [x] **Procedure‑Coverage Report**: `coverage-report-2026-02-10.md` (KB‑Chips vs Bundle‑Meta)

---

## Fuellung

**Facts → Procedure**
- [x] Facts vollständig: Material, Schichtung, Matrix, Adhäsiv, Kofferdam, LA, Cp/P, Tiefen/Diagnosen (Gate: `gate-fuellung-facts-completeness`)
- [x] Defaults: Material/Schichtung/Matrix aus Settings → Facts → Procedure Match

**Procedure Graph**
- [x] Alle aktiven Chips aus `treatments/fuellung/unified.json` im Graph abgebildet (Coverage Report 2026‑02‑10)
- [x] Constraints: Cp vs P (gegenseitig), MKV nur bei bestätigter Mehrkostenvereinbarung

**Askbacks**
- [x] Nur Facts, keine Chip-Aktivierung (chipActivation/chipEffect = 0)
- [x] Missing Facts → Askbacks (Cp‑Material, Schichtung, Adhäsiv, Material, Isolation)

**Gates**
- [x] Coverage-Gate pass (Fuellung)
- [x] No‑Legacy‑Emitter Gate pass

---

## Endo

**Facts → Procedure**
- [x] WL‑Methode, WF‑Technik, Spülung, Einlage, Kanalzahl vollständig verdrahtet
- [x] Defaults aus Settings ziehen, Askback nur bei fehlender Info

**Procedure Graph**
- [x] Alle Endo‑Chips im Graph abgebildet (Coverage Report 2026‑02‑10)
- [x] Steps/Phasen korrekt (Trepanation/Vorbereitung/Obturation etc.) — Steps‑Flags + Test vorhanden

**Askbacks**
- [x] Nur Facts, keine Chip-Aktivierung (Procedure‑Askbacks mit KB gemerged)

**Gates**
- [x] Coverage-Gate pass (Endo)
- [x] No‑Legacy‑Emitter Gate pass

---

## Extraction

**Facts → Procedure**
- [x] Wundversorgung/Naht/Materialien vollständig (Wundversorgung/Naht + Oberflächenanästhesie erkannt)

**Procedure Graph**
- [x] Alle Extraction‑Chips im Graph (Coverage Report 2026‑02‑10)

**Askbacks**
- [x] Nur Facts, keine Chip-Aktivierung
- [x] Missing Facts → Askbacks (LA‑Typ, Wundversorgung)

**Gates**
- [x] Coverage-Gate pass (Extraction)
- [x] No‑Legacy‑Emitter Gate pass

---

## PZR

**Facts → Procedure**
- [x] Art/Umfang der PZR vollständig (Zahnstein/Fluorid + LA/Surface erkannt)

**Procedure Graph**
- [x] Alle PZR‑Chips im Graph (Coverage Report 2026‑02‑10)

**Askbacks**
- [x] Missing Facts → Askbacks (Zahnstein/Fluoridation)

**Gates**
- [x] Coverage-Gate pass (PZR)
- [x] No‑Legacy‑Emitter Gate pass

---

## Crown Prep

**Facts → Procedure**
- [x] Präparation/Abformung/Provisorium vollständig (Detektion aus Diktat)

**Procedure Graph**
- [x] Alle Crown‑Prep‑Chips im Graph (Coverage Report 2026‑02‑10)

**Askbacks**
- [x] Missing Facts → Askbacks (Präparation/Abformung/Provisorium)

**Gates**
- [x] Coverage-Gate pass (Crown Prep)
- [x] No‑Legacy‑Emitter Gate pass

---

## Nächste Schritte (automatisiert)

1. Coverage‑Audit pro Treatment (zeigt fehlende Chips).
2. Procedure‑Nodes ergänzen bis Coverage = 100 %.
3. Gates scharf schalten (fail on missing coverage).
