# Füllung DE — Medizinisches Decision-System Modell

**Version:** 1.0.0  
**Basiert auf:** `fuellung_de_knowledge.v1.json`

---

## 1. Klinischer Ablauf

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FÜLLUNGSTHERAPIE WORKFLOW                        │
└─────────────────────────────────────────────────────────────────────┘

1. DIAGNOSTIK
   ├─ Befunderhebung (Inspektion, Röntgen, Sondierung)
   ├─ Kariestiefe einschätzen (superficialis → profunda)
   └─ Zahnregion bestimmen (Front/Seite)

2. ANÄSTHESIE
   ├─ Infiltration (OK, Front UK)
   └─ Leitung (Seitenzahn UK)

3. PRÄPARATION
   ├─ Kofferdam / relative Trockenlegung anlegen
   ├─ Exkavation (Kariesentfernung)
   └─ Kavitätengestaltung

4. ISOLATION (← Dreh- und Angelpunkt!)
   ├─ Kofferdam (optimal für Adhäsiv)
   └─ Relative Trockenlegung (wenn Kofferdam nicht möglich)

5. ADHÄSIVTECHNIK (bei Komposit)
   ├─ Ätzen (Phosphorsäure)
   ├─ Primer (Self-Etch oder Total-Etch)
   └─ Bonding

6. MATRIZE/KEIL (bei approximalen Flächen)
   ├─ Teilmatrize (Seitenzahn)
   └─ Zirkumferenzmatrize (Front oder große Kavitäten)

7. FÜLLUNG EINBRINGEN
   ├─ Inkrementell/Mehrschicht (Standard bei > 2mm Tiefe)
   ├─ Bulk-Fill (bei entsprechenden Materialien)
   └─ Lichthärtung pro Schicht

8. FINIEREN/OKKLUSION
   ├─ Überschüsse entfernen
   ├─ Kontaktpunkte prüfen
   ├─ Okklusionskontrolle (Artikulation)
   └─ Politur

9. DOKUMENTATION
   ├─ Zahn/Flächen
   ├─ Material
   ├─ Technik (Adhäsiv? Schicht?)
   └─ Besonderheiten (tiefe Karies, Überkappung)
```

---

## 2. Varianten nach Versicherungskontext

### 2.1 GKV Standard

| Aspekt | Merkmale |
|--------|----------|
| Material | Je nach Region: Front=Komposit, Seite=Amalgam ENTFÄLLT (EU 2025) → zunehmend Komposit |
| Technik | Basisversorgung, keine Mehrkosten |
| Dokumentation | BEMA-Positionen |
| Rückfragen | Minial – Standard-Workflow |

### 2.2 GKV mit Mehrkosten (Zuzahlung)

| Aspekt | Merkmale |
|--------|----------|
| Material | Hochwertige Komposite (Mehrkosten) |
| Technik | Adhäsiv, Mehrschicht, hochwertige Isolation |
| MKV | Schriftliche Vereinbarung vor Behandlung erforderlich |
| Dokumentation | BEMA + GOZ-Differenz an Patient |
| Rückfragen | MKV vorhanden? Adhäsiv? Schichttechnik? |

### 2.3 PKV/Privat

| Aspekt | Merkmale |
|--------|----------|
| Material | Hochwertige Komposite (Standard) |
| Technik | Adhäsiv, Mehrschicht, Kofferdam wenn möglich |
| Dokumentation | GOZ vollständig |
| Rückfragen | Minimal – Hochwertig ist Standard |

---

## 3. Was fehlt oft im Diktat?

| Information | Häufigkeit | Askback nötig? |
|-------------|------------|----------------|
| Material | 40% unklar | ✅ JA |
| Isolation (Kofferdam?) | 60% unklar | ✅ JA |
| Adhäsivtechnik | 50% implizit | ✅ JA wenn Komposit |
| Schichttechnik | 30% unklar | ✅ JA bei mittlerer/großer Kavität |
| Kariestiefe | 20% unklar | ✅ JA wenn tief |
| Versicherungskontext | 70% unklar | ✅ JA (fact-only) |
| Matrize/Keil | 80% nicht genannt | ❌ NEIN (Standard bei approximal) |
| Politur | 90% nicht genannt | ❌ NEIN (immer gemacht) |

---

## 4. Facts (für Extraction)

Aus dem Knowledge-Pack abgeleitet:

```
toothIds[]              → ["36", "14"]
surfacesByTooth{}       → {"36": ["o"], "14": ["d"]}
materialMentioned       → composite | giz | unknown
isolationMentioned      → rubberDam | relative | unknown
adhesiveMentioned       → yes | no | unknown
cavityExtentHint        → small | medium | large | unknown
cariesDepthHint         → shallow | medium | deep | unknown
insuranceContextHint    → gkv_standard | gkv_mehrkosten | pkv | unknown
```

---

## 5. Die 6 Kern-Askbacks

| # | ID | Trigger | Chip-Effekt |
|---|----|---------||-------------|
| 1 | `ab_insurance_context` | insuranceContextHint=unknown | ❌ fact-only |
| 2 | `ab_material` | materialMentioned=unknown | ✅ `fuellung_material_*` |
| 3 | `ab_isolation` | isolationMentioned=unknown | ✅ `kofferdam` oder `fuellung_isolation_relative` |
| 4 | `ab_adhesive_technique` | composite + adhesiveMentioned=unknown | ✅ `fuellung_adhesivtechnik` |
| 5 | `ab_layering` | composite + medium/large + layeringUnknown | ✅ `fuellung_schichttechnik` |
| 6 | `ab_deep_caries_protection` | cariesDepthHint=deep | ✅ `fuellung_pulpaschutz` |

---

## 6. Chips (klinisch, KEINE Billing!)

| Chip ID | Bedeutung | Precedence |
|---------|-----------|------------|
| `fuellung_material_composite` | Kompositfüllung | dictation > askback > default |
| `fuellung_material_giz` | Glasionomer-Füllung | dictation > askback |
| `kofferdam` | Kofferdam angelegt | dictation > askback > settings |
| `fuellung_isolation_relative` | Relative Trockenlegung | askback > default |
| `fuellung_adhesivtechnik` | Adhäsivtechnik durchgeführt | dictation > askback |
| `fuellung_schichttechnik` | Mehrschicht/inkrementell | dictation > askback > context |
| `fuellung_pulpaschutz` | Unterfüllung/Schutzmaßnahme | dictation > askback |

---

## 7. Regeln

### 7.1 Keine Billing-Hardcodes
```
NIEMALS: emit("GOZ_2060")
IMMER:   emit(chip: "fuellung_material_composite")
         → Catalog-Mapping löst auf GOZ_2060
```

### 7.2 Negation Precedence
```
1. Dictation Negation ("kein Kofferdam")     → Höchste Priorität
2. Dictation Affirmation ("Kofferdam")       → 
3. Askback Antwort                           → 
4. Settings Default                          → 
5. System Default                            → Niedrigste Priorität
```

### 7.3 Context-Only Askback
`ab_insurance_context` ist der EINZIGE Askback ohne direkten Chip-Effekt.
Er setzt nur den Fact `insuranceContextHint` für nachfolgende Chip→Billing Mappings.
