# SSOT Entry Points

Single Source of Truth for V10 billing, combinability, and completeness.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        V10 PIPELINE (runV10.ts)                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Dictation → Extract → Facts → KB Concepts → Chips                  │
│                                              │                       │
│                                              ▼                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │         BILLING CONSTRUCTOR: renderFromKbChips()               │ │
│  │         src/docudent/v10/renderer/renderFromKbChips.ts         │ │
│  │         - chip.billingRef → GKV/PKV/MKV branch                 │ │
│  │         - surface_mapping → F-code from surface count          │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                              │                       │
│                                              ▼                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │       COMBINABILITY: checkCombinabilityFromKb()                │ │
│  │       src/docudent/v10/billing/combinability/checkCombinabilityFromKb.ts │ │
│  │       - Load combinability_kb.v1.json (compiled runtime KB)    │ │
│  │       - Apply rules → PASS / WARN / BLOCK                      │ │
│  │       - autoResolve → droppedCodes (no user-facing BLOCK)      │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                              │                       │
│                                              ▼                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │      COMPLETENESS: computeBillingCompleteness()                │ │
│  │      src/docudent/v10/billing/billingCompleteness.ts           │ │
│  │      - Trace origins: chip.billingRef / surface_mapping        │ │
│  │      - Track droppedCodes                                       │ │
│  │      - Return: { isComplete, missing, origins }                │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                              │                       │
│                                              ▼                       │
│                          meta.billingCompleteness                    │
│                          output.billingCodes (filtered)              │
└─────────────────────────────────────────────────────────────────────┘
```

## Compiler Chain (Combinability)

```
kombinationen.json (source) → compiler.ts → combinability_kb.v1.json (runtime)
```

| Step | File | Purpose |
|------|------|---------|
| Source | `src/docudent/core/billing/knowledgeBase/regeln/kombinationen.json` | Human-editable rules (single source) |
| Compiler | `src/docudent/v10/kb/combinability/compiler.ts` | Transform to runtime format |
| Runtime | `src/docudent/v10/kb/combinability/combinability_kb.v1.json` | Loaded by `checkCombinabilityFromKb()` |

## Key Functions

| Function | Location | Purpose |
|----------|----------|---------|
| `renderFromKbChips()` | `renderer/renderFromKbChips.ts` | Single billing constructor |
| `checkCombinabilityFromKb()` | `billing/combinability/checkCombinabilityFromKb.ts` | Apply combinability rules |
| `computeBillingCompleteness()` | `billing/billingCompleteness.ts` | Verify origin tracking |

## Invariants

1. **No hardcoded billing codes** in runtime (only in KB/tests)
2. **SSOT**: All billing originates from `chip.billingRef` or `surface_mapping`
3. **Auto-resolve**: Combinability never returns user-facing BLOCK for Fuellung
4. **Completeness**: Every billing code has traceable origin
5. **KB version** tracked in `meta.kb.treatments` and `meta.combinability.kbVersion`
