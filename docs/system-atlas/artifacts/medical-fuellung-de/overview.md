# Füllungstherapie Deutschland — Medizinisches Verständnis

**Ziel:** Klinische Facts/Chips modellieren, KEINE Abrechnungscodes.

---

## 1. Klinische Behandlungspfade

### 1.1 GKV ohne Zuzahlung

**Indikationen für Kunststofffüllung:**
- Frontzahnbereich (Zähne 13-23, 33-43)
- Allergiepass gegen Amalgam
- Schwangerschaft/Stillzeit
- Niereninsuffizienz
- Kinder unter 15 Jahre

**Typischer Ablauf:**
```
Anästhesie (lokal)
↓
Trockenlegung (rel. oder Kofferdam)
↓
Exkavation
↓
Kavitätenpräparation
↓
ggf. Überkappung bei pulpanaher Karies
↓
Füllung einbringen
↓
Politur, Okklusionskontrolle
```

**Klinische Facts benötigt:**
- `tooth`: Zahnnummer
- `surfaces`: Flächen (m/o/d/b/l)
- `toothRegion`: front | side
- `cariesDepth`: superficialis | media | profunda | unknown
- `anesthesiaType`: infiltration | block | none
- `isolation`: relative | kofferdam | none

---

### 1.2 GKV mit Mehrkostenvereinbarung (MKV)

**Wann MKV:**
- Seitenzahnbereich + Komposit (ohne medizinische Indikation)
- Patient wünscht hochwertigere Versorgung

**Zusätzlicher klinischer Aufwand:**
- Adhäsivtechnik (Schmelz-/Dentin-Vorbehandlung)
- Mehrschichttechnik
- Bessere Isolation (oft Kofferdam)
- Aufwendigere Matrizensysteme

**Zusätzliche klinische Facts:**
- `adhesiveTechnique`: true | false | unknown
- `layeringTechnique`: true | false
- `mkvPresent`: true | false | unknown
- `matrixSystem`: sectional | circumferential | none

---

### 1.3 Privatversorgung (PKV)

**Typischer Standard:**
- Komposit (immer)
- Mehrschichttechnik
- Adhäsivtechnik
- Hochwertige Isolation
- Sorgfältige Politur/Finishing

**Klinische Facts identisch zu MKV**, aber:
- `insuranceTrack`: private

---

## 2. Klinische Chips (KEINE Billingcodes!)

| Chip ID | Bedeutung | Trigger |
|---------|-----------|---------|
| `anesthesia_infiltration` | Infiltrationsanästhesie | tooth in OK/Front |
| `anesthesia_block` | Leitungsanästhesie | tooth in UK-Seitenzahn |
| `isolation_relative` | Relative Trockenlegung | default |
| `isolation_kofferdam` | Kofferdam-Anlage | kofferdam=true |
| `excavation` | Exkavation durchgeführt | always |
| `capping_indirect` | Indirekte Überkappung | cariesDepth=profunda + capping=true |
| `capping_not_required` | Keine Überkappung nötig | cariesDepth≠profunda OR capping=false |
| `filling_basic` | Basisfüllung | adhesive=false OR layering=false |
| `filling_adhesive` | Adhäsivtechnik | adhesive=true |
| `filling_layered` | Mehrschichttechnik | layering=true |
| `matrix_sectional` | Teilmatrize | surfaces > 1 && matrixSystem=sectional |
| `finishing` | Politur/Finishing | always |
| `insurance_gkv_basic` | GKV Regelversorgung | insuranceTrack=gkv && !mkvPresent |
| `insurance_gkv_mkv` | GKV + Mehrkosten | insuranceTrack=gkv && mkvPresent |
| `insurance_private` | Privatversorgung | insuranceTrack=private |

---

## 3. Wann sind Rückfragen logisch?

### Zwingend (blockierend)

| Situation | Rückfrage | Grund |
|-----------|-----------|-------|
| Kassenart unbekannt | "GKV oder PKV?" | Bestimmt Abrechnungsweg |
| GKV + Seitenzahn + Komposit, MKV unklar | "Liegt MKV vor?" | Ohne MKV: keine Mehrkosten |
| MKV vorhanden, Adhäsiv unklar | "Adhäsivtechnik angewendet?" | Beeinflusst Chips |
| Caries profunda, Überkappung unklar | "Überkappung durchgeführt?" | Beeinflusst Chips |

### Optional (mit Defaults)

| Situation | Rückfrage | Default |
|-----------|-----------|---------|
| Isolation unklar | "Kofferdam angelegt?" | Nein (relative) |
| Anästhesie-Art unklar | "Leitung oder Infiltration?" | Abhängig von Zahn |
| Schichttechnik unklar | "Mehrschichttechnik?" | Ja bei MKV/PKV |

---

## 4. Negation Precedence

```
1. Dictation Negation (höchste Priorität)
   "Kein Kofferdam" → kofferdam=false

2. Explicit Mention
   "Kofferdam angelegt" → kofferdam=true

3. Manual Answer (Askback)
   User wählt "Ja" → kofferdam=true

4. Settings/Praxis-Default
   practice.defaultIsolation=kofferdam → kofferdam=true

5. System Default (niedrigste)
   kofferdam=false
```

---

## 5. Zusammenhang Chips → SSOT Output

```
Chips werden vom Medical Layer erzeugt
         ↓
Renderer (unified.json) mappt Chips → Text + BillingRefs
         ↓
BillingRefs werden gegen Katalog aufgelöst
         ↓
Finaler Output (Text + Codes)
```

**WICHTIG:** Medical Layer produziert NUR Chips, KEINE Codes!
