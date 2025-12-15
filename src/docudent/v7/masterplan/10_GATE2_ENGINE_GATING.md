# Gate 2: Engine Scope + Gating

## Status: BLOCKED (Gate 1 must pass first)

Gate 1 is now GREEN (97/97 tests pass). Gate 2 can proceed.

---

## Objective

Define `requiredFacts` per engine and ensure ZE/FZ engines are skipped for `fuellung` treatment.

---

## Tasks

### 2.1 Define Engine Required Facts

Create a registry of which facts each engine requires:

```typescript
const ENGINE_REQUIREMENTS: Record<string, string[]> = {
    fuellung: ['tooth', 'surfaces'],
    endo: ['tooth', 'vitality'],
    ze: ['tooth', 'tooth_status', 'prothesis_type'],  // ZE needs more facts
    fz: ['tooth_range', 'prothesis_type'],           // FZ needs range
    par: ['tooth', 'pocket_depths'],
};
```

### 2.2 Gate Check Implementation

Add gate check in `treatmentEngine.ts`:

```typescript
function canRunEngine(treatmentId: string, facts: MergedFacts): boolean {
    const required = ENGINE_REQUIREMENTS[treatmentId] || [];
    return required.every(fact => facts[fact] !== undefined && facts[fact] !== null);
}
```

### 2.3 Skip ZE/FZ for Fuellung

Ensure that when `treatmentId = 'fuellung'`:
- ZE engine is NOT invoked
- FZ engine is NOT invoked
- Only fuellung-related chips appear

---

## Test Requirements

```typescript
describe('Gate 2: Engine Gating', () => {
    it('should NOT include ZE billing codes in fuellung output', () => {
        const output = generateFinalOutput({ treatmentId: 'fuellung', ... });
        expect(output.billingCodes).not.toContain('91a'); // ZE code
        expect(output.billingCodes).not.toContain('92');  // ZE code
    });

    it('should NOT include FZ billing codes in fuellung output', () => {
        const output = generateFinalOutput({ treatmentId: 'fuellung', ... });
        expect(output.billingCodes.some(c => c.startsWith('96'))).toBe(false);
    });

    it('should NOT include ZE/FZ text in fuellung output', () => {
        const output = generateFinalOutput({ treatmentId: 'fuellung', ... });
        expect(output.fullText).not.toContain('Brücke');
        expect(output.fullText).not.toContain('Prothese');
    });
});
```

---

## Files to Modify

| File | Change |
|------|--------|
| `treatmentEngine.ts` | Add `canRunEngine()` gate check |
| `chipResolver.ts` | Filter chips by treatment scope |
| `*_test.ts` | Add ZE/FZ exclusion tests |

---

## Blocked Until

- [x] Gate 1: Placeholder fix (DONE)
- [x] Gate 1: 97 tests passing (DONE)

---

## Priority

Medium - Reduces noise in fuellung outputs, prevents cross-treatment pollution.
