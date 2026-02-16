# V10 Settings Store Decision (Canonical Target)

**Date:** 2026-02-15  
**Owner:** Engineering + QA

## Decision

For the active V10 runtime, the canonical settings store remains:

- `Praxen/{practiceId}/Settings/v10`
- `Praxen/{practiceId}/Benutzer/{userId}/Settings/v10`

`orgs/*` settings paths are **not** used for V10 runtime reads/writes in the current release line.

## Why

- Existing V10 hooks, Firestore rules, and emulator tests are aligned on `Praxen/*`.
- A partial move to `orgs/*` without full migration would create dual-write drift and non-deterministic setting resolution.
- Current release priority is correctness + determinism in treatment flow, askbacks, and billing.

## Guardrails

- Gate `gate-v10-settings-store-single-target` prevents accidental `orgs/*` runtime wiring in `useSettings.ts`.
- Rule-path parity and emulator tests must stay green:
  - `gate-firestore-v10-settings-path-parity`
  - `gate-firestore-v10-settings-rules-emulator`

## Migration Prerequisite (future)

Only start migration to `orgs/*` when all are prepared:

1. Full schema mapping (`Praxen/*` -> `orgs/*`) for practice + user settings.
2. Dual-write + read-priority strategy with explicit cutover flag.
3. Replay-safe migration script with rollback path.
4. New emulator suite for `orgs/*` allow/deny parity.
5. Determinism proof that identical inputs still produce identical outputs/hashes across cutover.
