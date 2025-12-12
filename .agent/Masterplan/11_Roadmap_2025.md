# 11 — Roadmap 2025

> **Stand:** 2025-12-12  
> **Source of Truth:** Aktueller Implementierungsstand

---

## Architektur-Prinzipien

| Prinzip | Status |
|---------|--------|
| Segmentierte Engine | **PROVEN** |
| JSON als SSOT | **PROVEN** |
| Regel-Engine | **PARTIAL** (32 Regeln, ~10 getestet) |
| Question-Engine | **PROVEN** |
| Audit-Engine | **PARTIAL** |
| UI getrennt vom Kern | **PROVEN** |

---

## Q1 2025 — Kurzfristig

| Task | Status | Priorität |
|------|--------|-----------|
| Endo JSON + Regeln | **NOT STARTED** | Hoch |
| Chirurgie JSON + Regeln | **NOT STARTED** | Hoch |
| Multi-Tooth Support | **NOT TESTED** | Mittel |
| E2E Browser Tests | **PROVEN** | Done |
| UI Polish | **PARTIAL** | Ongoing |

---

## Q2 2025 — Mittelfristig

| Task | Status | Priorität |
|------|--------|-----------|
| Prophylaxe/UPT/PAR | **NOT STARTED** | Hoch |
| BEL-II Integration | **NOT STARTED** | Mittel |
| ZE Grundlagen | **NOT STARTED** | Hoch |
| AI-Audit-Layer | **NOT STARTED** | Niedrig |

---

## Behandlungs-Erweiterung

```
Aktuell:
├── fuellung_unified.json    ✅ PROVEN

Q1 2025:
├── endo_unified.json        ❌ NOT STARTED
├── chirurgie_unified.json   ❌ NOT STARTED

Q2 2025:
├── prophylaxe_unified.json  ❌ NOT STARTED
├── schmerz_unified.json     ❌ NOT STARTED
```

---

## Erweiterbarkeit

**Status: PROVEN**

Neue Behandlung hinzufügen:
1. `behandlungen/{type}_unified.json` ✅
2. `regeln/{type}_regeln.json` ✅
3. In `treatmentEngine.ts` importieren ✅
4. In UI hinzufügen ✅

**Kein weiterer Code nötig!** → **PROVEN** (Architektur vorhanden)
