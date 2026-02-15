# 08 — Audit-Engine

> **Stand:** 2025-12-12  
> **Source of Truth:** treatmentEngine.ts → generateAuditNotes()

---

## Status: PARTIAL

| Komponente | Status | Nachweis |
|------------|--------|----------|
| generateAuditNotes() | **PROVEN** | Funktion existiert |
| Warnungen (regressRisk) | **PARTIAL** | ~3 getestet |
| Optimierungen | **PARTIAL** | Engine ok |
| forensicNotes | **PROVEN** | In Chip-Definitionen |

---

## Übersicht

> **Die Audit-Engine bewertet den finalen Output und generiert Warnungen & Optimierungen.**

---

## Audit bewertet

| Prüfung | Status |
|---------|--------|
| Fehlen Leistungen? | **PARTIAL** |
| Material fehlt bei Cp? | **PROVEN** (vipr_neg Fixture) |
| Upsell-Chancen? | **PARTIAL** |
| BEMA/GOZ falsch kombiniert? | **PARTIAL** |
| GOZ Faktor? | **NOT TESTED** |
| Zeitliche Bedingungen? | **NOT TESTED** |

---

## Output der Audit-Engine

```typescript
interface AuditResult {
    warnings: string[];       // PARTIAL
    optimizations: string[];  // PARTIAL
}
```

### Warnungen

| Typ | Status |
|-----|--------|
| BEMA 12 ohne Kofferdam | **PARTIAL** |
| BEMA 25 ohne Material | **PROVEN** |
| GOZ 2197 Ausschluss | **PARTIAL** |

### Optimierungen

| Typ | Status |
|-----|--------|
| PKV: GOZ 0080 | **PARTIAL** |
| Fluoridierung | **NOT TESTED** |
| UK-Molar: Leitung | **PROVEN** |

---

## UI-Integration

**Status: PROVEN** (V6 OutputStep zeigt Hinweise)
