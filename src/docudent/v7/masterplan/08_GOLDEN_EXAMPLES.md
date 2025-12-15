# V7 Pipeline — Golden Examples

## Purpose

These golden cases define **semantic truth**. If the pipeline produces different results, the pipeline is wrong.

---

## Golden Case 1: Deep Filling with LA + MKV

### Input

```
Dictation: "36 mod mit Anästhesie tief 120€"

Answers (from UI):
  vitality = pos
  percussion = neg
  isolation = kofferdam
  tiefe = tief
  material = mta
  mehrschicht = yes
  mkv_betrag = 120
```

### Expected Extracted Facts

| Fact | Value |
|------|-------|
| tooth | "36" |
| surfaces | ["m", "o", "d"] |
| diagnosis | "Caries profunda" or similar |
| costs | 120 |
| mentioned.anesthesia.type | "infiltr" or "leitung" |
| mentioned.tiefe | "tief" |

### Expected Chip Activations

| Chip ID | Reason |
|---------|--------|
| `exkavation` | Always-on default |
| `komposit_basic` | Always-on default |
| `finishing` | Always-on default |
| `la_infiltr` or `la_leitung` | From extraction (UK molar → leitung) |
| `vipr_pos` | vitality = pos |
| `perk_neg` | percussion = neg |
| `kofferdam` | isolation = kofferdam → yes |
| `cp` | tiefe = tief → deep |
| `mehrschicht` | mehrschicht = yes (requires MKV) |

### Output MUST Contain

- Tooth: "36" (never "35" or "12")
- Surfaces: "m", "o", "d" (in some form)
- Capping material: "MTA" (not "{material}")
- MKV amount: "120 €" or "120€"

### Forbidden Output Patterns

| Pattern | Why |
|---------|-----|
| `{material}` | Unsubstituted placeholder |
| `{tooth}` | Unsubstituted placeholder |
| `{surfaces}` | Unsubstituted placeholder |
| "Zahn 35" | Wrong tooth |
| "12€" | Mangled 120 |

### Expected Warnings

**NONE** — all facts are provided.

---

## Golden Case 2: Simple Filling, No MKV

### Input

```
Dictation: "36 mo"

Answers (from UI):
  vitality = pos
  percussion = neg
  isolation = relativ
  tiefe = normal
```

### Expected Extracted Facts

| Fact | Value |
|------|-------|
| tooth | "36" |
| surfaces | ["m", "o"] |
| diagnosis | "Karies" or similar |
| costs | null |

### Expected Chip Activations

| Chip ID | Reason |
|---------|--------|
| `exkavation` | Always-on default |
| `komposit_basic` | Always-on default |
| `finishing` | Always-on default |
| `vipr_pos` | vitality = pos |
| `perk_neg` | percussion = neg |
| `rel_trocken` | isolation = relativ → no |

### NOT Activated

| Chip ID | Why Not |
|---------|---------|
| `kofferdam` | isolation = relativ |
| `cp` | tiefe = normal |
| `mehrschicht` | No MKV |
| `la_*` | No anesthesia mentioned |

### Output MUST Contain

- Tooth: "36"
- Surfaces: "m", "o"
- "Relative Trockenlegung" or similar (not Kofferdam)

### Forbidden Output Patterns

| Pattern | Why |
|---------|-----|
| "Kofferdam" | Wrong isolation |
| "Überkappung" | No capping |
| "Zuzahlung" | No MKV |
| "Mehrschicht" | No MKV |

### Expected Warnings

**NONE** — basic filling is complete.

---

## Golden Case 3: Missing Tooth

### Input

```
Dictation: "mod Füllung"

Answers (from UI):
  (none provided)
```

### Expected Extracted Facts

| Fact | Value |
|------|-------|
| tooth | null |
| surfaces | ["m", "o", "d"] or [] |
| diagnosis | null |

### Expected Chip Activations

| Chip ID | Reason |
|---------|--------|
| `exkavation` | Always-on default |
| `komposit_basic` | Always-on default |
| `finishing` | Always-on default |

### Output MUST Contain

- Placeholder for tooth or generic text
- Questions should be generated to ask for tooth

### Forbidden Output Patterns

| Pattern | Why |
|---------|-----|
| "Zahn 36" | No tooth was provided |
| "Zahn 35" | No tooth was provided |

### Expected Warnings

| Warning | Reason |
|---------|--------|
| "Zahnangabe fehlt" | tooth is null |
| "Flächenangabe fehlt" | (if surfaces empty) |

---

## Test File Location

These cases are implemented in:
```
src/docudent/v7/pipeline/__tests__/golden-output.test.ts
```

**Current Status**: 33 tests, all passing.
