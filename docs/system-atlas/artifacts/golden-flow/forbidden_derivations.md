# G98 — Verbotene Ableitungen im Extraction Layer

**Rolle:** NLP/LLM-Engineer  
**Zweck:** Definiert, was der Extraction-Layer NICHT tun darf

---

## Grundprinzip

> Der Extraction-Layer extrahiert nur **rohe Fakten**.
> Er trifft **keine medizinischen Entscheidungen**.
> Er erzeugt **keine Abrechnungscodes**.

---

## ❌ VERBOTENE ABLEITUNGEN

### 1. Keine BillingCodes erzeugen

| Falsch | Richtig |
|--------|---------|
| `"billingCode": "BEMA_13"` | `"surfaces": ["o"]` |
| `"gozCode": "GOZ_2060"` | `"filling": "Komposit"` |

**Grund:** BillingCodes sind SSOT des Renderers, nicht der Extraction.

### 2. Keine medizinische Bewertung

| Falsch | Richtig |
|--------|---------|
| `"needsAdhesive": true` | `"adhesive_mentioned": true` |
| `"requiresCapping": false` | `"capping_mentioned": false` |
| `"indicationFilling": true` | - (nicht extrahieren) |

**Grund:** Medizinische Bewertung ist Aufgabe des Medical KB.

### 3. Keine Abrechnungslogik

| Falsch | Richtig |
|--------|---------|
| `"isBillable": true` | - (nicht extrahieren) |
| `"eligibleForMKV": true` | `"adhesive_mentioned": true` |
| `"anesthesiaType": "Leitung"` | `"anesthesia_mentioned": true` |

**Grund:** Anästhesietyp wird aus Zahn abgeleitet, nicht aus Text (außer explizit genannt).

### 4. Keine Default-Annahmen

| Falsch | Richtig |
|--------|---------|
| `"kofferdam": true` | `"kofferdam_mentioned": false` |
| `"vitality": "+"` | - (nur wenn explizit genannt) |
| `"depth": "normal"` | - (nicht annehmen) |

**Grund:** Was nicht gesagt wird, darf nicht angenommen werden.

---

## ✅ ERLAUBTE EXTRAKTIONEN

| Feld | Erlaubt | Beispiel |
|------|---------|----------|
| `teeth` | ✅ | `["36", "14"]` |
| `surfaces` | ✅ | `["o", "d"]` |
| `materials.filling` | ✅ | `"Komposit"` |
| `markers.*_mentioned` | ✅ | `true/false` |
| `negations` | ✅ | `[{"item": "kofferdam"}]` |
| `keywords` | ✅ | Verbatim-Extraktion |

---

## Beispiel: Korrekte Extraction

**Input:**
```
"An Zahn 36 okklusal eine Kompositfüllung adhäsiv, an Zahn 14 distal eine kleine Füllung. Lokalanästhesie durchgeführt."
```

**Output (korrekt):**
```json
{
  "teeth": [{"tooth": "36", "surfaces": ["o"]}, {"tooth": "14", "surfaces": ["d"]}],
  "materials": {"filling": "Komposit"},
  "markers": {
    "adhesive_mentioned": true,
    "anesthesia_mentioned": true,
    "kofferdam_mentioned": false
  }
}
```

**Output (FALSCH):**
```json
{
  "billingCodes": ["BEMA_13", "BEMA_40"],  // ❌ Verboten
  "needsAdhesive": true,                    // ❌ Verboten
  "anesthesiaType": "Leitung"               // ❌ Verboten (nicht explizit genannt)
}
```

---

## Regel-Zusammenfassung

1. **Extrahiere nur, was explizit gesagt wurde**
2. **Markiere Erwähnungen, nicht Entscheidungen**
3. **Leite nichts ab — das macht der Medical Layer**
4. **Keine Codes — das macht der Renderer**
