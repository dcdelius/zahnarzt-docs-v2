# Treatment Frequency Basis (Germany) - 2026-02-16

## 1) Purpose

This document defines the frequency-driven basis for selecting and ordering the next treatment implementations in V10.

## 2) Primary Source

KZBV yearbook pages for relative frequencies in conservative/surgical care (2024):
- https://www.kzbv.de/service/statistisches-jahrbuch/jahrbuch-2025/
- https://www.kzbv.de/wp-content/uploads/Seiten_101_bis_103_KZBVJB2025.pdf

Table used:
- "Positionen mit den hoechsten relativen Haeufigkeiten im Bereich kons./chir. Behandlung 2024"

## 3) Top-20 Position Signals (per 100 treatment cases)

| Rank | Position | Frequency | Position label (as listed) |
|---|---|---:|---|
| 1 | `01` | 82.3 | Untersuchung |
| 2 | `Ae1` | 31.7 | Beratung |
| 3 | `40` | 13.3 | Infiltrationsanaesthesie |
| 4 | `107` | 12.8 | Entfernen harter Zahnbelaege |
| 5 | `8` | 12.4 | Sensibilitaetspruefung |
| 6 | `12` | 11.8 | Besondere Massnahmen beim Fuellen von Kavitaten |
| 7 | `04` | 11.4 | PSI |
| 8 | `13b` | 8.5 | Einflaechige Fuellung |
| 9 | `Ae925a` | 7.9 | Rontgenaufnahme |
| 10 | `105` | 6.8 | Beseitigen stoerender Reize/Kanten |
| 11 | `41a` | 6.5 | Leitungsanaesthesie |
| 12 | `106` | 6.4 | Nachbehandlung nach chirurgischem Eingriff |
| 13 | `13a` | 6.1 | Zweiflaechige Fuellung |
| 14 | `38` | 5.8 | N |
| 15 | `Ae935d` | 5.5 | Panoramaaufnahme |
| 16 | `IP4` | 5.3 | Lokale Fluoridierung |
| 17 | `10` | 5.2 | Behandlung ueberempfindlicher Zahnflaechen |
| 18 | `IP1` | 5.1 | Erhebung Mundhygienestatus |
| 19 | `IP2` | 5.1 | Mundhygieneaufklaerung |
| 20 | `25` | 4.7 | Indirekte Ueberkappung |

## 4) Product Interpretation (Inference)

Important: the KZBV table is position-level billing data, not pack-level treatment definitions.

For Docudent implementation, these signals are mapped into:
1. Shared capabilities (cross-treatment): anesthesia, radiology, diagnostics, consent/MKV, follow-up.
2. Treatment packs (clinical workflows): fillings, endo, extraction, PAR/UPT, prosthetics, trauma, implant, etc.

This avoids creating redundant pseudo-packs for every cross-cutting single position.

## 5) Mapping to V10 Implementation Priorities

| Position signal cluster | V10 impact |
|---|---|
| `01`, `Ae1` | `untersuchung` pack + shared consultation/baseline blocks |
| `40`, `41a` | shared anesthesia capability across all relevant packs |
| `Ae925a`, `Ae935d` | `roentgen` pack + shared radiology capability |
| `8`, `04` | shared diagnostics capability (vitality/percussion/PSI) + PAR/endo/filling hooks |
| `13a`, `13b`, `12`, `25` | `fuellung` + `ueberkappung` depth/material variants |
| `107`, `IP1`, `IP2`, `IP4`, `10` | `pzr`, `fissurenversiegelung`, prophylaxis/follow-up patterns |
| `106`, `105`, `38` | surgical/aftercare obligations across extraction/WSR/trauma |

## 6) Secondary Validation Source

KZBV indicator page (fillings, extractions, root-canal trends):
- https://www.kzbv.de/indikator-2-zahnfuellungen-zahnextraktionen-und-wurzelbehandlungen.1726.de.html

Use this for trend plausibility checks, not as the primary rank source.

