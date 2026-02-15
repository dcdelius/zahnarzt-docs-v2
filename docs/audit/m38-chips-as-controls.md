# M38 Chips-as-Controls

## Summary

| Metric | Value |
|--------|-------|
| Hooks | 1 (useChipOverrides) |
| UI Components | 2 |
| Gates | 2 |

---

## Chips-as-Controls Concept

Chips are the **primary control surface**. No settings form, no button wall.

### Chip States

| State | Icon | Behavior |
|-------|------|----------|
| **Auto** | ⚡ | Follows dictation → settings → default |
| **On** | ✓ | Manually enabled |
| **Off** | ✗ | Manually disabled |

### Precedence

```
dictation negation > dictation explicit > manual override > settings > default
```

---

## Overrides Data Model

[useChipOverrides.ts](file:///Users/david/dokumaster-ui/src/docudent/v10/settings/useChipOverrides.ts)

```typescript
type ChipMode = 'auto' | 'on' | 'off';

interface ChipOverride {
    mode: ChipMode;
    value?: unknown;
}

type OverridesByInstance = Record<string, Record<string, ChipOverride>>;
```

### Parametrized Chips

| Chip ID | Options |
|---------|---------|
| la_type | none / infiltr / leitung |
| isolation | none / relative / kofferdam |
| wl_method | elektrisch / roentgen / both |
| wf_technique | kalt / warm / einzel |

---

## Components

### V10ChipsControlPanel

[V10ChipsControlPanel.tsx](file:///Users/david/dokumaster-ui/src/docudent/v10/components/V10ChipsControlPanel.tsx)

- Clickable chip pills with popover
- Auto/On/Off for simple chips
- Value selection for parametrized chips
- Source badges (Diktat/Praxis/Manuell)

### V10Stepper

[V10Stepper.tsx](file:///Users/david/dokumaster-ui/src/docudent/v10/components/V10Stepper.tsx)

- 3 stages: Diktat → Chips/Fragen → Output
- Navigation buttons (Zurück / Weiter)
- Visual progress indicators

---

## Gates

| Gate | Tests |
|------|-------|
| gate-m38-chips-as-controls | Chip resolution, parametrized chips |
| gate-m38-override-precedence | Full precedence chain, multi-instance |

---

## Commands

```bash
# M38 only
npx vitest run src/docudent/__tests__/gates/gate-m38*.test.ts --reporter=verbose

# All M-gates
npx vitest run src/docudent/__tests__/gates/gate-m*.test.ts --reporter=dot
```

---

## Files

```
src/docudent/v10/settings/useChipOverrides.ts
src/docudent/v10/components/V10ChipsControlPanel.tsx + .css
src/docudent/v10/components/V10Stepper.tsx + .css
src/docudent/__tests__/gates/gate-m38-*.test.ts (2 files)
docs/audit/m38-chips-as-controls.md
```
