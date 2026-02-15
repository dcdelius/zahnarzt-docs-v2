# Render Trace v3 — SSOT Provenance

**GP5: Jede Output-Zeile + jede BillingRef tracebar zu Chip**

---

## SSOT Provenance Invariants

1. **No Text Without Chip** — Jede Output-Zeile muss zu ≥1 Chip tracebar sein
2. **No Billing Without Chip** — Jede BillingRef muss zu ≥1 Chip tracebar sein
3. **No PII in Output** — Keine Patientendaten im Output

---

## Chip → Text Template Mapping

| Chip | Text Template (DE) |
|------|--------------------|
| material_giz | "Füllungsmaterial: Glasionomerzement" |
| material_composite | "Füllungsmaterial: Komposit" |
| material_bulk_fill | "Füllungsmaterial: Bulk-Fill Komposit" |
| material_self_adhesive | "Füllungsmaterial: Selbstadhäsives Material" |
| technique_adhesive | "Adhäsivtechnik durchgeführt (Ätzen/Primer/Bond)" |
| technique_layering | "Schichttechnik/inkrementelle Applikation" |
| isolation_kofferdam | "Absolute Trockenlegung mit Kofferdam" |
| isolation_relative | "Relative Trockenlegung" |
| pulp_liner | "Pulpaschutz: Liner (CaOH/GIZ)" |
| pulp_base | "Pulpaschutz: Unterfüllung/Base" |
| matrix_sectional | "Approximalkontaktgestaltung mit Sektionalmatrize" |
| matrix_tofflemire | "Approximalkontaktgestaltung mit Tofflemire-Matrize" |
| mkv_vorhanden | "Mehrkostenvereinbarung vorhanden" |
| insurance_gkv_regel | (nur context, kein Text) |
| insurance_gkv_mehrkosten | (nur context + MKV-Text s.o.) |
| insurance_pkv | (nur context, kein Text) |

---

## Chip → BillingRef Mapping (via SSOT)

> **WICHTIG:** Keine BillingRefs hier hardcoden!
> Mapping erfolgt über `unified.json` > `billingRefs` Sektion.

| Chip | Lookup Key in unified.json |
|------|----------------------------|
| material_composite | billingRefCategories.material.composite |
| technique_adhesive | billingRefCategories.technique.adhesive |
| isolation_kofferdam | billingRefCategories.isolation.kofferdam |
| ... | ... |

---

## Trace Example: V3 Truthcase 3

**Input Chips:**
```json
["insurance_pkv", "material_composite", "technique_adhesive", 
 "technique_layering", "isolation_kofferdam"]
```

**Output Text Trace:**
```
Line 1: "Kompositfüllung Zahn 24 okklusal palatinal"
        ← material_composite

Line 2: "Adhäsivtechnik durchgeführt"
        ← technique_adhesive

Line 3: "Schichttechnik/inkrementelle Applikation"
        ← technique_layering

Line 4: "Absolute Trockenlegung mit Kofferdam"
        ← isolation_kofferdam
```

**BillingRef Trace:**
```
BillingRef 1: (from unified.json via chip lookup)
              ← material_composite
              ← technique_adhesive

BillingRef 2: (from unified.json via chip lookup)
              ← isolation_kofferdam
```

---

## Gate Test: SSOT Provenance

```typescript
// gate-fuellung-ssot-provenance.v3.test.ts

describe('SSOT Provenance', () => {
    it('every output line traces to chip', () => {
        const result = renderFromChips(CHIPS);
        result.textLines.forEach(line => {
            expect(line.sourceChips.length).toBeGreaterThan(0);
        });
    });

    it('every billingRef traces to chip', () => {
        const result = renderFromChips(CHIPS);
        result.billingRefs.forEach(ref => {
            expect(ref.sourceChips.length).toBeGreaterThan(0);
        });
    });

    it('no patient fields in output', () => {
        const result = renderFromChips(CHIPS);
        const piiFields = ['patientName', 'geburtsdatum', 'versichertennummer'];
        piiFields.forEach(field => {
            expect(JSON.stringify(result)).not.toContain(field);
        });
    });
});
```
