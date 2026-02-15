# G99 — Medical Layer: Chips + Askbacks als medizinische Wahrheit

**Rolle:** Medical Knowledge Engineer  
**Zweck:** applyMedicalKb trifft alle medizinischen Entscheidungen

---

## Grundprinzip

> **Der Medical Layer entscheidet.**
> Er empfängt Facts und erzeugt Chips + Askbacks.
> Der Renderer empfängt Chips und erzeugt Text + Billing.

---

## 1. Chip-Erzeugung für den Referenzfall

### Zahn 36 (okklusale Kompositfüllung, adhäsiv)

| Chip | Bedingung | Erzeugt automatisch? |
|------|-----------|---------------------|
| `la_leitung` | UK Seitenzahn + LA erwähnt | ✅ Ja (aus Zahnposition) |
| `rel_trocken` | Kofferdam NICHT erwähnt | ✅ Ja (Default wenn kein Kofferdam) |
| `exkavation` | Immer bei Füllung | ✅ Ja |
| `mehrschicht` | Adhäsiv erwähnt + Askback bestätigt | ⚠️ Nach Askback |
| `komposit_basic` | Fallback wenn kein Adhäsiv | ✅ Ja (wenn Askback: Nein) |
| `finishing` | Immer | ✅ Ja |

### Zahn 14 (distale einfache Füllung)

| Chip | Bedingung | Erzeugt automatisch? |
|------|-----------|---------------------|
| `la_infiltr` | OK + LA erwähnt | ✅ Ja (aus Zahnposition) |
| `rel_trocken` | Kofferdam NICHT erwähnt | ✅ Ja |
| `exkavation` | Immer bei Füllung | ✅ Ja |
| `komposit_basic` | Keine Adhäsiv-Erwähnung für Zahn 14 | ✅ Ja |
| `finishing` | Immer | ✅ Ja |

---

## 2. Askback-Definitionen

### Askback: `adhesive_technique`

**Wann:** `adhesive_mentioned = true` UND Zahn ist okklusaler Molar

**Frage:** "Wurde Adhäsivtechnik (Mehrschicht) angewendet?"

| Antwort | Chip-Effekt |
|---------|-------------|
| Ja | `mehrschicht` emittiert, `komposit_basic` unterdrückt |
| Nein | `komposit_basic` emittiert |
| Keine Antwort | **BLOCKED** — kein Billing für Füllung erlaubt |

**Warum existiert sie:**
- Adhäsivtechnik ist abrechnungsrelevant (GOZ 2197 bei MKV)
- Darf nicht automatisch angenommen werden
- Unterschied zwischen "erwähnt" und "durchgeführt"

### Askback: `kofferdam_used`

**Wann:** Immer (für Füllung + Endo)

**Frage:** "Wurde Kofferdam angelegt?"

| Antwort | Chip-Effekt |
|---------|-------------|
| Ja | `kofferdam` emittiert |
| Nein | `rel_trocken` emittiert |
| Keine Antwort | `rel_trocken` als Default (sicher) |

**Warum existiert sie:**
- BEMA 12 nur bei dokumentiertem Kofferdam
- Wichtig für Forensik

### Askback: `anesthesia_type` (optional)

**Wann:** `anesthesia_mentioned = true` UND Typ nicht eindeutig aus Zahn ableitbar

**Frage:** "Welche Anästhesie wurde durchgeführt?"

| Antwort | Chip-Effekt |
|---------|-------------|
| Infiltration | `la_infiltr` |
| Leitung | `la_leitung` |
| Keine | Kein LA-Chip |

**Warum existiert sie:**
- Nur wenn Zahnposition keine eindeutige Ableitung erlaubt
- UK Frontzahn kann beides sein

---

## 3. Default-Regeln

### Erlaubte Defaults

| Default | Wann? | Begründung |
|---------|-------|------------|
| `rel_trocken` | Wenn kein Kofferdam erwähnt | Sichere Annahme |
| `finishing` | Immer | Medizinischer Standard |
| `vipr_pos` | Wenn nicht negativ erwähnt | Häufigster Fall |
| `perk_neg` | Wenn nicht positiv erwähnt | Häufigster Fall |

### Verbotene Defaults

| Kein Default für | Grund |
|------------------|-------|
| `kofferdam` | Abrechnungsrelevant, muss dokumentiert sein |
| `mehrschicht` | Abrechnungsrelevant (MKV) |
| `cp` / `p` | Nur bei expliziter Indikation |
| Materialwahl | Dokumentationspflicht |

---

## 4. Chip-Abhängigkeiten

```
adhesive_mentioned: true
        ↓
    Askback: adhesive_technique?
        ↓
    [Ja] → mehrschicht
    [Nein] → komposit_basic
    [---] → BLOCKED (kein Billing)
```

```
kofferdam_mentioned: false
        ↓
    Askback: kofferdam_used?
        ↓
    [Ja] → kofferdam
    [Nein] → rel_trocken
    [---] → rel_trocken (Default)
```

---

## 5. Was passiert bei unbeantworteten Askbacks?

| Askback | Unbeantworteter Zustand |
|---------|------------------------|
| `adhesive_technique` | **HARD BLOCK** — keine Füllung abrechenbar |
| `kofferdam_used` | Default zu `rel_trocken` |
| `capping_material` | **HARD BLOCK** — keine Cp/P abrechenbar |
| `anesthesia_type` | Aus Zahn ableiten (soft default) |

---

## Zusammenfassung

**Für den Referenzfall (36 okkl adhäsiv, 14 dist einfach):**

1. Extractor liefert: `teeth`, `adhesive_mentioned: true`, `anesthesia_mentioned: true`
2. Medical Layer fragt: "Adhäsivtechnik angewendet?" (nur für 36)
3. Antwort "Ja" → Chips für 36: `la_leitung`, `rel_trocken`, `exkavation`, `mehrschicht`, `finishing`
4. Chips für 14: `la_infiltr`, `rel_trocken`, `exkavation`, `komposit_basic`, `finishing`
5. Renderer erzeugt Text + Billing aus Chips
