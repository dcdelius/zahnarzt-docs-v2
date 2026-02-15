# Pack UI Contract (M44 + M45)

## Overview

Every TreatmentPack must implement `getUiContract()` returning `PackUiContractV1`.

This ensures V10 UI is **pack-driven** — no hardcoded treatment logic in UI components.

---

## Contract Structure

```typescript
interface PackUiContractV1 {
  chipControls: ChipControlSpec[];
  settingsSchema: SettingsSchemaV1;
  askbackPolicy: AskbackPolicyV1;
  dictationHints?: string[];
}
```

---

## Chip Controls

| Mode | Description | Options Required |
|------|-------------|------------------|
| `toggle` | On/Off switch | No |
| `param` | Select from list | Yes (≥2) |

### Param Chip Mapping

For param controls that map to multiple underlying chips:

```typescript
{
  chipId: 'wf_technique',
  mode: 'param',
  options: [
    { value: 'kalt', label: 'Kaltlateral' },
    { value: 'warm', label: 'Warm vertikal' },
  ],
  chipMapping: {
    'kalt': 'wf_kalt',
    'warm': 'wf_warm',
  }
}
```

---

## M45: usePackUiContract Hook

Use the hook to resolve contracts at runtime:

```typescript
import { usePackUiContract } from '../ui/usePackUiContract';

// Single mode
const { contract, isSupported } = usePackUiContract({ treatmentId: 'endo' });

// Multi mode
const { resolved } = usePackUiContract({
  instances: [
    { instanceId: 'i1', treatmentId: 'endo' },
    { instanceId: 'i2', treatmentId: 'fuellung' },
  ]
});
```

---

## How to Onboard a New Treatment in 10 Minutes

1. **Create pack directory**: `src/docudent/v10/packs/{treatment}/pack.ts`

2. **Implement `getUiContract()`**:
   ```typescript
   getUiContract() {
     return {
       chipControls: [/* at least 1 */],
       settingsSchema: { practice: [], user: [] },
       askbackPolicy: {
         criticalAskbacks: ['{treatment}_tooth'], // REQUIRED
       },
     };
   }
   ```

3. **Register in `packs/registry.ts`**

4. **Run gates**:
   ```bash
   npx vitest run src/docudent/__tests__/gates/gate-m44*.test.ts gate-m45*.test.ts
   ```

5. **Done!** UI renders controls automatically

---

## Common Pitfalls

| ❌ Don't | ✅ Do |
|---------|------|
| `if (treatmentId === 'endo')` in UI | Use contract from hook |
| Hardcode chip arrays in components | Read from `contract.chipControls` |
| Skip tooth askback | Include in `criticalAskbacks` |
| Add param control without options | Define ≥2 options |

---

## Gates

| Gate | Validates |
|------|-----------|
| `gate-m44-pack-ui-contract-present` | All packs have contract |
| `gate-m44-param-controls-have-options` | Param controls have ≥2 options |
| `gate-m44-critical-askbacks-not-skippable` | Critical ≠ skippable |
| `gate-m45-ui-is-contract-driven` | Hook works correctly |
| `gate-m45-no-treatment-branching-in-ui` | No hardcoded treatment IDs |
| `gate-m45-pack-contract-completeness` | Complete contract structure |

