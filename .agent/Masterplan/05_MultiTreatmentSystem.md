# 05 — Multi-Treatment System

> **Stand:** 2025-12-12  
> **Source of Truth:** treatmentEngine.ts

---

## Status: POST-MVP

| Komponente | Status | Nachweis |
|------------|--------|----------|
| Engine-Architektur | **PROVEN** | treatmentEngine.ts vorhanden |
| Diktat-Segmentierung | **NOT TESTED** | Nicht implementiert |
| UI Multi-Segment | **NOT TESTED** | Nicht implementiert |
| Multi-Tooth Tests | **NOT TESTED** | Keine Fixtures |

**Begründung POST-MVP:** UI und Segmentierung fehlen komplett.

---

## Warum Multi-Treatment zwingend ist (VISION)

> **Realität im Behandlungszimmer: Der Zahnarzt macht fast nie nur eine Sache.**

---

## Praxis-Beispiele

| Diktat | Status |
|--------|--------|
| "36 Füllung + 35 Endo" | **NOT TESTED** |
| "11 Trepanation, 21 Schmerzbehandlung" | **NOT TESTED** |
| "17 Eiterung → Inzision + Rx + LA" | **NOT TESTED** |

---

## Technische Pipeline (Architektur)

**Status: PROVEN** (Architektur vorhanden)

```typescript
1. normalizeDictation()      // PROVEN
2. extractWords()            // PROVEN
3. detectToothNumbers()      // PROVEN
4. groupByTooth()            // NOT TESTED
5. groupByTreatmentType()    // NOT TESTED

6. Für jedes Segment:        // NOT TESTED
   loadTreatmentChips()      // PROVEN (single)
   inferChipsFromDictation() // PROVEN (single)
   processChipsToBilling()   // PROVEN (single)

7. Zusammenführung           // NOT TESTED
```

---

## Vorteile (bei Implementierung)

| Vorteil | Status |
|---------|--------|
| Realitätsnah | Vision |
| Modular | **PROVEN** (Engine) |
| Erweiterbar | **PROVEN** (JSON-based) |
| Sauber | **NOT TESTED** |
