# G116 — Askback Triggers: Wann MUSS / DARF NICHT gefragt werden

---

## Grundregel

> **Kein Askback darf rein informativ sein.**  
> **Jeder Askback muss: Chip ändern ODER Billing beeinflussen ODER Output blockieren.**

---

## MUSS-Askbacks (Blocking)

Diese Askbacks **MÜSSEN** beantwortet werden, sonst kein Output.

| ID | Trigger | Frage | Ohne Antwort |
|----|---------|-------|--------------|
| `insurance_type` | `insuranceType === undefined` | "Welche Versicherungsart?" | ❌ BLOCK |
| `mkv_confirmed` | `insuranceType === 'GKV' && toothRegion === 'side' && material === 'komposit' && hasMKV === undefined` | "Liegt MKV vor?" | ❌ BLOCK |
| `adhesive_technique` | `hasMKV === true && adhesiveMentioned !== true` | "Adhäsivtechnik angewendet?" | ❌ BLOCK |
| `capping_performed` | `cariesDepth === 'profunda' && cappingPerformed === undefined` | "Überkappung durchgeführt?" | ❌ BLOCK |

---

## SOLL-Askbacks (Conditional)

Diese Askbacks erscheinen nur bei bestimmten Bedingungen.

| ID | Trigger | Frage | Default wenn keine Antwort |
|----|---------|-------|---------------------------|
| `kofferdam_used` | `kofferdamMentioned === true` | "Kofferdam angelegt?" | Nein (kein BEMA 12) |
| `anesthesia_type` | `toothNumber in [34-38, 44-48] && anesthesiaType === undefined` | "Leitung oder Infiltration?" | Leitung (UK Seitenzahn) |

---

## DARF-NICHT-Askbacks (Forbidden)

Diese Fragen dürfen NIEMALS gestellt werden.

| Situation | Grund |
|-----------|-------|
| "Welches Material?" bei GKV Front | Komposit ist Standard |
| "Adhäsivtechnik?" bei PKV | Immer ja, Standard |
| "Wieviele Flächen?" | Muss aus Diktat extrahiert werden |
| "BEMA oder GOZ?" | Aus Kassenart ableitbar |
| "Materialfarbe?" | Keine Abrechnungsrelevanz |

---

## Entscheidungslogik mit Defaults

### Kassenart → Abrechnungsweg

```
IF insuranceType === undefined:
    → ASKBACK: insurance_type (BLOCKING)
    
IF insuranceType === 'GKV':
    IF toothRegion === 'front':
        → GKV_FRONT (keine Askbacks)
    ELSE:
        IF material === 'komposit':
            IF hasMKV === undefined:
                → ASKBACK: mkv_confirmed (BLOCKING)
            IF hasMKV === true:
                IF adhesiveMentioned !== true:
                    → ASKBACK: adhesive_technique (BLOCKING)
                → GKV_MKV
            IF hasMKV === false:
                → ERROR: "Seitenzahn-Komposit ohne MKV nicht abrechenbar"
        ELSE:
            → GKV_AMALGAM (keine Askbacks)

IF insuranceType === 'PKV':
    → PKV (keine Askbacks, Adhäsiv ist default)
```

### Überkappung

```
IF cariesDepth === 'profunda':
    IF cappingPerformed === undefined:
        → ASKBACK: capping_performed (BLOCKING)
    IF cappingPerformed === true:
        → ADD_CHIP: cp
        → ADD_BILLING: BEMA_25 (oder GOZ bei PKV)
```

### Kofferdam

```
IF kofferdamMentioned === true:
    IF kofferdamUsed === undefined:
        → ASKBACK: kofferdam_used (OPTIONAL, default: false)
    IF kofferdamUsed === true:
        → ADD_CHIP: kofferdam
        → ADD_BILLING: BEMA_12
```

---

## Chip-Auswirkungen

| Askback | Antwort | Chip-Delta |
|---------|---------|------------|
| `insurance_type = GKV` | - | Sets billing path |
| `insurance_type = PKV` | - | Sets billing path |
| `mkv_confirmed = Ja` | → | `hasMKV: true` |
| `mkv_confirmed = Nein` | → | ERROR: Block output |
| `adhesive_technique = Ja` | → | `+adhesive`, `+mehrschicht` |
| `adhesive_technique = Nein` | → | `+komposit_basic`, WARN: "Keine GOZ 2197" |
| `capping_performed = Ja` | → | `+cp` |
| `capping_performed = Nein` | → | `+cp_not_required` |
| `kofferdam_used = Ja` | → | `+kofferdam` |
| `kofferdam_used = Nein` | → | `+rel_trocken` |

---

## Situationen modelliert

### ✅ Kind vs Erwachsener

```
IF patientAge < 15 && insuranceType === 'GKV':
    → Komposit auch im Seitenzahn ohne MKV erlaubt
    → Kein mkv_confirmed Askback nötig
```

### ✅ Frontzahn vs Seitenzahn

```
Zähne 13-23, 33-43 → toothRegion = 'front'
Alle anderen → toothRegion = 'side'
```

### ✅ MKV explizit/implizit

```
IF dictation contains "Mehrkostenvereinbarung" OR "MKV":
    → hasMKV = true (keine Askback)
ELSE:
    → hasMKV = undefined → ASKBACK
```
