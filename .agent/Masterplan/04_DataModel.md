# 04 — Datenmodell (SSOT)

> **Stand:** 2025-12-12  
> **Source of Truth:** knowledgeBase/*.json

---

## Single Source of Truth

> **Die Datenbank ist korrekt → die Engine darf nichts Neues erfinden.**

| Inhalt | Status | Nachweis |
|--------|--------|----------|
| BEMA/GOZ-Codes | **PROVEN** | SSOT Scanner, kataloge/*.json |
| Kommentare | **PROVEN** | In Chip-Definitionen |
| Kombinationsregeln | **PARTIAL** | 14 Regeln, ~5 getestet |
| Regressfallen | **PARTIAL** | In fuellung_regeln.json |
| Logische Bedingungen | **PROVEN** | ruleRefs in Chips |
| Kontextbedingungen | **PROVEN** | triggerField/triggerValue |
| Mehrkostenregeln | **PROVEN** | billingRef.MKV |

---

## Chip-Schema

**Status: PROVEN** (147 Golden Output Tests)

```typescript
interface ChipDefinition {
    id: string;           // "kofferdam"
    label: string;        // "Kofferdam"
    phase: string;        // "vorbereitung"
    category: 'befund' | 'leistung';
    
    textSnippets: {       // PROVEN: Golden Output
        kurz: string;
        mittel: string;
        lang: string;
    };
    
    billingRef: {         // PROVEN: SSOT Scanner
        GKV?: string;     // "BEMA_12"
        PKV?: string;     // "GOZ_2040"
        MKV?: string;     // "GOZ_2197"
    } | null;
    
    requiredFields?: string[];   // PROVEN: Question Tests
    ruleRefs?: string[];         // PARTIAL: 18 Regeln
    forensicNotes?: string[];    // PROVEN: In Chips
    upsellCandidate?: boolean;   // PARTIAL: Engine ok, UI basic
}
```

---

## Regel-Schema

**Status: PARTIAL** (32 Regeln, ~10 getestet)

```typescript
interface RuleDefinition {
    id: string;                 // "RULE_KOFFERDAM_PFLICHT"
    appliesTo: string[];        // ["kofferdam"]
    triggerField?: string;      // "isolation"
    triggerValue?: string;      // "Kofferdam"
    riskLevel: 'hoch' | 'mittel' | 'niedrig';
    questionTrigger?: boolean;
    auditWarning?: string;
}
```

---

## Katalog-Struktur

| Katalog | Status | Nachweis |
|---------|--------|----------|
| bema.json | **PROVEN** | SSOT Scanner |
| goz.json | **PROVEN** | SSOT Scanner |
| kombinationen.json | **PARTIAL** | 14 Regeln |

---

## Engine-Pflichten

| Pflicht | Status |
|---------|--------|
| Chip-ID → billingRef | **PROVEN** |
| Verbote prüfen | **PARTIAL** |
| Pflichtfeld einfordern | **PROVEN** |
| Rückfragen regelgetrieben | **PROVEN** |
| Upsell anzeigen | **PARTIAL** |
| MKV verrechnen | **PROVEN** |
