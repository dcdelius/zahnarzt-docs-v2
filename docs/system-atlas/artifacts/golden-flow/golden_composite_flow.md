# G120 — Golden Composite Flow: DER Referenzfall

**Dieser Case darf NIE kaputtgehen.**  
**Alle Änderungen müssen ihn bestehen.**

---

## Case Definition

### Szenario
- **Zahn 36:** okklusal, Komposit, GKV mit Mehrkosten
- **Zahn 14:** distal, einfach, gleiche Sitzung
- **Versicherung:** GKV
- **MKV:** Vorhanden

### Diktat
```
"An Zahn 36 okklusal eine Kompositfüllung adhäsiv, 
an Zahn 14 distal eine einfache Füllung. 
Mehrkostenvereinbarung liegt vor.
Lokalanästhesie durchgeführt."
```

---

## Schritt 1: Extraction

```json
{
  "teeth": ["36", "14"],
  "perTooth": {
    "36": {
      "surface": ["o"],
      "material": "komposit",
      "adhesive": true
    },
    "14": {
      "surface": ["d"],
      "material": "komposit",
      "adhesive": false
    }
  },
  "mentioned": {
    "mkv": true,
    "localAnesthesia": true
  }
}
```

---

## Schritt 2: Facts (per Tooth)

### Zahn 36
```json
{
  "tooth": "36",
  "surfaces": ["o"],
  "toothRegion": "side",
  "insuranceType": "GKV",
  "hasMKV": true,
  "materialMentioned": "komposit",
  "adhesiveMentioned": true,
  "adhesiveApplied": true
}
```

### Zahn 14
```json
{
  "tooth": "14",
  "surfaces": ["d"],
  "toothRegion": "side",
  "insuranceType": "GKV",
  "hasMKV": true,
  "materialMentioned": "komposit",
  "adhesiveMentioned": false
}
```

---

## Schritt 3: Askbacks

### Zahn 36
**Keine Askbacks.** Adhäsiv explizit, MKV explizit.

### Zahn 14
```json
{
  "id": "adhesive_technique::tooth:14",
  "question": "Zahn 14: Wurde Adhäsivtechnik (Mehrschicht) angewendet?",
  "blocking": true
}
```

### Antwort
```json
{
  "adhesive_technique::tooth:14": false
}
```

→ Zahn 14 bekommt einfache Füllung, keine GOZ 2197

---

## Schritt 4: Final Chips

### Zahn 36
```json
["mkv_valid", "komposit_mehrschicht", "adhesive", "la_leitung", "exkavation", "finishing"]
```

### Zahn 14
```json
["mkv_valid", "komposit_basic", "la_infiltr", "exkavation", "finishing"]
```

---

## Schritt 5: Output

### Text
```
ZAHN 36 (OKKLUSAL)
Leitungsanästhesie N. alv. inf.
Exkavation, Kavitätenpräparation.
Einflächige Kompositfüllung in Mehrschichttechnik.
Ätz-/Adhäsivtechnik (Schmelz/Dentin).
Politur und Okklusionskontrolle.

ZAHN 14 (DISTAL)
Infiltrationsanästhesie.
Exkavation, Kavitätenpräparation.
Einflächige Kompositfüllung.
Politur und Okklusionskontrolle.

Mehrkostenvereinbarung liegt vor.
```

---

## Schritt 6: Billing

### An Kasse (BEMA)
| Code | Zahn | Position |
|------|------|----------|
| BEMA_41a | 36 | Leitungsanästhesie |
| BEMA_13a | 36 | Füllung einflächig |
| BEMA_40 | 14 | Infiltrationsanästhesie |
| BEMA_13a | 14 | Füllung einflächig |

### An Patient (GOZ-Differenz)
| Code | Zahn | Position |
|------|------|----------|
| GOZ_2060_DIFF | 36 | Füllung einflächig (Mehrkosten) |
| GOZ_2197 | 36 | Adhäsivtechnik |
| GOZ_2060_DIFF | 14 | Füllung einflächig (Mehrkosten) |

**Beachte:** Zahn 14 hat KEINE GOZ 2197, da keine Adhäsivtechnik.

---

## Schritt 7: UI-State-Übergänge

```
1. idle
   ↓ User tippt Diktat
2. idle (mit Diktat)
   ↓ User klickt "Dokumentieren"
3. processing
   ↓ runV10() läuft
4. questions
   ↓ Zeigt: "Zahn 14: Adhäsivtechnik?"
5. questions (beantwortet)
   ↓ User klickt "Nein" → "Fertigstellen"
6. processing
   ↓ runV10() mit Antworten
7. output
   ↓ Zeigt: Text + Billing für beide Zähne
8. (optional) review
   ↓ User klickt "Bearbeiten"
   ↓ Kann Antworten ändern
```

---

## Invarianten

| Regel | Prüfung |
|-------|---------|
| Kein GOZ bei GKV ohne MKV | ✅ MKV vorhanden |
| GOZ 2197 nur bei Adhäsiv | ✅ Nur Zahn 36 |
| Kein Text ohne Chip | ✅ Alle Zeilen traced |
| Kein Billing ohne Chip | ✅ Alle Codes traced |
| Tooth-Scoping | ✅ Chips pro Zahn |

---

## Gate Test

```typescript
it('Golden Composite Flow: 36+14 MKV', async () => {
  const result = await runV10({
    dictation: `An Zahn 36 okklusal eine Kompositfüllung adhäsiv,
      an Zahn 14 distal eine einfache Füllung.
      Mehrkostenvereinbarung liegt vor.
      Lokalanästhesie durchgeführt.`,
    treatmentId: 'fuellung',
    insuranceType: 'GKV',
    hasMKV: true,
    answers: new Map([['adhesive_technique::tooth:14', false]])
  });

  expect(result.state).toBe('output');
  
  // Zahn 36: GOZ 2197
  expect(result.output.billingCodes).toContain('GOZ_2197');
  
  // Zahn 14: KEINE GOZ 2197
  const goz2197Count = result.output.billingCodes.filter(c => c === 'GOZ_2197').length;
  expect(goz2197Count).toBe(1); // Nur für Zahn 36
  
  // MKV dokumentiert
  expect(result.output.fullText).toContain('Mehrkostenvereinbarung');
});
```

---

## Dieser Case ist der Goldstandard.

Änderungen an:
- Extraction
- Medical KB
- Renderer
- Billing

**MÜSSEN** diesen Case weiterhin bestehen.
