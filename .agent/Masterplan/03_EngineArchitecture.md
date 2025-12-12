# 03 — Engine-Architektur

> **Stand:** 2025-12-12  
> **Source of Truth:** `treatmentEngine.ts`, `outputComposer.ts`

---

## Übersicht

Die **TreatmentEngine** + **OutputComposer** bilden das Herzstück von Docudent.

| Komponente | Aufgabe |
|------------|---------|
| TreatmentEngine | Chips → Billing-Codes + Warnings |
| OutputComposer | Template → forensischer Output |

---

## Architektur-Diagramm

```
┌─────────────────────────────────────────────────────────────────┐
│                     Processing Pipeline                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Treatment   │  │  Output     │  │   Audit     │              │
│  │ Engine      │  │  Composer   │  │   Notes     │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
│         ▼                ▼                ▼                      │
│  ┌─────────────────────────────────────────────────┐            │
│  │              SSOT Database (JSON)                │            │
│  ├─────────────────────────────────────────────────┤            │
│  │  behandlungen/   kataloge/     templates/       │            │
│  │  mappings/       disclosures/  regeln/          │            │
│  └─────────────────────────────────────────────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## TreatmentEngine

**Pfad:** `logic/treatmentEngine.ts`

| Funktion | Beschreibung |
|----------|--------------|
| `getTreatmentChips()` | Lädt alle Chips für Behandlung |
| `inferChipsFromDictation()` | Keywords → aktive Chips |
| `processChipsToBilling()` | Chips → billingCodes + billingDetails |
| `generateAuditNotes()` | Regeln → warnings + optimizations |
| `checkCombinationConflicts()` | Regress-Prüfung |

**Insurance Routing:**
```typescript
GKV → chip.billingRef.GKV (BEMA)
PKV → chip.billingRef.PKV (GOZ)
MKV → chip.billingRef.MKV (GOZ Zuzahlung)
```

---

## OutputComposer (NEU)

**Pfad:** `logic/outputComposer.ts`

**Zweck:** Template-driven Output-Rendering mit 100% SSOT-Traceability.

### SSOT-Quellen

| Quelle | Pfad | Inhalt |
|--------|------|--------|
| Template | `templates/fuellung_template.json` | Layout, Slots (keine Inhalte) |
| Chips | `behandlungen/fuellung_unified.json` | textSnippets, billingRef |
| Mappings | `mappings/fuellung_finding_map.json` | Befund → Text |
| Disclosures | `disclosures/standard_disclosures.json` | Aufklärung, PostOP |
| Juristik | `juristik/juristik_referenzen.json` | Nur Metadaten |

### Output-Struktur

```typescript
interface ComposedOutput {
    sections: ComposedSection[];
    fullText: string;
    billingCodes: string[];
    warnings: string[];
    _evidenceTrace: {
        allRefs: EvidenceRef[];
        chipIds: string[];
        disclosureIds: string[];
        mappingKeys: string[];
    };
}

interface ComposedSection {
    id: string;
    label: string;
    content: string;
    lines: string[];           // Für Line-Level Tests
    evidenceByLineIndex: EvidenceRef[][];
    evidenceRefs: EvidenceRef[];
}
```

---

## EvidenceRef (Traceability)

Jede Zeile im Output hat einen Evidence-Nachweis:

```typescript
interface EvidenceRef {
    type: 'chip' | 'rule' | 'disclosure' | 'mapping';
    id: string;    // z.B. "kofferdam", "mkv_disclosure"
    source?: string;
}
```

**Geprüft durch:** Golden Output Gate v2 (147 Tests)

---

## Dateipfade

```
src/docudent/core/billing/knowledgeBase/
├── logic/
│   ├── treatmentEngine.ts      ← Billing Engine
│   └── outputComposer.ts       ← Template Renderer (NEU)
├── behandlungen/
│   └── fuellung_unified.json   ← Chip-Definitionen
├── templates/
│   └── fuellung_template.json  ← Output Layout (NEU)
├── mappings/
│   └── fuellung_finding_map.json  ← Befund SSOT (NEU)
├── disclosures/
│   └── standard_disclosures.json  ← Aufklärung (NEU)
├── kataloge/
│   ├── bema.json
│   └── goz.json
└── regeln/
    ├── kombinationen.json
    └── fuellung_regeln.json
```
