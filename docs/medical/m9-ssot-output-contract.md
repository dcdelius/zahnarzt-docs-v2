# M9: SSOT Output Contract

## Core Principles

### No Text Without Chip
All output text MUST come from KB `textSnippets`. No hardcoded strings in rendering code.

### No Chip Without KB
Every chip ID emitted by medical engine MUST exist in treatment `unified.json`.

## Architecture

```
┌──────────────┐    ┌─────────────────┐    ┌──────────────┐
│ Medical KB   │───▶│ renderFromKb... │───▶│ Output       │
│ (engine)     │    │ (SSOT renderer) │    │ fullText +   │
│ emits chips  │    │ textSnippets +  │    │ billingCodes │
└──────────────┘    │ billingRef      │    └──────────────┘
                    └─────────────────┘
```

## Text-Only Chips
Chips with `billingRef: null` are TEXT_ONLY:
- They produce output text
- They do NOT produce billing codes
- Example: `cp_not_required` — documents capping not needed

## Variable Substitution
Chips can use `{varName}` placeholders:
- `{material}` → filled from context or defaults
- Unknown vars → `[varName]` placeholder

## Adding New Medical Features

1. **Add Rule** in `medical_kb.v1.json`
   - Define conditions + `emit_chip` action
   - Include `sourceRefs`

2. **Add Chip** in `unified.json`
   - Define `textSnippets` (kurz/mittel/lang)
   - Define `billingRef` (GKV/PKV) or null for TEXT_ONLY

3. **Add Gate Test**
   - Verify chip renders correctly
   - Verify billing codes match

4. **Run Gates**
   ```bash
   npm test -- --run gate-m9
   ```

## Gate Tests
| Gate | Purpose |
|------|---------|
| `gate-m9-no-text-without-chip` | All output from KB chips |
| `gate-m9-no-chip-without-kb-definition` | All chips exist in KB |
| `gate-m9-no-fragmented-chip-definitions` | No shadow text/billing registries |
