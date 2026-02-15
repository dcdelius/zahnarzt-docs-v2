# Contracts

Enforced invariants with gate tests.

## Core Contracts

| Contract | Description | Gate Test |
|----------|-------------|-----------|
| **Questions Non-Empty** | If state=questions, questions[] must be non-empty | `gate-v10-ui-state-machine.test.ts` |
| **Tooth Required** | Missing tooth → critical askback emitted | `gate-v10-workflow-critical-tooth-required.test.ts` |
| **SSOT Closure** | Emitted chips must exist in unified.json | `gate-v10-ssot-chip-closure.test.ts` |
| **Billing No Silent Drop** | Empty billing → diagnostic.reason required | `gate-m82-no-silent-billing-drop.test.ts` |
| **BillingRef Closure** | All billing refs must exist in catalogs | `gate-m82-billingref-closure.test.ts` |
| **No V6 Runtime** | No runtime file imports v6/** | `gate-no-runtime-imports-from-v6.test.ts` |
| **No Hardcoded Chips** | Chip IDs via CANONICAL_CHIP_IDS | `gate-no-hardcoded-chip-ids.test.ts` |
| **V7 SSOT Boundaries** | V7 ≠ core/billing imports | `gate-v7-ssot-boundaries.test.ts` |

## Parity Contracts

| Contract | Description | Gate Test |
|----------|-------------|-----------|
| **UI/CLI Parity** | UI capture = CLI replay | `gate-v10-parity-ui-vs-replay.test.ts` |
| **Repro Replay** | Repro bundle replay diff=0 | `gate-v10-repro-replay-26mod-mkv.test.ts` |

## Medical Contracts

| Contract | Description | Gate Test |
|----------|-------------|-----------|
| **Askback Sufficiency** | Deep filling → capping question | `gate-v10-deep-filling-wiring.test.ts` |
| **Non-Redundancy** | Settings skip redundant questions | `gate-v10-askback-nonredundancy.test.ts` |
| **No Double Askback** | Same askback not emitted twice | `gate-v10-medical-trace-no-double-askback.test.ts` |

## Billing Contracts

| Contract | Description | Gate Test |
|----------|-------------|-----------|
| **No False Positive Billing** | Billing only from confirmed facts | `gate-no-billing-without-confirmed-fact.test.ts` |
| **No Phantom Billing** | No billing codes without chip source | `gate-no-phantom-billing-codes.test.ts` |

## BillingRef-Only Contract (NEW 2025-12-31)

**Rule**: All billing codes in V10 output are **DB keys**, never raw BEMA/GOZ codes.

| Contract | Description | Gate Test |
|----------|-------------|-----------|
| **No Hardcoded Codes** | output.fullText NEVER contains BEMA/GOZ strings | `gate-no-hardcoded-billing-codes.test.ts` |
| **BillingRef Closure** | All billingRefs exist in bema.json/goz.json | `gate-billingref-closure.test.ts` |
| **DB Key Format** | billingRefs match `^(BEMA|GOZ|GOÄ|BEL)_\w+$` | `gate-billingref-closure.test.ts` |

## BillingIntent Channelization Contract (NEW 2026-01-01)

**Rule**: Insurance type billing must be channelized early in pipeline to prevent forbidden catalog lookups.

| Contract | Description | Gate Test |
|----------|-------------|-----------|
| **GKV No GOZ** | GKV BillingIntent has allowGoz=false, never invokes GOZ lookups | `gate-insurance-channelization-no-lookup.test.ts` |
| **PKV No BEMA** | PKV BillingIntent has allowBema=false, never invokes BEMA lookups | `gate-insurance-channelization-no-lookup.test.ts` |
| **MKV Addon Controlled** | MKV addon only when allowGozAddon=true (mehrkostenActive) | `gate-insurance-channelization-no-lookup.test.ts` |
| **No Silent Defaults** | surfaces=[] returns null with reason, never defaults | `gate-insurance-channelization-no-lookup.test.ts` |

**BillingIntent Type**:
```typescript
interface BillingIntent {
    mode: 'GKV' | 'PKV' | 'MKV';
    allowBema: boolean;
    allowGoz: boolean;
    allowGozAddon: boolean;
}
```

**mehrkostenActive Rule**:
```typescript
mehrkostenActive = 
    facts.mehrkostenConfirmed ??
    facts.mehrkostenMentioned ??
    (insuranceType === 'MKV' && facts.nurKasse !== true)
```

**Surface Mapping (F-Codes)**:
- Chip `fuellung_grundleistung` has `billingRef: null`
- Billing resolved via `surface_mapping` in unified.json
- `surfaceBillingResolver.ts` uses surfaceCount + insuranceType → DB key

```
surface_mapping:
  "1": { GKV: "BEMA_13", PKV: "GOZ_2060" }
  "2": { GKV: "BEMA_13b", PKV: "GOZ_2080" }
  "3": { GKV: "BEMA_13c", PKV: "GOZ_2100" }
  "4+": { GKV: "BEMA_13d", PKV: "GOZ_2120" }
```

## MKV Billing Contract (2025-12-31)

**MKV (Mischkasse)** = Patient with GKV base + optional private addon for Mehrkosten.

### Two-Channel Billing

| Insurance | Base Channel | Addon Channel | Condition |
|-----------|--------------|---------------|-----------|
| **GKV** | BEMA only | ❌ none | — |
| **PKV** | GOZ only | ❌ none | — |
| **MKV** | BEMA (same as GKV) | GOZ (addon) | Only if `mehrkostenConfirmed=true` |

### Rules

1. **GKV may never contain GOZ** — existing gate enforced
2. **PKV may never contain BEMA** — existing gate enforced
3. **MKV base = GKV billing** — same BEMA codes as GKV
4. **MKV addon** — GOZ codes only if Mehrkosten/Komposit/Adhäsiv confirmed
5. All codes are billingRefs (DB keys), no inline text codes

### Data Structure

```json
"surface_mapping": {
    "1": { "GKV": "BEMA_13", "PKV": "GOZ_2060", "MKV": "BEMA_13", "MKV_addon": "GOZ_2060" }
}
```

### Gates

| Contract | Gate Test |
|----------|-----------|
| GKV only BEMA | `gate-mkv-billing-contract.test.ts` |
| PKV only GOZ | `gate-mkv-billing-contract.test.ts` |
| MKV base = BEMA | `gate-mkv-billing-contract.test.ts` |
| MKV addon = GOZ (wenn Mehrkosten) | `gate-mkv-billing-contract.test.ts` |

## SurfaceCount Contract (2025-12-31)

### SSOT Rule

**Single Source of Truth**: `TreatmentFacts.surfaces` is the ONLY field used for F-code resolution.
- Module: [`v10/extraction/surfaces/normalizeSurfaces.ts`](file:///Users/david/dokumaster-ui/src/docudent/v10/extraction/surfaces/normalizeSurfaces.ts)
- No other parser in Renderer/Billing may derive surfaces.

### No-Guessing Rule

**Ambiguous terms must NOT be guessed**. When input contains:
- `approximal`, `seitlich`, `großflächig`, `mehrflächig`, `zwischenzahn`, `interproximal`

Then: `surfaces = []`, `surfaceAmbiguous = true`, L1 askback required.

### Canonical Surfaces

Only these values are valid: `m` | `o` | `d` | `b` | `l`
- `palatinal` → `l`
- `labial` → `b`

### Data Flow

```
Dictation/Extraction
    ↓
normalizeSurfaces({ extracted, dictation })
    ↓
TreatmentFacts.surfaces + surfaceSource + surfaceAmbiguous
    ↓
renderFromKbChips context.surfaces
    ↓
surfaceBillingResolver → BEMA_13b (based on .length)
```

### Gates

| Contract | Gate Test |
|----------|-----------|
| Correct F-Code | `gate-f-code-surface-truthcases.test.ts` (7) |
| No silent defaults | `surfaceAmbiguous` triggers questions |
| SSOT | No surface parsing in renderer |

| Boundary | Rule | Gate Test |
|----------|------|-----------|
| **V10 UI → Public API** | V10 UI imports only from `v10/public` + `contracts` | `gate-v10-no-runtime-imports-from-v7-pipeline.test.ts` |
| **V7 → No Billing** | V7 cannot import `core/billing/**` | `gate-v7-ssot-boundaries.test.ts` |
| **Chip IDs** | Use `CANONICAL_CHIP_IDS` from `contracts/canonicalIds.ts` | `gate-v7-ssot-boundaries.test.ts` |
| **Core Internals** | Never import core internals directly from UI | `gate-v10-no-runtime-imports-from-v7-pipeline.test.ts` |

**Central Chip ID Source**: `src/docudent/contracts/canonicalIds.ts`

## Multi-Treatment Scoping Contract

**Module**: `v10/multitreatment/scoping.ts`

| Rule | Description | Test |
|------|-------------|------|
| **Segment Markers** | "danach", "zusätzlich", "auch", "weiterer Zahn", "ebenfalls", "noch" | `scoping.no_leak.test.ts` |
| **Default Multi-Tooth** | Multiple teeth without marker = same treatment, multiple instances | `scoping.no_leak.test.ts` |
| **Negation Scoping** | Negation affects only segment/instance (unless "bei beiden"/"generell") | `scoping.negation_scope.test.ts` |
| **Surface Scoping** | Surfaces only apply to tooth in segment, no global leaks | `scoping.surface_scope.test.ts` |
| **No Array Reference Sharing** | Each instance has its own arrays (not shared) | `scoping.no_leak.test.ts` |

**Instance Facts Structure**:
```typescript
interface InstanceFacts {
    instanceId: string;   // packId-tooth-counter
    packId: string;       // fuellung, endo, etc.
    teeth: string[];      // Teeth in this instance
    surfaces: string[];   // Surfaces (scoped to instance)
    negations: string[];  // Negations (scoped to instance)
    facts: Record<string, unknown>;
}
```

## Settings → Facts Contract (Not Billing)

**Precedence** (highest to lowest):
1. Dictation negation ("ohne Kofferdam")
2. Dictation explicit ("Adhäsivtechnik")
3. Manual override (user answer)
4. Settings default (practice/user)
5. System default

**Rule**: Settings fill Facts, not Billing. Billing comes from Chips only.

## V10 Session Contract

**Module**: `v10/uiController/createV10Session.ts`

| Rule | Description | Test |
|------|-------------|------|
| **Same Pipeline** | createV10Session uses `runV10` (same as UI) | `v10.reality.contract.test.ts` |
| **No Fake Chips** | Chips from Procedure nodes only (never `${key}_${val}`) | Contract E |
| **No Shadow Questions** | Questions from `runV10.questions`, no override | Contract B |
| **Instance Isolation** | Separate `facts`, `chips`, `answeredFacts` per instance | Contract C |
| **SSOT Output** | BillingRefs from pipeline, no hardcoded codes | Contract D |
| **Per-Instance Output** | `perInstance` is SSOT with real instanceIds | `v10.per-instance-output.contract.test.ts` |

**Per-Instance Output Contract (NEW)**:
- `perInstance` is the Source of Truth for multi-treatment output
- Keys are real instanceIds from scoping (e.g., `fuellung-36-1`)
- Each entry contains: `{ instanceId, teeth, text, billingRefs, chips }`
- Global `fullText` is derived by concatenating per-instance texts
- Global `billingCodes` is derived by merging per-instance billingRefs

**Answer Flow**:
1. Normalize askback ID → `factKey`
2. Update `instance.facts[factKey] = value`
3. Add `factKey` to `instance.answeredFacts`
4. Re-run `runV10` with answers (Procedure re-matches and emits chips)

## V10 Boundary Contract

**Rule**: V10 pipeline/hook must not delegate to V7 pipeline/hook. Any remaining V7 reuse must be explicit and quarantined (e.g. router/styles), not in orchestration.

| Check | Gate | Command |
|-------|------|---------|
| V10 hook/pipeline no V7 delegation | `gate-v10-no-runtime-imports-from-v7-pipeline.test.ts` | `npx vitest run gate-v10-no-runtime-imports-from-v7-pipeline` |
| V10 pages/components/hooks no direct V7 imports | `gate-no-imports-from-v7-in-v10-ui.test.ts` | `npx vitest run gate-no-imports-from-v7-in-v10-ui` |

**Notes / Exceptions (current code):**
- `src/docudent/v10/app/V10Router.tsx` reuses V7 CSS + some V7 pages for secondary routes (`/docudent/v10/settings`, etc.).
- `src/docudent/v10/extraction/selectExtractor.ts` dynamically imports a V7 stub extractor only in stub/test mode.

## Instance Isolation Contract

**Rule**: Multi-treatment sessions must have strict per-instance isolation.

| Contract | Description | Test |
|----------|-------------|------|
| **Question Binding** | Questions keyed by instanceId, ID contains instanceId | `v10.instance-isolation.test.ts` |
| **Answer Isolation** | Answer on A doesn't change B's facts/chips | `v10.instance-isolation.test.ts` |
| **Negation Isolation** | Surfaces/negations scoped per instance | `v10.instance-isolation.test.ts` |

**Answer Key Format**: `${instanceId}::${factKey}` (prevents cross-contamination)

## Askback Registry Contract

**SSOT**: `src/docudent/medical_kb/medical_kb.v1.v10.json` (`rules[].effects` + `askbacks[]`)
**Adapter**: `src/docudent/v10/medical/medicalAskbackAdapter.ts`

| Rule | Description |
|------|-------------|
| **Askbacks emitted by rules** | Medical KB rules emit askback IDs via `require_askback` effects |
| **Definitions in KB** | Askback text/options come from `medical_kb.v1.v10.json` askbacks[] |
| **Normalization** | Askback IDs may include prefixes and `::tooth:XX`; adapter normalizes to `questionKey` |
| **No silent fallbacks** | If askback definition is missing, UI falls back to a generic text question (treat as a contract violation) |
