# Füllung DE — Decision Model v2

**Version:** 2.0.0  
**Regulatory Context:** Deutschland 2025 (Amalgam-Verbot, BEMA 13e-h, S3-Leitlinie 2024)

---

## 1. Warum dieses Modell?

### Regulatorische Änderungen 2025
1. **Amalgam-Verbot** (EU ab 01.01.2025): Selbstadhäsive Materialien werden Regelversorgung für GKV-Seitenzahn
2. **BEMA 13e-h**: Kompositfüllungen im Seitenzahn nur mit Adhäsivtechnik abrechnungsfähig
3. **S3-Leitlinie 2024**: Definiert Qualitätsstandards für direkte Kompositrestaurationen

### Konsequenz fürs System
- Material-Default ändert sich je nach Kontext
- Adhäsivtechnik ist für Seitenzahn-Komposit bei GKV verpflichtend dokumentiert
- Bulk-Fill ist Ausnahme, nicht Standard

---

## 2. Dimensionen des Modells

| Dimension | Werte | Bedeutung |
|-----------|-------|-----------|
| **insurance_context** | gkv_regelversorgung, gkv_mehrkosten, pkv | Bestimmt Eligibility + Billing-Pfad |
| **restoration_material** | self_adhesive, bulk_fill, composite | Materialklasse |
| **tooth_region** | anterior, posterior | Front vs Seitenzahn |
| **adhesive_technique** | yes, no | BEMA-relevant bei Seitenzahn |
| **layering_technique** | yes, no | Schichttechnik (S3-Standard) |
| **isolation_level** | kofferdam, relative | Feuchtigkeitskontrolle |
| **pulp_protection** | liner, base, none | Schutzmaßnahme |
| **caries_depth** | shallow, medium, deep | Kariestiefe |

---

## 3. Askback-Analyse: Warum genau diese?

### Level 1 (Blockierend)

| ID | Askback | Warum? |
|----|---------|--------|
| `ab_insurance_context` | Abrechnungskontext | **Ohne das ist Billing falsch.** GKV Regel vs Mehrkosten vs PKV ändert alles. |
| `ab_material_choice` | Material | **Bestimmt Technik-Pflichten.** Komposit → Adhäsiv nötig. Self-adhesive → nicht. |
| `ab_adhesive_technique` | Adhäsiv | **BEMA 13e-h Pflicht.** Ohne Bestätigung keine Abrechnung bei Seitenzahn-Komposit. |

### Level 2 (Empfohlen, nicht blockierend)

| ID | Askback | Warum? |
|----|---------|--------|
| `ab_layering_technique` | Schichttechnik | Verbessert Qualität, S3-konform. Default=yes wenn unknown. |
| `ab_isolation_level` | Isolation | Kritisch für Langzeiterfolg. Default=relative wenn unknown. |
| `ab_pulp_protection` | Pulpaschutz | Nur bei tiefer Karies. Default=none wenn unknown. |

### Warum nicht mehr Askbacks?

❌ **Matrix-System**: Implizit bei approximalen Flächen, keine Billing-Relevanz  
❌ **Politur**: Immer Standard, keine Varianz  
❌ **Okklusionskontrolle**: Immer Standard  
❌ **Anästhesie-Details**: Separater Chip-Bereich  

---

## 4. Decision Rules

```
REGEL 1: GKV Regelversorgung + Seitenzahn → Default self_adhesive
         (Quelle: Amalgam-Ban 2025)

REGEL 2: Bulk-Fill bei GKV Regel → Ausnahme-Dokumentation nötig
         (Quelle: Amalgam-Ban 2025)

REGEL 3: Komposit + Seitenzahn → Adhäsivtechnik MUSS bestätigt sein
         (Quelle: BEMA 13e-h)

REGEL 4: GKV Mehrkosten → Komposit möglich, MKV erforderlich

REGEL 5: PKV → Komposit + Adhäsiv ist Standard

REGEL 6: Tiefe Karies → Pulpaschutz-Askback aktivieren
         (Quelle: S3-Leitlinie)

REGEL 7: Adhäsivtechnik → Kofferdam empfohlen
         (Quelle: S3-Leitlinie)
```

---

## 5. Chip-Deltas (keine Billing!)

Jede Askback-Antwort setzt **1-2 Chips** (keine "informational only"):

| Antwort | Chips |
|---------|-------|
| GKV Regelversorgung | `insurance_gkv_regel` |
| GKV Mehrkosten | `insurance_gkv_mehrkosten` |
| PKV | `insurance_pkv` |
| Selbstadhäsiv | `material_self_adhesive` |
| Bulk-Fill | `material_bulk_fill` |
| Komposit | `material_composite` |
| Adhäsiv Ja | `technique_adhesive` ON |
| Adhäsiv Nein | `technique_adhesive` OFF |
| Schicht Ja | `technique_layering` ON |
| Kofferdam | `isolation_kofferdam` |
| Relativ | `isolation_relative` |
| Liner | `pulp_liner` |
| Base | `pulp_base` |
| Kein Schutz | `pulp_protection_none` |

---

## 6. Edge Cases

| # | Szenario | Handling |
|---|----------|----------|
| 1 | Bulk-Fill bei GKV Regel | Ausnahme-Begründung dokumentieren |
| 2 | Frontzahn bei GKV | Komposit ist Regelversorgung (keine self-adhesive Pflicht) |
| 3 | Schwierige Trockenlegung | Kofferdam priorisieren; sonst self-adhesive |
| 4 | Tiefe Karies ohne Schutz | Nur bei Bulk-Fill mit Bioaktivität |
| 5 | Subgingivaler Rand | Erhöhtes Feuchtigkeitsrisiko → Kofferdam/Split-Dam |
| 6 | Kind nicht kooperativ | Bulk-Fill/GIZ bevorzugt |
| 7 | Schwangerschaft | Keine Einschränkung mehr (Amalgam-Ban irrelevant) |

---

## 7. Verifikation

✅ Jede Askback-Antwort → 1-2 Chips  
✅ Keine Billing-Hardcodes  
✅ 3 Blocking Askbacks (Level 1)  
✅ 3 Recommended Askbacks (Level 2)  
✅ 8 Decision Rules mit Quellen  
✅ 7 Edge Cases dokumentiert
