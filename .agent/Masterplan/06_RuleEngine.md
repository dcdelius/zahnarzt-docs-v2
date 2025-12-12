# 06 — Regel-Engine (SSOT)

> **Stand:** 2025-12-12  
> **Source of Truth:** regeln/*.json, treatmentEngine.ts

---

## Status: PARTIAL

| Komponente | Anzahl | Getestet | Status |
|------------|--------|----------|--------|
| kombinationen.json | 14 | ~5 | **PARTIAL** |
| fuellung_regeln.json | 18 | ~5 | **PARTIAL** |
| **Gesamt** | **32** | **~10** | **PARTIAL** |

---

## Kernprinzip

> **Die Datenbank ist korrekt → die Engine darf nichts Neues erfinden.**

**Status: PROVEN** (SSOT Compliance Scanner)

---

## Datenbank-Inhalte

| Kategorie | Status | Nachweis |
|-----------|--------|----------|
| BEMA/GOZ-Codes | **PROVEN** | kataloge/*.json |
| Kommentare | **PROVEN** | textSnippets |
| Kombinationsregeln | **PARTIAL** | kombinationen.json |
| Regressfallen | **PARTIAL** | fuellung_regeln.json |
| Logische Bedingungen | **PROVEN** | triggerField/Value |
| Kontextbedingungen | **PROVEN** | insuranceCondition |
| Mehrkostenregeln | **PROVEN** | billingRef.MKV |

---

## Engine-Pflichten

| Pflicht | Status | Nachweis |
|---------|--------|----------|
| Chip → billingRef | **PROVEN** | 23 Billing Tests |
| Verbots-Prüfung | **PARTIAL** | ~5 Kombinationen getestet |
| Pflichtfeld einfordern | **PROVEN** | Golden Master |
| Regelgetriebene Rückfragen | **PROVEN** | questionService.ts |
| Upsell-Anzeige | **PARTIAL** | Engine ok, UI basic |
| MKV-Verrechnung | **PROVEN** | 4 MKV Fixtures |

---

## Regelbasierte Architektur

```
┌─────────────────────────────────────────┐
│            TreatmentEngine              │
├─────────────────────────────────────────┤
│   loadRules()              → PROVEN     │
│   getApplicableRules()     → PROVEN     │
│   generateAuditNotes()     → PARTIAL    │
└─────────────────────────────────────────┘
```

---

## Offene Punkte

- [ ] Alle 32 Regeln explizit testen
- [ ] Dedizierte Kombinationsregel-Testsuite
- [ ] Regress-Szenarien als Fixtures
