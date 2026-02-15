# GP3 — Manual UI Playbook: Golden Mode Askbacks

**Ziel:** Frontend-Beweis, dass Askbacks im UI erscheinen

---

## Voraussetzungen

1. Dev Server läuft: `npm run dev`
2. Browser öffnen: `http://localhost:5173`

---

## Test-Szenario 1: Maximale Askbacks

### Setup
1. Navigiere zu `/docudent/v10`
2. Öffne Debug Drawer (falls vorhanden)
3. Aktiviere **goldenMode** Toggle

### Diktat eingeben
```
Füllung Zahn 36 okklusal
```

### Erwartete Askbacks (mind. 4)

| # | Askback | Frage |
|---|---------|-------|
| 1 | `fuellung_material` | "Welches Material wurde verwendet?" |
| 2 | `fuellung_isolation` | "Welche Isolation wurde verwendet?" |
| 3 | `fuellung_pulpaschutz` | "Wurde Pulpaschutz angewendet?" |
| 4 | `fuellung_insurance_context` | "Welcher Versicherungskontext?" |

### Verifikation
- [ ] State wechselt zu `questions`
- [ ] Mindestens 4 Askbacks werden angezeigt
- [ ] Jeder Askback hat klickbare Optionen

---

## Test-Szenario 2: Komposit-spezifische Askbacks

### Setup
Gleich wie Szenario 1, aber:

### Diktat eingeben
```
Füllung Zahn 36 okklusal Komposit
```

### Erwartete zusätzliche Askbacks

| # | Askback | Frage |
|---|---------|-------|
| 5 | `fuellung_adhesive` | "Wurde Adhäsivtechnik durchgeführt?" |
| 6 | `fuellung_layering` | "Wurde Schichttechnik verwendet?" |

### Verifikation
- [ ] Adhesive-Askback erscheint (weil material=composite)
- [ ] Layering-Askback erscheint (weil cavityExtent=medium + composite)

---

## Test-Szenario 3: Askback → Chip → Output

### Ablauf
1. Beantworte `fuellung_material` → "Komposit"
2. Beantworte `fuellung_isolation` → "Kofferdam"
3. Klicke "Fertigstellen"

### Erwartete Chips
- `fuellung_material_composite` ✅
- `kofferdam` ✅

### Erwarteter Output
- Text enthält "Kompositfüllung"
- Text enthält "Kofferdam" oder "absolute Trockenlegung"

### Verifikation
- [ ] Output-Text aktualisiert sich
- [ ] Chips sind sichtbar (Debug Drawer oder Chip Panel)

---

## Fehlerbehebung

### Askbacks erscheinen nicht
1. Prüfe: goldenMode aktiviert?
2. Prüfe: treatmentId = fuellung?
3. Prüfe: Console auf Errors

### Chips nicht sichtbar
1. Öffne Debug Drawer
2. Suche "chips" oder "Chips" section

---

## Report erstellen

Nach erfolgreichem Test:

```json
{
  "scenario": "GP3 Golden Mode UI Test",
  "date": "2025-12-30",
  "askbacks_shown": 4,
  "chips_set": ["fuellung_material_composite", "kofferdam"],
  "output_updated": true,
  "status": "PASS"
}
```
