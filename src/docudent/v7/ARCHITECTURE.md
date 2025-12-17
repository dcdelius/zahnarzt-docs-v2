# V7 Architecture & Boundaries

> **STRICT BOUNDARY**: V7 is a **UI/Rendering Layer**. It must NEVER contain billing logic, semantic definitions, or direct dependencies on the Billing Engine.

## 1. Core Rules

### ❌ Forbidden
1. **No Billing Imports**: Files in `v7/**` must NEVER import from `core/billing/**`.
   - *Reason*: Prevents circular dependencies and domain leakage.
   - *Enforcement*: `gate-v7-ssot-boundaries.test.ts` (Hard Stop).

2. **No Semantic Definitions**: V7 cannot "invent" new IDs, options, or business rules.
   - *Reason*: Determining "what implies what" is a Core Billing responsibility.
   - *Enforcement*: `gate-v7-ssot-boundaries.test.ts` bans string literals for Canonical IDs.

### ✅ Allowed
1. **Pipeline Outputs**: V7 receives a "Ready-to-Render" ViewModel from the pipeline.
2. **Contracts**: V7 may import from `contracts/canonicalIds.ts` to reference shared identifiers.
3. **UI-Only Labels**: V7 may map Canonical IDs to German display labels (e.g., `settingOptions.ts`), provided:
   - Keys are `CANONICAL_*` constants (not strings).
   - Values are purely display text.

## 2. Setting Options Strategy

Dropdowns and settings in V7 (e.g., `EditableSummaryChip`) need to know what options to display.

**Correct Flow**:
1. **IDs**: Must come from `settingsStore` (persisted user preference) or `contracts/canonicalIds.ts`.
2. **Labels**: Mapped in `v7/settings/settingOptions.ts`.
3. **Billing Effect**: Resolved by the **Pipeline** (Core), not V7. V7 does not know that "Kofferdam" activates `chip_kofferdam`. It just saves the ID.

**Fragmentation Prevention**:
- If V7 needs a new option, **ADD IT TO CORE FIRST**.
- Never add a "V7-only" option that affects billing.

## 3. No Registries Rule

> **V7 hosts NO registries (options/defaults/allowed values).**

### Why?
V7 is a rendering layer. If it defines "what options are allowed", it becomes a shadow SSOT and drifts from Core over time.

### Good vs. Bad

❌ **BAD** (V7 defining options):
```typescript
// v7/settings/settingOptions.ts
export const OPTIONS = [
    { id: 'kofferdam', label: 'Kofferdam' },
    { id: 'relativ', label: 'Relativ' },
];
```

✅ **GOOD** (V7 importing from contracts/):
```typescript
// v7/settings/settingOptions.ts
import { getSettingsAllowedValues } from '../../contracts/settingsUiRegistry';

export function getOptions(path: string) {
    return getSettingsAllowedValues(path);
}
```

### Gates
- `gate-fragmentation-sentinel.test.ts`: Fails if v7/settings contains `options: [` patterns.
- `gate-fragmentation-sentinel.test.ts`: Fails if contracts/ imports from v7/.

## 4. Verification

Run the boundary gate to verify compliance:
```bash
npm test src/docudent/__tests__/gates/gate-v7-ssot-boundaries.test.ts
npm test src/docudent/__tests__/gates/gate-fragmentation-sentinel.test.ts
```
