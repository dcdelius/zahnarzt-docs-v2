# G117 — Askback-Chip Matrix: Füllung

**Ziel:** Minimale Askbacks, maximale Abrechnungssicherheit

---

## Übersicht

| # | Askback | Trigger | Blocking? | Chip-Effekt |
|---|---------|---------|-----------|-------------|
| 1 | `insurance_type` | Kassenart unbekannt | ✅ JA | Sets billingPath |
| 2 | `mkv_confirmed` | GKV + Seitenzahn + Komposit | ✅ JA | +mkv_valid oder ERROR |
| 3 | `adhesive_technique` | MKV=true, Adhäsiv unklar | ✅ JA | +mehrschicht oder -GOZ_2197 |
| 4 | `capping_performed` | Caries profunda | ✅ JA | +cp oder +cp_not_required |
| 5 | `kofferdam_used` | Kofferdam erwähnt | ❌ NEIN | +kofferdam oder +rel_trocken |

---

## 1. insurance_type

### Medizinischer Grund
Kassenart bestimmt komplett:
- Welche Positionen abrechenbar (BEMA vs GOZ)
- Ob Mehrkosten relevant
- Welche Dokumentation nötig

### Wortlaut (praxisnah)
> "Welche Versicherungsart hat der Patient?"

### Optionen
| Option | Wert | Chip-Delta |
|--------|------|------------|
| "GKV (gesetzlich)" | `GKV` | billingPath = BEMA |
| "PKV (privat)" | `PKV` | billingPath = GOZ |

### Nicht beantwortet
❌ **BLOCK:** Output nicht möglich

---

## 2. mkv_confirmed

### Medizinischer Grund
Ohne schriftliche Vereinbarung VOR Behandlung:
- GOZ-Differenz nicht an Patient berechenbar
- Verstoß gegen § 28 SGB V

### Wortlaut (praxisnah)
> "Liegt eine schriftliche Mehrkostenvereinbarung vor?"

### Optionen
| Option | Wert | Chip-Delta |
|--------|------|------------|
| "Ja, MKV liegt vor" | `true` | +mkv_valid, GOZ-Diff enabled |
| "Nein, keine MKV" | `false` | ❌ ERROR: Behandlung so nicht abrechenbar |

### Nicht beantwortet
❌ **BLOCK:** Seitenzahn-Komposit ohne Klärung nicht dokumentierbar

---

## 3. adhesive_technique

### Medizinischer Grund
GOZ 2197 "Verwendung von Haftvermittlern" erfordert:
- Echte Schmelz-Dentin-Konditionierung
- Mehrschichttechnik (nicht Bulk-Fill!)

### Wortlaut (praxisnah)
> "Wurde Adhäsivtechnik (Mehrschicht) angewendet?"

### Optionen
| Option | Wert | Chip-Delta |
|--------|------|------------|
| "Ja, Mehrschichttechnik" | `true` | +mehrschicht, +adhesive, GOZ_2197 |
| "Nein, Bulk-Fill o.ä." | `false` | +komposit_basic, WARN |

### Nicht beantwortet
❌ **BLOCK:** GOZ 2197 nicht ohne Klärung ansetzbar

---

## 4. capping_performed

### Medizinischer Grund
Bei pulpanaher Karies (caries profunda):
- Cp = indirekte Überkappung
- BEMA 25 nur wenn durchgeführt
- Dokumentationspflicht

### Wortlaut (praxisnah)
> "Wurde eine Überkappung durchgeführt?"

### Optionen
| Option | Wert | Chip-Delta |
|--------|------|------------|
| "Ja" | `true` | +cp, BEMA_25 |
| "Nein" | `false` | +cp_not_required |

### Nicht beantwortet
❌ **BLOCK:** Pulpanahe Karies erfordert Entscheidung

---

## 5. kofferdam_used

### Medizinischer Grund
BEMA 12 nur abrechenbar bei tatsächlicher Anwendung.
"Erwähnt" ≠ "Angelegt"!

### Wortlaut (praxisnah)
> "Wurde Kofferdam angelegt?"

### Optionen
| Option | Wert | Chip-Delta |
|--------|------|------------|
| "Ja" | `true` | +kofferdam, BEMA_12 |
| "Nein, relative Trockenlegung" | `false` | +rel_trocken |

### Nicht beantwortet
⚠️ **DEFAULT FALSE:** Kein BEMA 12 ohne explizite Bestätigung

---

## Verbotene Askbacks

Diese Fragen dürfen NIE gestellt werden:

| Frage | Grund |
|-------|-------|
| "Welches Material?" | Muss aus Diktat kommen oder Standard |
| "Wieviele Flächen?" | Muss aus Diktat extrahiert werden |
| "BEMA oder GOZ?" | Aus Kassenart ableitbar |
| "Adhäsivtechnik?" bei PKV | Immer ja, Standard |
| "Welche Farbe?" | Keine Abrechnungsrelevanz |

---

## Zusammenfassung

- **5 Askbacks** total für Füllungstherapie
- **4 blocking** (ohne Antwort kein Output)
- **1 optional** (default bei Nicht-Antwort)
- **0 informativen** Fragen
