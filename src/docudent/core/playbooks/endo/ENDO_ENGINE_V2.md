# Endo Question Engine V2 — Standard Mode vs Deviation Mode

**Version**: 2.0.0  
**Purpose**: Medically plausible, audit-friendly questioning for endodontic treatments.

---

## Overview

The Endo Question Engine V2 handles both **standard flows** (ideal 3-visit plan) and **deviations** (real-world scenarios: partial negotiability, pain persists, cannot reach apex).

---

## Standard Mode (V1/V2)

Questions are asked based on visit phase (T1/T2/T3) when information is missing from dictation.

### T2 Required Questions
| ID | Question | Condition |
|----|----------|-----------|
| ENDO_T2_WORKING_LENGTH_METHOD | How WL determined? | Method not detected |
| ENDO_T2_WORKING_LENGTHS | WL per canal | Values missing |
| ENDO_T2_APICAL_SIZE_ISO | ISO per canal | ISO missing |
| ENDO_T2_IRRIGATION | Spüllösungen | Not detected |
| ENDO_T2_INSTRUMENTATION_MODE | Maschinell/Manuell | Not detected (recommended) |

---

## Deviation Mode

Triggered when dictation indicates deviation from standard plan:
- Partial canal negotiability
- Pain persists
- Cannot reach apex
- Re-medication despite planned obturation

### Deviation Triggers

| Flag | Detection Patterns |
|------|-------------------|
| `PAIN_PERSISTENT` | "noch schmerzhaft", "druckdolent", "weiterhin Schmerzen" |
| `PARTIAL_NEGOTIABILITY` | "nicht bis apex", "nicht passierbar", "obliteriert", "kalzifiziert" |
| `NO_OBTURATION_DESPITE_PLAN` | "abfüllen geplant" + medicament outcome |
| `EXUDATE_PRESENT` | "Exsudat", "Pus", "Eiter" |
| `RE_MEDICATION` | "erneut CaOH2", "nochmal Einlage", "wieder Einlage" |
| `INSTRUMENT_SEPARATION` | "Feile frakturiert", "Instrument abgebrochen" |
| `RETREATMENT` | "Revision", "Wiederbehandlung" |

### Deviation Questions

| ID | Question | Severity | Condition |
|----|----------|----------|-----------|
| Q_ENDO_CANAL_STATUS | Confirm canal negotiability | required | Partial negotiability detected |
| Q_ENDO_LIMITATION_REASON | Why canal not to apex? | required | Canal not negotiable, no reason |
| Q_ENDO_WL_PER_CANAL | WL for negotiable canals | required | WL missing for negotiable canal |
| Q_ENDO_ISO_PER_CANAL | ISO for instrumented canals | required | ISO missing after instrumentation |
| Q_ENDO_WHY_NO_OBTURATION | Why no obturation? | required | Pain persists or plan mismatch |
| Q_ENDO_MEDICATION_USED | Confirm medicament | required | Re-medication detected |
| Q_ENDO_NEXT_VISIT_PLAN | Plan for next visit | recommended | Any deviation |

---

## Canal State Tracking

Each canal tracks:
- `negotiableToApex`: true / false / null
- `workingLengthMm`: number (if apex reached)
- `reachedLengthMm`: number (if apex NOT reached)
- `fileIso`: number (ISO size)
- `limitationReason`: calcified / ledge / blocked / curved / instrumentSeparation

---

## Detection Examples

### Example 1: Partial Negotiability (Tooth 26)

**Dictation:**
```
Zahn 26. Zwischensitzung. Kofferdam.
P 21mm ISO 30.
MB nicht bis Apex erreichbar, kalzifiziert ca. 15mm.
Gespült NaOCl, EDTA. CaOH2 Einlage.
```

**Parsed:**
- deviationMode: true
- deviationFlags: [PARTIAL_NEGOTIABILITY]
- canalStates:
  - P: negotiableToApex=true, WL=21, ISO=30
  - MB: negotiableToApex=false, limitationReason=calcified

**Questions:**
1. Q_ENDO_CANAL_STATUS (confirm statuses)
2. Q_ENDO_NEXT_VISIT_PLAN (recommended)

---

### Example 2: Pain Persists

**Dictation:**
```
Heute abfüllen geplant. Patient noch schmerzhaft.
Erneut CaOH2 Einlage.
```

**Questions:**
1. Q_ENDO_WHY_NO_OBTURATION (required)
2. Q_ENDO_MEDICATION_USED (required)
3. Q_ENDO_NEXT_VISIT_PLAN (recommended)

---

## Non-Goals

Engine does **NOT** ask:
- File brand (ProTaper, WaveOne, etc.)
- RPM / Torque settings
- NaOCl concentration (3%, 5.25%)
- Irrigation time

---

## Test Coverage

| Suite | Tests |
|-------|-------|
| endoSignalParser (V1) | 26 |
| endoSignalParser.v2 | 39 |
| endoSignalParser.deviation | 26 |
| endoQuestionEngine (V1) | 15 |
| endoQuestionEngine.v2.golden | 15 |
| endoQuestionEngine.deviation | 20 |
| **Total** | **141** |

---

## Verification

```bash
npm test endoSignalParser endoQuestionEngine
```
