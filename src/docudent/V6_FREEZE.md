# V6 Freeze Contract

**Status**: FROZEN (2024-12-30)
**Owner**: Architecture Team

## Overview

V6 runtime code is FROZEN. No new mutations allowed.

## Rules

1. **No new code** may be added to `src/docudent/v6/` directory
2. **No modifications** to existing V6 files except critical security fixes
3. **Facades only** may exist in `core/services/` to maintain API compatibility
4. **Migration path**: Use V10 pipeline for all new features

## Facade Contract

Files in `core/services/` are facades that MUST:
- Only re-export from the actual implementation
- NOT contain new logic
- NOT mutate V6 state

## Enforcement

- `gate-no-v6-mutation.test.ts` enforces this contract
- Build fails if V6 files are modified
- V7 is compatibility shim, V10 is production path

## Migration Status

- V6 services: DEPRECATED, facades only
- V7 UI: DEPRECATED, migration to V10 in progress
- V10: Active development target
