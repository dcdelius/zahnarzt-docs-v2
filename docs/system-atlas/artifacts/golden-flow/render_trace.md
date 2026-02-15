# Render Trace — SSOT Proof

**Ziel:** Beweisen, dass jede Textzeile aus einem Chip stammt

---

## Trace Beispiel: GKV+MKV Füllung

### Input
- Tooth: 36
- Surfaces: o
- Insurance: GKV + MKV
- Answers: adhesive_technique = yes

### Final Chips
```json
["insurance_gkv_mkv", "filling_adhesive", "filling_layered", "la_leitung", "excavation", "finishing"]
```

### Output Text → Chip Mapping

| Zeile | Chip | Snippet-Key |
|-------|------|-------------|
| "Leitungsanästhesie N. alv. inf." | `la_leitung` | textSnippets.mittel |
| "Exkavation, Kavitätenpräparation." | `excavation` | textSnippets.mittel |
| "Einflächige Kompositfüllung in Mehrschichttechnik." | `filling_layered` | textSnippets.mittel |
| "Ätz-/Adhäsivtechnik (Schmelz/Dentin)." | `filling_adhesive` | textSnippets.mittel |
| "Politur und Okklusionskontrolle." | `finishing` | textSnippets.mittel |

### Billing → Chip Mapping

| Code | Chip | Source |
|------|------|--------|
| BEMA_41a | `la_leitung` | billingRefs.bema |
| BEMA_13a | (base) | from surface count |
| GOZ_2060_DIFF | `filling_layered` | billingRefs.goz (MKV diff) |
| GOZ_2197 | `filling_adhesive` | billingRefs.goz |

---

## SSOT Invarianten

### ✅ Invariante 1: Kein Text ohne Chip

```typescript
// Jede Textzeile muss auf einen Chip zurückführbar sein
outputLines.forEach(line => {
    const sourceChip = chips.find(c => c.textSnippets.includes(line));
    assert(sourceChip !== undefined, `Line has no chip source: ${line}`);
});
```

### ✅ Invariante 2: Kein Billing ohne Chip

```typescript
// Jeder Billing-Code muss aus einem Chip kommen
billingCodes.forEach(code => {
    const sourceChip = chips.find(c => c.billingRefs.includes(code));
    assert(sourceChip !== undefined, `Code has no chip source: ${code}`);
});
```

### ✅ Invariante 3: Keine PII im Output

Erlaubte Felder:
- Zahnnummer
- Flächenbezeichnung
- Behandlungsschritte
- Materialangaben

NICHT erlaubt:
- ❌ Patientenname
- ❌ Geburtsdatum
- ❌ Adresse
- ❌ Versicherungsnummer

---

## Gate Test

```typescript
// gate-ssot-no-orphan-output.test.ts
it('every output line traces to a chip', () => {
    const result = await runV10({ ... });
    const outputLines = result.output.fullText.split('\n');
    
    outputLines.forEach(line => {
        if (line.trim() === '') return;
        const hasChipSource = result.meta.provenance.chips.some(
            c => c.textSnippet.includes(line)
        );
        expect(hasChipSource).toBe(true);
    });
});
```
