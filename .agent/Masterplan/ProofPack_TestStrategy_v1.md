# Proof Pack Test Strategy v1

> Stand: 2025-12-12 | Version: 4.0 (Golden Output Gate v2)

---

## Gate-Kommandos

| Kommando | Inhalt | Dauer |
|----------|--------|-------|
| `npm run proof-pack` | Unit-Tests + Static Analysis + Golden Output | ~8s |
| `npm run proof-pack:full` | proof-pack + E2E (Auto-Server) | ~30s |

**Exit-Code:**
- `0` = PASS (alle Tests grün)
- `≠ 0` = FAIL (mindestens ein Test rot)

---

## Test-Blöcke Übersicht

| Block | Tests | Prüft |
|-------|-------|-------|
| SSOT Compliance | 1 | Hardcoded Billing-Codes |
| Billing Routing | 1 | Engine als Single Source |
| Golden Master | 62 | Pipeline-Ergebnisse |
| Property Tests | 20 | Invarianten |
| Ugly Whisper | 58 | Normalizer-Robustheit |
| Conflict Fuzzer | 15 | Chip-Kombinationen |
| Billing Completeness | 23 | Versicherungs-Routing |
| Output Integrity | 36 | Struktur-Invarianten |
| **Golden Output v2** | **147** | Evidence Plan, Style Rules, Juristik |
| **Gesamt** | **363** | |

---

## A. SSOT Compliance Scanner

| | |
|---|---|
| **Kommando** | `node scripts/ssot-compliance-scanner.cjs` |
| **Prüfung** | Sucht hardcoded Billing-Codes in Produktion |
| **PASS** | 0 FORBIDDEN findings |
| **FAIL** | ≥1 FORBIDDEN finding |

---

## B. Billing Routing Proof

| | |
|---|---|
| **Kommando** | `node scripts/billing-routing-proof.cjs` |
| **Prüfung** | Alle Billing-Pfade durch TreatmentEngine |
| **PASS** | Alle 3 Checks grün |
| **FAIL** | Mindestens 1 Check rot |

---

## C. Golden Master Suite

| | |
|---|---|
| **Kommando** | `npm run test:golden` |
| **Tests** | 62 |
| **Prüfung** | Deterministische Pipeline-Ergebnisse |

---

## D. Property Tests

| | |
|---|---|
| **Kommando** | `npm run test:property` |
| **Tests** | 20 |
| **Prüfung** | Invarianten (Normalizer, Engine, Routing) |

---

## E. Ugly Whisper Suite

| | |
|---|---|
| **Kommando** | `npm run test:whisper` |
| **Tests** | 58 |
| **Prüfung** | Normalizer crasht nie, liefert validen FDI |

---

## F. Conflict Fuzzer

| | |
|---|---|
| **Kommando** | `npm run test:fuzzer` |
| **Tests** | 15 |
| **Prüfung** | Engine crasht nie, deterministisch |

---

## G. Billing Completeness

| | |
|---|---|
| **Kommando** | `npm run test:billing` |
| **Tests** | 23 |
| **Prüfung** | GKV→BEMA, PKV→GOZ, MKV→BEMA+GOZ |

---

## H. Output Integrity

| | |
|---|---|
| **Kommando** | `npm run test:integrity` |
| **Tests** | 36 |
| **Prüfung** | Keine undefined/null/NaN, Arrays korrekt |

---

## I. Golden Output v2 (NEU)

| | |
|---|---|
| **Kommando** | `npm run test:golden-output` |
| **Fixtures** | 10 (GKV, PKV, MKV, Devital, etc.) |
| **Tests** | 147 |

**Kategorien:**
- Structure & Order (30)
- Evidence Coverage (30)
- Dedupe (10)
- Billing (20)
- Style Rules (50)
- Warnings (4)
- Juristik Static (3)

**Evidence Gate:**
Jede Zeile im Output muss evidenceRef haben (chip/mapping/disclosure/rule).

**Style Rules:**
- maxBulletRatio: 0.45
- minProseSentences: 1
- maxConsecutiveBullets: 6
- forbiddenTokens: undefined, null, NaN

**Juristik Gate:**
Templates/Disclosures dürfen nicht enthalten: §, SGB, BGB, gemäß

---

## E2E Tests

| | |
|---|---|
| **CI** | `npm run test:e2e:ci` |
| **PASS** | Alle 3 Smoke Tests grün |

---

## Risiken (IST-Stand)

### Nicht implementiert

| Risiko | Impact |
|--------|--------|
| Endo/Chirurgie JSON | Nur Füllung |
| Multi-Treatment UI | Nicht vollständig |

### Nicht abgedeckt

| Lücke | Status |
|-------|--------|
| E2E nicht deterministisch | Separiert in proof-pack:full |
| >5 Flächen Edge Case | Nicht getestet |

---

## Zusammenfassung

| Metrik | Wert |
|--------|------|
| Test-Blöcke | 9 |
| Gesamt-Tests | 363 |
| Fixtures | ~85 |
| Gate-Kommando | `npm run proof-pack` |
| Release-Gate | `npm run proof-pack:full` |
