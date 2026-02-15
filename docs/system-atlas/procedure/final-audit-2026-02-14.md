# V10 Final Audit (Procedure Migration)

**Date:** 2026-02-14  
**Purpose:** One reproducible “ready for praxis test” verification that exercises the new architecture end‑to‑end (online deps + V10 gates + realistic medical scenarios).

---

## What This Audit Proves

- **No hidden chip activation paths**: chips come from Procedure nodes (or explicit `manualOverride`) only.
- **Askbacks are Facts‑only**: questions never activate chips directly.
- **Text/Billing SSOT**: renderer/composer consume Facts + chip IDs + bundle meta (no Settings reads in composer).
- **Online reachability**: LLM + Firestore can be reached in a real run (with a safe Firestore client fallback if admin credentials are not present).

---

## Commands

**Fast (recommended):**

```bash
npm run v10:final-audit
```

**Full (adds Playwright suites):**

```bash
npm run v10:final-audit:full
```

---

## Preconditions (Local Dev)

- `VITE_OPENAI_API_KEY` is set (LLM extraction).
- Firebase client env is set (`VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_APP_ID`, optional `VITE_FIREBASE_AUTH_DOMAIN`).
- `VITE_KB_FIRESTORE_VERSION` is set (for Firestore KB parity + reachability checks).

Optional (stronger parity in CI/local):
- `FIREBASE_SERVICE_ACCOUNT` or `GOOGLE_APPLICATION_CREDENTIALS` points to a service account JSON (admin read).

## Notes on E2E Determinism

- Playwright suites run with `VITE_E2E_BYPASS_AUTH=1` and `VITE_STUB_EXTRACTION=true` to avoid external LLM dependencies and keep UI E2E deterministic.
- Online dependency coverage (OpenAI + Firestore reachability + KB parity) is proven by `npm run v10:final-audit` (doctor/parity + headless runs), not by Playwright.

---

## Where To Look For Output

- Real dictation check: `docs/system-atlas/artifacts/_latest/v10-real-dictation-check/summary.md`
- Medical scenario run: `docs/system-atlas/artifacts/_latest/v10-medical-scenario-run/summary.md`
- Playwright reports: `test-results/` and `docs/system-atlas/artifacts/_latest/` (depending on suite)
