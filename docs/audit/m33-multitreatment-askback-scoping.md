# M33 MultiTreatment Askback Scoping

## Problem

When a dictation contains multiple treatments (e.g., Endo + Füllung), statements like "ohne Anästhesie" must be correctly attributed to prevent:
1. **Negation Leak**: "ohne Betäubung" for Füllung blocking Endo LA
2. **False Defaults**: Guessing scope instead of asking
3. **Non-determinism**: Different runs producing different attributions

## Solution

### Segment Scoping

[segmentScoping.ts](file:///Users/david/dokumaster-ui/src/docudent/v10/qa/segmentScoping.ts)

Lightweight clause segmentation:

1. **Split by markers**: "danach", "anschließend", "im Anschluss", etc.
2. **Detect treatment per clause**: Keywords like "Endo", "WKB" → endo; "Füllung", "Komposit" → fuellung
3. **Attribute statements to clause context**

### Key Functions

| Function | Purpose | Line |
|----------|---------|------|
| `splitIntoClauses()` | Split dictation by clause markers | L92-129 |
| `detectTreatmentType()` | Identify endo vs fuellung | L134-148 |
| `parseScopedDictation()` | Full parse with attribution | L153-178 |
| `attributeStatement()` | Scope a specific statement | L193-221 |
| `negationAppliesToTreatment()` | Check if negation affects treatment | L226-234 |

---

## Examples

### Example 1: Clear Scope

```
"Endo 14 2 Kanäle, danach Füllung okklusal ohne Anästhesie"
```

| Clause | Treatment | Statements |
|--------|-----------|------------|
| "Endo 14 2 Kanäle" | endo | - |
| "Füllung okklusal ohne Anästhesie" | fuellung | ohne anästhesie |

**Result**: "ohne Anästhesie" scoped to `fuellung` only.

### Example 2: Ambiguous Scope

```
"Ohne Anästhesie Endo 14 und Füllung"
```

First clause has negation but no clear treatment context.

**Result**: Scope = `ambiguous` → needs askback.

### Example 3: No Leak

```
"Endo 14 Leitungsanästhesie, danach Füllung ohne Betäubung"
```

- Endo: LA preserved (Leitung)
- Füllung: LA blocked (ohne Betäubung)
- **No cross-leak**

---

## Gates

| Gate | Tests | Purpose |
|------|-------|---------|
| [gate-m33-multitreatment-scope-attribution](file:///Users/david/dokumaster-ui/src/docudent/__tests__/gates/gate-m33-multitreatment-scope-attribution.test.ts) | 12 | Clause splitting, treatment detection |
| [gate-m33-scope-askback-when-ambiguous](file:///Users/david/dokumaster-ui/src/docudent/__tests__/gates/gate-m33-scope-askback-when-ambiguous.test.ts) | 7 | Ambiguous scope handling |
| [gate-m33-negation-does-not-leak](file:///Users/david/dokumaster-ui/src/docudent/__tests__/gates/gate-m33-negation-does-not-leak-across-instances.test.ts) | 5 | Leak prevention |
| [gate-m33-multi-determinism-50x](file:///Users/david/dokumaster-ui/src/docudent/__tests__/gates/gate-m33-multi-determinism-50x.test.ts) | 5 | Determinism |

---

## Commands

```bash
# M33 only
npx vitest run src/docudent/__tests__/gates/gate-m33*.test.ts --reporter=verbose

# All M-gates
npx vitest run src/docudent/__tests__/gates/gate-m*.test.ts --reporter=dot
```

---

## Known Limitations

1. **Clause markers are German-specific**: Only handles markers like "danach", "anschließend"
2. **No NLP**: Cannot handle complex sentence structures
3. **Ambiguity fallback**: Defaults to `ambiguous` if unsure
4. **Runtime integration**: Not yet wired into V10 pipeline (truthcases only)

---

## Files

```
src/docudent/v10/qa/segmentScoping.ts
src/docudent/v10/qa/clinicalTruthcases.v4.ts
src/docudent/__tests__/gates/gate-m33-*.test.ts (4 files)
docs/audit/m33-multitreatment-askback-scoping.md
```
