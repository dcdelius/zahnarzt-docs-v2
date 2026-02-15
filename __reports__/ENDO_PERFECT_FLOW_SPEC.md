# ENDO Perfect Flow Specification

**Version**: 2.0.0  
**Purpose**: Medical review-ready specification for endo question engine.

---

## Overview

The Endo Question Engine V2 deterministically evaluates dictation and generates minimal, medically relevant questions based on visit phase (T1/T2/T3).

### Key Principles

- **Deterministic**: Same input → same output (IDs, ordering stable)
- **Minimal**: Only ask what's truly needed for quality/compliance
- **No Overkill**: Never ask brand, rpm, torque, concentration, time

---

## Visit Phases

| Phase | Label | Required Fields |
|-------|-------|-----------------|
| T1 | Trepanation/Eröffnung | workingLengthMethod, workingLengths, irrigation |
| T2 | Zwischensitzung/Aufbereitung | workingLengthMethod, workingLengths, **apicalSizeISO**, irrigation |
| T3 | Wurzelfüllung/Abschluss | obturationTechnique, masterConeConfirmation, sealerTypeClass |

---

## T2 Question IDs and Order

| Order | Question ID | Severity | Ask Condition |
|-------|-------------|----------|---------------|
| 10 | ENDO_T2_WORKING_LENGTH_METHOD | required | No WL method detected |
| 20 | ENDO_T2_WORKING_LENGTHS | required | "Arbeitslängen" mentioned but no values |
| 25 | ENDO_T2_APICAL_SIZE_ISO | required | No ISO sizes or partial canal coverage |
| 30 | ENDO_T2_IRRIGATION | required | No irrigation solutions detected |
| 40 | ENDO_T2_INSTRUMENTATION_MODE | recommended | No instrumentation mode detected |

---

## 12 Realistic Dictation Scenarios

### Scenario 1: T2 Baseline (Missing Everything)

**Input:**
```
Zahn 36. Zweiter Termin Wurzelkanalbehandlung. Kofferdam angelegt.
Alte medikamentöse Einlage entfernt. Kanäle erneut aufbereitet und gespült.
Arbeitslängen überprüft. Keine Beschwerden.
Neue medikamentöse Einlage mit Kalziumhydroxid. Provisorischer Verschluss.
```

**Expected Questions:**
1. ENDO_T2_WORKING_LENGTH_METHOD (required)
2. ENDO_T2_WORKING_LENGTHS (required)
3. ENDO_T2_APICAL_SIZE_ISO (required)
4. ENDO_T2_IRRIGATION (required)
5. ENDO_T2_INSTRUMENTATION_MODE (recommended)

---

### Scenario 2: T2 with Complete Detection

**Input:**
```
Zahn 46. Zweiter Termin. Kofferdam.
MB 19mm, ML 18mm, D 20mm per EAL bestimmt.
Aufbereitung maschinell. NaOCl und EDTA Spülung.
Einlage CaOH2.
```

**Expected:** No questions (all fields detected)

---

### Scenario 3: T2 with ISO No Canal Mapping

**Input:**
```
Zahn 36. Zwischensitzung. Kofferdam.
Aufbereitung abgeschlossen bis 30/.04. Gespült mit NaOCl.
Einlage erneuert.
```

**Expected:** Detect ISO 30 with taper .04

---

### Scenario 4: T2 Partial ISO

**Input:**
```
Zahn 36. Zweiter Termin. Kofferdam.
MB 19mm ISO 25, ML 18mm ISO 30, D 20mm.
Maschinell aufbereitet. NaOCl, EDTA.
CaOH2 Einlage.
```

**Expected:** Detect explicit ISO 25, 30 values

---

### Scenario 5: T3 Technique Unclear

**Input:**
```
Zahn 16. Dritter Termin. Kofferdam.
Wurzelfüllung durchgeführt. Guttapercha mit Sealer.
Röntgenkontrolle zeigt homogene Füllung.
```

**Expected Questions:**
1. ENDO_T3_OBTURATION_TECHNIQUE (required)

---

### Scenario 6: T1 with EAL No WL Numbers

**Input:**
```
Zahn 26. Erster Termin Wurzelbehandlung.
Trepanation durchgeführt. Kofferdam angelegt.
Kanäle mit Apex Locator dargestellt.
Gespült mit NaOCl. Einlage CaOH2.
```

**Expected:**
- Detect: workingLengthMethod = apex_locator
- Ask: ENDO_T1_WORKING_LENGTHS (required)

---

### Scenario 7: Revision Wording

**Input:**
```
Zahn 36. Endo Revision.
Alte Wurzelfüllung entfernt. Kanäle erneut aufbereitet.
Gespült. Neue Einlage.
```

**Expected:** Infer visit 2 from "Revision"

---

### Scenario 8: ApexLokator Misspelling

**Input:**
```
Zahn 16. Zweiter Termin.
Arbeitslängen per ApexLokator: MB 20, ML 19, P 21.
Aufbereitet bis ISO 25. NaOCl Spülung.
```

**Expected:** Detect apex_locator despite misspelling

---

### Scenario 9: Decimal Comma

**Input:**
```
Zahn 46. Zwischensitzung.
MB 19,5mm, D 20,0mm. Apex Locator.
ISO 30. Maschinell. NaOCl + EDTA.
```

**Expected:** Parse 19,5 as 19.5

---

### Scenario 10: Multiple Teeth

**Input:**
```
Zahn 36 zuvor behandelt. Heute Zahn 46 WKB.
Zweiter Termin. Kofferdam.
Arbeitslängen überprüft. Gespült. Einlage.
```

**Expected:** Pick last tooth (46)

---

### Scenario 11: Kofferdam Not Possible

**Input:**
```
Zahn 36. Zweiter Termin.
Kein Kofferdam möglich wegen Kronenrand.
Maschinell aufbereitet. NaOCl. CaOH2 Einlage.
```

**Expected:**
- Detect kofferdamNotPossible = true
- Do NOT ask ENDO_RUBBER_DAM

---

### Scenario 12: Generic Canals K1/K2/K3

**Input:**
```
Zahn 36. Zwischensitzung.
K1 19mm ISO 25, K2 18mm ISO 25, K3 20mm ISO 30.
Maschinell. NaOCl, EDTA.
```

**Expected:** Detect K1/K2/K3 labels and ISO sizes

---

## Signal Parser Patterns

### ISO Detection

| Pattern | Example | Output |
|---------|---------|--------|
| ISO + number | "ISO 25" | iso: 25 |
| Hash + number | "#25" | iso: 25 |
| German suffix | "25er" | iso: 25 |
| Size with taper | "30/.04" | iso: 30, taper: .04 |
| Canal-specific | "MB ISO 25" | canal: MB, iso: 25 |

### Canal Labels

Standard: MB, ML, DB, DL, D, P  
German: mesiobukkal, mesiolingual, distobukkal, distolingual  
Generic: K1, K2, K3, K4

### Decimal Handling

German comma `19,5` → 19.5

---

## Verification Commands

```bash
npm test endoSignalParser        # 65 tests (V1 + V2)
npm test endoQuestionEngine      # 30 tests (V1 + V2)
npm test gate-jeton-design       # 6 tests
npm test gate-v7-ssot           # 6 tests
```
