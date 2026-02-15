# V10 Procedure Layer

This folder implements the V10 architecture stage:

Facts → Contract Context → Procedure Graph + Capabilities → Chips → BillingDB

## Contract Rules (No Hidden Paths)
- Only Procedure Nodes may emit chips (except explicit manual overrides).
- Askbacks/Questions only set Facts, never chips.
- Renderer/Composer must never read Settings directly (Facts/Chips only).
- No hardcoded billing codes in code; chips resolve via BillingDB.
- Legacy side paths must be removed or moved to `/legacy` (no silent fallback).

## Current Status
- Procedure matching is wired into `src/docudent/v10/pipeline/runV10.ts` and is SSOT for V10 chip emission.
- `medical_kb` is still used for *askback requirements* (and other medical validations), but chip emission is disabled in V10 (`allowChipEmission: false`).
- Event bundle meta (`core/billing/knowledgeBase/event_bundles/*`) is the SSOT bridge for:
  - chip IDs (text refs),
  - billing ref IDs (BillingDB keys),
  - disclosure template IDs.
- Gates exist to prevent hidden chip activation paths (question bank `chipActivation`, askback `chipEffect`, answer_map `alwaysOn`), and to trace missing chip emitters.
