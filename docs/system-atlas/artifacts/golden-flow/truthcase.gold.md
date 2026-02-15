# G102 — End-to-End Truthcase: Goldener Flow

**Rolle:** QA + Zahnarzt  
**Zweck:** Ein vollständiger Truthcase, der den gesamten V10-Flow beweist

---

## Truthcase: `golden_flow_001`

### Metadata
- **ID:** `golden_flow_001`
- **Version:** `1.0.0`
- **Erstellt:** 2025-12-30
- **Treatment:** `fuellung`
- **Insurance:** `GKV`

---

## Schritt 1: Dictation

**Input:**
```
"An Zahn 36 okklusal eine Kompositfüllung adhäsiv, an Zahn 14 distal 
eine kleine Füllung. Lokalanästhesie durchgeführt."
```

---

## Schritt 2: Facts (Extraction Layer)

**Output:**
```json
{
  "teeth": [
    {"tooth": "36", "surfaces": ["o"]},
    {"tooth": "14", "surfaces": ["d"]}
  ],
  "materials": {"filling": "Komposit"},
  "markers": {
    "adhesive_mentioned": true,
    "anesthesia_mentioned": true,
    "kofferdam_mentioned": false
  },
  "keywords": ["okklusal", "adhäsiv", "distal", "kleine Füllung"]
}
```

**Prüfung:**
- ✅ Keine BillingCodes extrahiert
- ✅ Keine medizinischen Entscheidungen
- ✅ Nur Marker, keine Ableitungen

---

## Schritt 3: Medical Layer (applyMedicalKb)

**Input:** Facts aus Schritt 2

**Processing:**
1. Zahn 36: UK Molar → LA-Typ = Leitung
2. Zahn 14: OK Prämolar → LA-Typ = Infiltration
3. `adhesive_mentioned: true` für Zahn 36 → Askback triggern
4. `kofferdam_mentioned: false` → Default zu `rel_trocken`

**Output (vor Askbacks):**
```json
{
  "36": {
    "chips_preliminary": ["la_leitung", "rel_trocken", "exkavation"],
    "askbacks_required": ["adhesive_technique"]
  },
  "14": {
    "chips_preliminary": ["la_infiltr", "rel_trocken", "exkavation", "komposit_basic"],
    "askbacks_required": []
  }
}
```

---

## Schritt 4: Askbacks + Antworten

### Askback: `adhesive_technique` (Zahn 36)

**Frage:** "Wurde Adhäsivtechnik (Mehrschicht) angewendet?"

**Antwort:** `Ja`

**Chip-Delta:**
- ✅ `mehrschicht` hinzugefügt
- ✅ `komposit_basic` nicht emittiert

---

## Schritt 5: Chips Final

**Zahn 36:**
| Chip | Grund |
|------|-------|
| `la_leitung` | UK Molar + anesthesia_mentioned |
| `rel_trocken` | kofferdam_mentioned: false (Default) |
| `exkavation` | Immer bei Füllung |
| `mehrschicht` | Askback: adhesive_technique = Ja |
| `finishing` | Immer |

**Zahn 14:**
| Chip | Grund |
|------|-------|
| `la_infiltr` | OK + anesthesia_mentioned |
| `rel_trocken` | kofferdam_mentioned: false (Default) |
| `exkavation` | Immer bei Füllung |
| `komposit_basic` | Keine Adhäsiv-Erwähnung für diesen Zahn |
| `finishing` | Immer |

---

## Schritt 6: Output (renderFromKbChips)

### Zahn 36 (adhäsiv)

**Text (mittel):**
```
Leitungsanästhesie N. alv. inf. (Ultracain D-S). Relative Trockenlegung. 
Exkavation kariöser Anteile bis sondenharter Konsistenz. 
Ätz-/Adhäsivtechnik (Schmelz/Dentin). Komposit in Mehrschichttechnik 
schichtweise appliziert und lichthärtend. 
Okklusion geprüft/eingeschliffen. Ausarbeitung und Politur.
```

### Zahn 14 (einfach)

**Text (mittel):**
```
LA Infiltration (Ultracain D-S). Relative Trockenlegung. 
Exkavation kariöser Anteile bis sondenharter Konsistenz. 
Komposit eingebracht und lichthärtend polymerisiert. 
Okklusion geprüft/eingeschliffen. Ausarbeitung und Politur.
```

---

## Schritt 7: Billing

### Zahn 36 (GKV)

| Code | Quelle | Chip |
|------|--------|------|
| `BEMA_41a` | la_leitung.billingRef.GKV | `la_leitung` |
| `BEMA_13` | surface_mapping["1"].GKV | 1 Fläche |

**Hinweis:** `mehrschicht` hat `billingRef.MKV: GOZ_2197` — bei reiner GKV keine Zusatzabrechnung.

### Zahn 14 (GKV)

| Code | Quelle | Chip |
|------|--------|------|
| `BEMA_40` | la_infiltr.billingRef.GKV | `la_infiltr` |
| `BEMA_13` | surface_mapping["1"].GKV | 1 Fläche |

### Gesamt-Billing:
```
BEMA_41a × 1  (Leitungsanästhesie)
BEMA_40 × 1   (Infiltrationsanästhesie)
BEMA_13 × 2   (Füllung 1F, je Zahn)
```

---

## Schritt 8: Combinability Check

**Input:** `[BEMA_41a, BEMA_40, BEMA_13, BEMA_13]`

**Prüfung:**
- ✅ BEMA_41a + BEMA_40: Unterschiedliche Zähne → OK
- ✅ BEMA_13 × 2: Unterschiedliche Zähne → OK
- ✅ Keine Ausschlussregeln verletzt

**Verdict:** `PASS`

---

## Zusammenfassung

| Schritt | Status | Kommentar |
|---------|--------|-----------|
| 1. Dictation | ✅ | Definiert |
| 2. Facts | ✅ | Keine verbotenen Ableitungen |
| 3. Medical Layer | ✅ | Chips + Askbacks erzeugt |
| 4. Askbacks | ✅ | Beantwortet, Chip-Delta angewendet |
| 5. Chips Final | ✅ | Pro Zahn dokumentiert |
| 6. Output | ✅ | Text aus KB |
| 7. Billing | ✅ | Codes aus Chips |
| 8. Combinability | ✅ | PASS |

---

## Erklärbarkeit

### Warum `mehrschicht` nur für Zahn 36?
- `adhesive_mentioned: true` bezieht sich auf "adhäsiv" im Diktat
- Diktat sagt explizit "36 okklusal ... adhäsiv"
- Zahn 14 hat KEINE Adhäsiv-Erwähnung
- Askback nur für 36 getriggert

### Warum `BEMA_41a` statt `BEMA_40` für Zahn 36?
- Zahn 36 = UK Seitenzahn
- Standard für UK Seitenzahn = Leitungsanästhesie
- Abgeleitet aus Zahnposition, nicht aus Diktat

### Warum kein `kofferdam`-Chip?
- `kofferdam_mentioned: false`
- Askback `kofferdam_used` hat Default "Nein"
- Ergebnis: `rel_trocken` statt `kofferdam`

---

> [!IMPORTANT]
> Dieser Truthcase ist **vollständig erklärbar**.
> Jeder Chip hat einen dokumentierten Grund.
> Jeder Code hat eine Chip-Quelle.
