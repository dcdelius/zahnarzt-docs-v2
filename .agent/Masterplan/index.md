# Docudent Masterplan — Übersicht

> **Stand:** 2025-12-12  
> **Version:** 5.1 (Evidence Standards)

---

## Dokumentation

Dieses Verzeichnis enthält die vollständige Docudent-Architektur.

### Kern-Dokumentation (11 Dateien)

| Datei | Inhalt |
|-------|--------|
| [01_ProductVision.md](./01_ProductVision.md) | Kerngedanke & Grundidee |
| [02_ClinicalWorkflow.md](./02_ClinicalWorkflow.md) | Behandlungsablauf im Praxisalltag |
| [03_EngineArchitecture.md](./03_EngineArchitecture.md) | TreatmentEngine + OutputComposer |
| [04_DataModel.md](./04_DataModel.md) | SSOT-Datenbank & Chip-Schema |
| [05_MultiTreatmentSystem.md](./05_MultiTreatmentSystem.md) | Multi-Treatment Segmentierung |
| [06_RuleEngine.md](./06_RuleEngine.md) | SSOT-Regelengine |
| [07_QuestionEngine.md](./07_QuestionEngine.md) | Regelgetriebene Rückfragen |
| [08_AuditEngine.md](./08_AuditEngine.md) | Audit & Warnungen |
| [09_UX_Flow_Dictation.md](./09_UX_Flow_Dictation.md) | UI/UX Jeton-Flow |
| [10_MVP_Scope.md](./10_MVP_Scope.md) | MVP Definition |
| [11_Roadmap_2025.md](./11_Roadmap_2025.md) | Roadmap & Future Architecture |

### Test & Quality Gates (3 Dateien)

| Datei | Inhalt |
|-------|--------|
| [ProofPack_TestStrategy_v1.md](./ProofPack_TestStrategy_v1.md) | 361 Tests, 9 Blöcke |
| [PROOF_PACK_STATUS.md](./PROOF_PACK_STATUS.md) | Aktueller Gate-Status |
| [Golden_Output_Gate_v2.md](./Golden_Output_Gate_v2.md) | 147 Evidence+Style Tests |

### Meta (2 Dateien)

| Datei | Inhalt |
|-------|--------|
| [masterplan_v3.md](./masterplan_v3.md) | Vollständige Komplett-Referenz |
| [00_REPORT_masterplan_sync.md](./00_REPORT_masterplan_sync.md) | Audit-Report mit Evidence |

---

## Evidence Standards

> **Jede Behauptung im Masterplan muss auditierbar sein.**

### Pflicht-Elemente für Dokumentation

| Element | Beschreibung |
|---------|--------------|
| **Test-Output** | Exaktes Kommando + realer Output als Code-Block |
| **Risiko-Klassifizierung** | PROVEN / NOT TESTED / UNKNOWN / PARTIAL |
| **Regel-Coverage** | Anzahl Regeln vs Anzahl getestete Regeln |
| **Feature-Scope** | MVP / POST-MVP mit Begründung |

### Status-Marker

| Marker | Bedeutung |
|--------|-----------|
| **PROVEN** | Test existiert und PASS |
| **NOT TESTED** | Kein Test vorhanden |
| **PARTIAL** | Teilweise getestet |
| **UNKNOWN** | Status unklar |

---

## Quick Reference

### Kernprinzipien

1. **„Zahnarzt diktiert, Software dokumentiert & rechnet ab"**
2. **SSOT** — Single Source of Truth (JSON-Datenbank)
3. **Regelgetrieben** — Keine Heuristik, keine LLM-Intuition
4. **Template-driven Output** — Composer rendert aus Template+Chips
5. **Evidence-First** — Jede Zeile Output hat EvidenceRef

### Aktive Pfade

```
src/docudent/core/billing/knowledgeBase/
├── behandlungen/     → Chip-JSONs
├── kataloge/         → BEMA/GOZ
├── regeln/           → 32 Regeln (14+18)
├── templates/        → Output-Templates
├── mappings/         → Befund-Mappings
├── disclosures/      → Standard-Texte
└── logic/
    ├── treatmentEngine.ts   → Billing Engine
    └── outputComposer.ts    → Template Renderer

src/docudent/v6/      → Aktive UI
```

### Gate-Kommando

```bash
npm run proof-pack      # 361 Tests, Exit 0 = PASS
npm run proof-pack:full # +E2E
```

### Multi-Treatment Status

**Entscheidung: POST-MVP**

| Komponente | Status |
|------------|--------|
| Engine-Architektur | ✅ PROVEN |
| UI | ❌ NOT TESTED |
| Diktat-Segmentierung | ❌ NOT TESTED |

---

*Für Details siehe Einzeldokumente. Für Audit-Nachweis siehe 00_REPORT.*
