# 07 — Question Engine

> **Stand:** 2025-12-12  
> **Source of Truth:** questionService.ts, treatmentEngine.ts

---

## Status: PROVEN

| Komponente | Status | Nachweis |
|------------|--------|----------|
| getMissingRequiredFields() | **PROVEN** | Golden Master |
| getApplicableRules() | **PROVEN** | Engine Tests |
| getUpsellChips() | **PARTIAL** | Engine ok, UI basic |
| questionTrigger Regeln | **PARTIAL** | ~3 Regeln getestet |

---

## Kernprinzip

> **Fragen entstehen aus Regeln und Pflichtfeldern, nicht kreativ.**

**Status: PROVEN** (62 Golden Master Tests)

---

## 3 Quellen für Rückfragen

| Quelle | Status | Nachweis |
|--------|--------|----------|
| Pflichtfelder (`requiredFields`) | **PROVEN** | Golden Master |
| Regeln (`questionTrigger: true`) | **PARTIAL** | Nur ~3 getestet |
| Upsell (`upsellCandidate`) | **PARTIAL** | Engine ok |

---

## Keine frei erfundenen Fragen

| Verboten | Korrekt | Status |
|----------|---------|--------|
| Template-Arrays | getMissingRequiredFields() | **PROVEN** |
| Hardcoded Logik | getApplicableRules() | **PROVEN** |
| Hardcoded MKV_QUESTIONS | getUpsellChips() | **PROVEN** |

---

## Frage-Kategorien

| Kategorie | Icon | Status |
|-----------|------|--------|
| forensic | 🔍 | **PROVEN** |
| upsell | 💡 | **PARTIAL** |
| mkv | 💶 | **PROVEN** |

---

## Sortierung

**Status: PROVEN**

1. Forensik zuerst (rechtlich zwingend)
2. Nach Risiko-Level (hoch → niedrig)
3. Nach Billing-Wert
