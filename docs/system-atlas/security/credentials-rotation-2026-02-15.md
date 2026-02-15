# Firebase Service Account Rotation (Local Dev)

**Date:** 2026-02-15  
**Scope:** Local development credentials for Firestore admin access.

## What changed
- Removed old service-account JSON files from the repo root.
- Switched local admin path to the new file:
  - `zahnarzt-app-d7f1a50f6e20.json`
- Updated local `.env` to point to the new file via:
  - `FIREBASE_SERVICE_ACCOUNT`
  - `GOOGLE_APPLICATION_CREDENTIALS`

## Rules
- Service-account JSON files must remain **gitignored**.
- Never copy/paste private keys into the repo or Atlas docs.

## Follow-up (recommended)
- Rotate any previously exposed keys immediately.
- Verify online reachability with `npm run doctor:online -- --verbose`.
