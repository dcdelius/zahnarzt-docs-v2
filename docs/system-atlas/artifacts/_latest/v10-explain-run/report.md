# ExplainRun Report

**Generated**: 2026-02-03T19:35:46.711Z
**Hash**: `ad72a056ac11a69a`

---

## Input

| Property | Value |
|----------|-------|
| Treatment | fuellung |
| Insurance | GKV |
| Teeth | 1 |
| Dictation | "Zahn 36 mo Komposit..." |

## Extraction

- Engine: llm
- Tooth: 36
- Surfaces: m, o

## Facts

| Key | Value | Source | Confirmed |
|-----|-------|--------|-----------|
| bleeding | {"detected":"unknown"} | dictation | true |
| capping | {"performed":"unknown"} | dictation | true |
| cariesDepth | "unknown" | dictation | true |
| sensitivity | {"reported":"unknown"} | dictation | true |
| treatmentId | "fuellung" | dictation | true |

## Fired Rules

| Rule ID | Type | Scope | Outcome |
|---------|------|-------|---------|

## Chips

| Chip ID | Scope | Billing Eligible | Blocked |
|---------|-------|------------------|---------|
| fuellung_grundleistung | session | true | false |
| fuellung_material_komposit | session | true | false |
| mehrschicht | session | true | false |

## Billing Codes

| Code | System | Source Chip | Scope |
|------|--------|-------------|-------|
| BEMA_13b | BEMA | unknown | session |

## Combinability

**Verdict**: PASS

No conflicts.

## Text Blocks

### Block 0: main

[Befund]
Zahn 36. MO

[Aufklärung]
Der Patient wurde über Behandlungsalternativen, Risiken und den voraussichtlichen Behandlungsablauf informiert.

[Behandlungsablauf]
Zunächst Zahn 36 (MO): Füllungstherapie{depthDisplay}. Daraufhin Ätz-/Adhäsivtechnik (Schmelz/Dentin). Komposit in Mehrschichttechnik schichtweise appliziert und lichthärtend. Abschließend Füllung mit lichthärtendem Komposit (komposit) durchgeführt.

[Durchgeführte Leistungen]
• Komposit Mehrschichttechnik.

[Hinweise]
Der Patient wurde über Verhaltensregeln nach der Behandlung informiert.

Chips: fuellung_grundleistung, fuellung_material_komposit, mehrschicht

## KB Metadata

| KB | Version | Hash |
|----|---------|------|
| Medical | 1.0.0 | b7d403b2 |
| Treatment | 2025-01-v2 | 259a2bc9 |
| Combinability | 1.1.0 | m16-v1-t |