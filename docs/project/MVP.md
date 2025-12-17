# MVP — Chairside Documentation (2-Week Target)

> **Status:** Planning  
> **Target:** 5 treatments with dictation → doc text → minimal billing suggestions

---

## Core Principle

**ZMV finalizes billing; system provides suggestions + agreed cost text.**

The system outputs:
1. Documentation text (auto-generated, editable)
2. Billing code suggestions (not final)
3. Patient cost estimate (Mehrkosten)

---

## 5 MVP Treatments

| # | Treatment | Done When |
|---|-----------|-----------|
| 1 | Filling (Füllung) | Dictation extracts tooth/surfaces, outputs doc + BEMA/GOZ suggestion |
| 2 | Endo (WKB) | 3-step model works, dictation selects step, per-canal pricing |
| 3 | Extraction (Extraktion) | Simple extraction with LA, reason documented |
| 4 | PZR (Professionelle Zahnreinigung) | Session + findings documented |
| 5 | Crown Prep (Krone Präparation) | ZE chairside step documented, HKP reference optional |

---

## 1. Filling (Füllung)

**Required Dictation Fields:**
- `tooth` (Zahn 16, 26, etc.)
- `surfaces` (mod, do, etc.)
- `material` (Komposit — default since 2025)
- `vitality` (ViPr +/−)

**Must-Ask Questions (if missing):**
- Tooth number
- Number of surfaces
- Cp/P required?

**Doc Output Skeleton:**
```
BEFUND: Zahn {tooth}, ViPr {vitality}, Perk −
BEHANDLUNG: Kofferdam. Exkavation bis sondenhart. Komposit {surfaces}-flächig. Okklusion geprüft.
ABRECHNUNG: BEMA 13{a-d} (Kassenleistung)
```

**Minimal Billing Suggestion:**
- GKV: BEMA 13a-d (based on surfaces)
- MKV: +GOZ 2197 if Mehrschicht

---

## 2. Endo (Wurzelkanalbehandlung)

**Endo Steps: trepanation, med/prep, obturation**

| Step | Dictation Trigger | Doc Output |
|------|-------------------|------------|
| Trepanation | "Trepanation", "aufgemacht", "Zugang" | Access created, canals located |
| Med/Prep | "Aufbereitung", "Spülung", "med. Einlage" | Canals instrumented, medication placed |
| Obturation | "Füllung", "abgefüllt", "Guttapercha" | Canals obturated, coronal seal |

**Required Dictation Fields:**
- `tooth`
- `canals` (number or "Molar" → 3)
- `step` (inferred from wording or askback)

**Must-Ask Questions:**
- Which step? (if ambiguous)
- Number of canals? (if not stated)

**Doc Output Skeleton (per step):**
```
[Trepanation]
BEFUND: Zahn {tooth}, ViPr −, Percussion +
BEHANDLUNG: LA. Kofferdam. Trepanation. Kanalsuche: {canals} Kanäle. Ca(OH)₂ Einlage.

[Obturation]
BEHANDLUNG: Kofferdam. {canals} Kanäle mit Guttapercha abgefüllt. Rö-Kontrolle.
```

**Billing Suggestion:**
- BEMA 32 (per canal)
- Mehrkosten: per-canal pricing (100€ × canals) + add-ons

---

## 3. Extraction (Extraktion)

**Required Dictation Fields:**
- `tooth`
- `reason` (nicht erhaltungswürdig, Längsfraktur, etc.)

**Must-Ask Questions:**
- Tooth to extract? (if missing)

**Doc Output Skeleton:**
```
BEFUND: Zahn {tooth} nicht erhaltungswürdig ({reason}).
BEHANDLUNG: LA. Extraktion Zahn {tooth}. Wundversorgung.
HINWEIS: Nicht auf die Wunde beißen. Bei Nachblutung auf Tupfer beißen.
```

**Billing Suggestion:**
- GKV: BEMA 45 (Extraktion)
- If surgical: BEMA 48

---

## 4. PZR (Professionelle Zahnreinigung)

**Required Dictation Fields:**
- `areas` (optional: Oberkiefer, alle Zähne)
- `findings` (Zahnstein, Biofilm, etc.)

**Doc Output Skeleton:**
```
BEFUND: Biofilm, Zahnstein vestibulär UK-Front.
BEHANDLUNG: PZR durchgeführt. Ultraschall, Airflow, Politur. Fluoridierung.
HINWEIS: Mundhygiene-Unterweisung erfolgt.
```

**Billing Suggestion:**
- PKV: GOZ 1040
- GKV: BEMA 107/107a (Zahnstein) or private

---

## 5. Crown Prep (Krone Präparation)

**Scope:** Chairside step only (HKP planning is separate module)

**Required Dictation Fields:**
- `tooth`
- `type` (VMK, Vollkeramik, etc. — optional)

**Doc Output Skeleton:**
```
BEFUND: Zahn {tooth}, Indikation zur prothetischen Versorgung.
BEHANDLUNG: Präparation Zahn {tooth} für Krone. Abformung. Provisorium.
```

**Billing Suggestion:**
- References existing HKP if available
- Otherwise: "Abrechnung gem. HKP"

---

## Out of Scope (MVP)

- Full HKP planning wizard
- BEL2 lab order generation
- Multi-tooth bridge planning
- Firestore persistence
- Practice settings admin

---

## Success Criteria

1. Each treatment: dictation → questions → doc output works E2E
2. Billing suggestions appear (not enforced)
3. Mehrkosten shows for endo/filling if applicable
4. No crashes on common dictations
5. All gate tests green
