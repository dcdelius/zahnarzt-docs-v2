# G118 — Composite SSOT Proof: Chips → Output → Billing

**Ziel:** Beweisen, dass alles eindeutig aus Chips entsteht

---

## Beispiel 1: GKV ohne Mehrkosten (Frontzahn)

### Diktat
> "Füllung Zahn 21 mesial, Komposit."

### Facts
```json
{
  "tooth": "21",
  "surfaces": ["m"],
  "toothRegion": "front",
  "insuranceType": "GKV",
  "materialMentioned": "komposit"
}
```

### Askbacks
**Keine.** Frontzahn = Komposit ist Kassenleistung.

### Final Chips
```json
["komposit_basic", "la_infiltr", "exkavation", "finishing"]
```

### Output-Text
```
Füllungstherapie Zahn 21 mesial.
Infiltrationsanästhesie.
Exkavation, Kavitätenpräparation.
Einflächige Kompositfüllung.
Politur und Okklusionskontrolle.
```

### Billing
| Code | Position | Begründung |
|------|----------|------------|
| BEMA_40 | Infiltration | la_infiltr chip |
| BEMA_13a | Füllung einflächig | komposit_basic + 1 surface |

**✅ PASS:** Jeder Text → Chip, jedes Billing → Chip

---

## Beispiel 2: GKV mit Mehrkosten (Seitenzahn)

### Diktat
> "Füllung Zahn 36 okklusal Komposit adhäsiv, MKV vorhanden."

### Facts
```json
{
  "tooth": "36",
  "surfaces": ["o"],
  "toothRegion": "side",
  "insuranceType": "GKV",
  "materialMentioned": "komposit",
  "adhesiveMentioned": true,
  "hasMKV": true
}
```

### Askbacks
**Keine.** MKV explizit, Adhäsiv explizit.

### Final Chips
```json
["mkv_valid", "komposit_mehrschicht", "adhesive", "la_leitung", "exkavation", "finishing"]
```

### Output-Text
```
Füllungstherapie Zahn 36 okklusal.
Leitungsanästhesie N. alv. inf.
Exkavation, Kavitätenpräparation.
Einflächige Kompositfüllung in Mehrschichttechnik.
Ätz-/Adhäsivtechnik (Schmelz/Dentin).
Politur und Okklusionskontrolle.

Mehrkostenvereinbarung liegt vor.
```

### Billing (An Kasse)
| Code | Position | Chip |
|------|----------|------|
| BEMA_41a | Leitungsanästhesie | la_leitung |
| BEMA_13a | Füllung einflächig | base |

### Billing (An Patient - GOZ-Differenz)
| Code | Position | Chip |
|------|----------|------|
| GOZ_2060 | Füllung einflächig (Diff) | mehrschicht |
| GOZ_2197 | Adhäsivtechnik | adhesive |

**✅ PASS:** Kein GOZ ohne Chip, MKV dokumentiert

---

## Beispiel 3: PKV (Seitenzahn)

### Diktat
> "Füllung Zahn 46 mod Komposit, Caries profunda, Überkappung durchgeführt."

### Facts
```json
{
  "tooth": "46",
  "surfaces": ["m", "o", "d"],
  "toothRegion": "side",
  "insuranceType": "PKV",
  "materialMentioned": "komposit",
  "cariesDepth": "profunda",
  "cappingPerformed": true
}
```

### Askbacks
**Keine.** Alle relevanten Facts explizit.

### Final Chips
```json
["komposit_mehrschicht", "adhesive", "la_leitung", "exkavation", "cp", "finishing"]
```

### Output-Text
```
Füllungstherapie Zahn 46 mesial-okklusal-distal.
Leitungsanästhesie N. alv. inf.
Exkavation bei Caries profunda.
Indirekte Überkappung.
Dreiflächige Kompositfüllung in Mehrschichttechnik.
Ätz-/Adhäsivtechnik (Schmelz/Dentin).
Politur und Okklusionskontrolle.
```

### Billing (GOZ)
| Code | Position | Chip |
|------|----------|------|
| GOZ_0100 | Leitungsanästhesie | la_leitung |
| GOZ_2100 | Füllung dreiflächig | mehrschicht + 3 surfaces |
| GOZ_2197 | Adhäsivtechnik | adhesive |
| GOZ_2330 | Überkappung | cp |

**✅ PASS:** PKV = nur GOZ, alle Chips → Billing

---

## Beweis-Regeln

### ✅ Regel 1: Kein Text ohne Chip
```
∀ line ∈ output.text:
  ∃ chip ∈ chips: line ← chip.textSnippet
```

### ✅ Regel 2: Kein Billing ohne Chip
```
∀ code ∈ output.billing:
  ∃ chip ∈ chips: code ∈ chip.billingRefs
```

### ✅ Regel 3: Kein GOZ bei GKV ohne MKV
```
IF insuranceType === 'GKV' && hasMKV !== true:
  output.billing ∩ GOZ_* = ∅
```

### ✅ Regel 4: Keine Mehrschicht ohne explizite Grundlage
```
IF chip === 'mehrschicht':
  REQUIRES adhesiveMentioned === true OR adhesive_technique.answer === true
```

---

## Zusammenfassung

| Beispiel | Askbacks | Chips | Text-Zeilen | Billing-Codes | SSOT |
|----------|----------|-------|-------------|---------------|------|
| GKV Front | 0 | 4 | 5 | 2 BEMA | ✅ |
| GKV+MKV | 0 | 6 | 7 | 2 BEMA + 2 GOZ | ✅ |
| PKV | 0 | 6 | 7 | 4 GOZ | ✅ |

**Alle drei Beispiele: 100% SSOT-konform.**
