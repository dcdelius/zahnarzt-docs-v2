# Mapping Tables

## Purpose
Explicit tables showing complete ID transformation chain.

---

## Table 1: QuestionBank.key → Canonical questionId

| QuestionBank.key | Canonical questionId | Translation Required |
|-----------------|---------------------|---------------------|
| `vitality` | `vitality` | ❌ No |
| `percussion` | `percussion` | ❌ No |
| `isolation` | `kofferdam` | ✅ Yes |
| `tiefe` | `cavity_depth` | ✅ Yes |
| `material` | `capping` | ✅ Yes |
| `mkv_vereinbarung` | `mkv_vereinbarung` | ❌ No |
| `mkv_betrag` | `mkv_betrag` | ❌ No |
| `mehrschicht` | `mehrschicht` | ❌ No |
| `adhasiv` | `adhasiv` | ❌ No |

---

## Table 2: QuestionBank.option.id → Canonical optionId

| Question | Option ID (Semantic) | Canonical optionId | Translation |
|----------|---------------------|-------------------|-------------|
| vitality | `pos` | `pos` | None |
| vitality | `neg` | `neg` | None |
| percussion | `pos` | `pos` | None |
| percussion | `neg` | `neg` | None |
| isolation | `kofferdam` | `yes` | ✅ Required |
| isolation | `relativ` | `no` | ✅ Required |
| tiefe | `normal` | `normal` | None |
| tiefe | `tief` | `deep` | ✅ Required |
| tiefe | `pulpanah` | `deep` | ✅ Required |
| material | `caoh` | `cp` | ✅ Required |
| material | `mta` | `cp` | ✅ Required |
| material | `biodentine` | `cp` | ✅ Required |
| mehrschicht | `yes` | `yes` | None |
| mehrschicht | `no` | `no` | None |

---

## Table 3: Canonical IDs → Answer Map Patterns

| Canonical questionId | answer_map.questionIdPatterns | Matches |
|---------------------|------------------------------|---------|
| `vitality` | `["forensic_vitality", "vitality"]` | ✅ |
| `percussion` | `["forensic_percussion", "percussion"]` | ✅ |
| `kofferdam` | `["upsell_kofferdam", "kofferdam", "isolation"]` | ✅ |
| `cavity_depth` | `["tiefe", "cavity_depth", "forensic_tiefe"]` | ✅ |
| `capping` | `["forensic_capping", "capping"]` | ✅ |
| `mehrschicht` | `["mkv_mehrschicht", "mehrschicht"]` | ✅ |

---

## Table 4: Canonical optionId → Chip Activation

| Question | Canonical optionId | Chip Activated | Chip Removed |
|----------|-------------------|----------------|--------------|
| kofferdam | `yes` | `kofferdam` | `rel_trocken` |
| kofferdam | `no` | `rel_trocken` | `kofferdam` |
| cavity_depth | `deep` | `cp` | — |
| cavity_depth | `normal` | — | — |
| vitality | `pos` | `vipr_pos` | `vipr_neg` |
| vitality | `neg` | `vipr_neg` | `vipr_pos` |
| percussion | `pos` | `perk_pos` | `perk_neg` |
| percussion | `neg` | `perk_neg` | `perk_pos` |
| mehrschicht | `yes` | `mehrschicht` | — |
| capping | `cp` | `cp` | `p` |
| capping | `none` | — | `cp`, `p` |

---

## Table 5: Chip → Output Template Placeholder

| Chip ID | Template Placeholder | Example Value |
|---------|---------------------|---------------|
| `kofferdam` | `{isolation}` | "Kofferdam" |
| `rel_trocken` | `{isolation}` | "relative Trockenlegung" |
| `cp` | `{capping}` | "indirekte Überkappung (Cp)" |
| `p` | `{capping}` | "direkte Überkappung (P)" |
| `vipr_pos` | `{vitality}` | "Sensibilität positiv" |
| `vipr_neg` | `{vitality}` | "Sensibilität negativ" |
| `la_infiltr` | `{anesthesia}` | "Infiltrationsanästhesie" |
| `la_leitung` | `{anesthesia}` | "Leitungsanästhesie" |

---

## Table 6: ExtractedData Fields → Template Placeholders

| Field | Path | Placeholder | Example |
|-------|------|-------------|---------|
| Tooth | `tooth` | `{tooth}` | "36" |
| Surfaces | `surfaces` | `{surfaces}` | "m, o, d" |
| Diagnosis | `diagnosis` | `{diagnosis}` | "Caries profunda" |
| Costs | `costs` | `{costs}` | "120 €" |
| Material (answer) | `material` | `{material}` | "MTA" |

---

## Placeholder Resolution Order

1. **From ExtractedData**: `tooth`, `surfaces`, `diagnosis`, `costs`
2. **From Active Chips**: `{isolation}`, `{capping}`, `{vitality}`, `{anesthesia}`
3. **From Answers**: `{material}` (if answered)
4. **Fallback**: Replace with "?" or omit section

---

## Assertion: No Placeholders in Output

After composition, assert:
```typescript
expect(output.sections.every(s => 
  !s.content.includes('{') && !s.content.includes('}')
)).toBe(true);
```
