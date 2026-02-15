# Documentation Standard — KZV-Style Dental Documentation

**Version**: 1.0  
**Status**: Production  
**Purpose**: Define required elements for German dental documentation in Docudent V10.

---

## Minimum Required Elements

| Element | Description | Source in V10 | Required? |
|---------|-------------|---------------|-----------|
| **Zahn** | Tooth number (11-48) | `perInstance.teeth[0]` | ✅ Mandatory |
| **Flächen** | Surfaces (M/O/D/B/L) | `facts.surfaces` | ✅ When applicable |
| **Diagnose** | Depth/diagnosis | `facts.cariesDepth` | ⚠️ When known |
| **Behandlung** | Treatment performed | Chip `fuellung_grundleistung` | ✅ Mandatory |
| **Lokalanästhesie** | Anesthesia type | `facts.anesthesia` + chip `la_*` | ⚠️ When used |
| **Material** | Filling material | `facts.materialMentioned` | ⚠️ When MKV/relevant |
| **Cp/P + Material** | Capping + material | `facts.capping` + answer | ⚠️ When performed |
| **Komplikationen** | Complications (bleeding, etc.) | `facts.bleeding.detected` | ⚠️ When occurred |
| **Hinweise** | Post-treatment notes | Composer section `hinweise` | ✅ Always |

---

## MKV-Specific Elements (When MKV Selected)

| Element | Description | Source in V10 |
|---------|-------------|---------------|
| **MKV Betrag** | Agreed extra cost | `detectMkvAmount(dictation)` |
| **MKV Klausel** | Legal reference | Static: "§ 28 Abs. 2 SGB V" |
| **Zustimmung** | Consent confirmation | `facts.mehrkostenConfirmed` |
| **Leistungsumfang** | Extra service scope | Chip `mehrschicht` |

---

## Section Structure (V10 Composer)

### Section 1: Dokumentation

```
Zahn {tooth} ({surfaces}): {treatment}.
Diagnose: {depth}.
Lokalanästhesie: {laType}.
{cappingLine}
{materialLine}
```

**Rules**:
- Only include lines with known data
- Never output "unknown" or placeholders
- Use German labels from canonical vocab

### Section 2: Abrechnung

```
Kassenleistung (BEMA):
  • {billingCode}
  • ...

Privatleistung (GOZ):  [only if MKV addon]
  • {addonCode}
```

### Section 3: MKV (Only When MKV)

```
Mehrkostenvereinbarung nach § 28 Abs. 2 SGB V
Mehrkostenbetrag: {amount} €
Patient wurde über Mehrkosten aufgeklärt und hat zugestimmt.
```

**Rules**:
- Only show if `insuranceType === 'MKV'`
- Amount comes from `detectMkvAmount()` or askback

### Section 4: Hinweise

```
Nach Lokalanästhesie: Bis zum Abklingen...
Bei Beschwerden bitte zeitnah...
```

---

## Mapping to Chips & Askbacks

| Documentation Element | Chip ID | Askback ID |
|----------------------|---------|------------|
| Filling performed | `fuellung_grundleistung` | - |
| LA Infiltration | `la_infiltr` | - |
| LA Leitung | `la_leitung` | - |
| Kofferdam | `kofferdam` | - |
| Cp (indirect capping) | `cp` | `medical_ueberkappung` |
| Cp material | - | `medical_ueberkappung_material` |
| Mehrschicht/Adhäsiv | `mehrschicht` | - |

---

## SSOT Compliance Rules

1. **Never read raw dictation** in composer — only use facts/chips
2. **Never hardcode billing codes** — use BillingRef IDs
3. **No boolean output** — use German labels
4. **Dictation negation wins** — "ohne LA" > default LA

---

## Validation Checklist

For any documentation output, verify:

- [ ] Tooth number appears (e.g., "Zahn 27")
- [ ] Surfaces in uppercase (e.g., "MOD")
- [ ] Depth label is German (e.g., "Caries profunda")
- [ ] LA label is German (e.g., "Infiltrationsanästhesie")
- [ ] Capping includes material (e.g., "Cp mit Ca(OH)₂")
- [ ] MKV section only appears for MKV insurance
- [ ] MKV amount is displayed when present
- [ ] Billing codes are grouped by system
- [ ] No placeholder-only text
- [ ] No "true"/"false" in output
