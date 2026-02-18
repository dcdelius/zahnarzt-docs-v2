# V10 Preanalysis Readiness Runbook

Date: 2026-02-18  
Scope: Verify that hosted LLM preanalysis (`detectTreatmentIntentsV1`) is operational with valid auth before full E2E audit.

## 1) Quick Diagnostics (no strict fail)

```bash
npm run v10:auth-diagnostics
npm run v10:callable-diagnostics
npm run v10:preanalysis-readiness
```

Artifacts:
- `docs/system-atlas/artifacts/_latest/v10-preanalysis-readiness/report.json`
- `docs/system-atlas/artifacts/_latest/v10-preanalysis-readiness/summary.md`

## 2) Strict Readiness (must pass for hosted gate)

```bash
npm run v10:preanalysis-readiness:strict
```

Expected PASS conditions:
- Password auth works for `E2E_LOGIN_EMAIL` / `E2E_LOGIN_PASSWORD`
- Both callables return non-empty content:
  - `extractFromDictationV1`
  - `detectTreatmentIntentsV1`

## 3) Hosted Strict Gate (full browser path)

Required env:
- `PLAYWRIGHT_BASE_URL=https://...` (hosted, not localhost)
- `E2E_LOGIN_EMAIL=...`
- `E2E_LOGIN_PASSWORD=...`

Lookup order for these vars:
1. current shell env
2. `.env.e2e.local`
3. `.env.local`
4. `.env`

Run:

```bash
npm run e2e:v10:hosted-preanalysis-gate
```

One-shot (strict readiness + hosted gate):

```bash
npm run v10:preanalysis-readiness:full
```

Behavior:
- Executes auth preflight (Identity Toolkit password sign-in)
- Executes callable preflight (both LLM gateways)
- Runs hosted Playwright audit with strict preanalysis LLM requirement

## 4) Consolidated Audit Integration

Optional flags for `scripts/v10/consolidated-audit.ts`:
- `DOCUDENT_AUDIT_INCLUDE_PREANALYSIS_READINESS=1`
- `DOCUDENT_AUDIT_INCLUDE_HOSTED_PREANALYSIS=1`

Example:

```bash
DOCUDENT_AUDIT_INCLUDE_PREANALYSIS_READINESS=1 \
DOCUDENT_AUDIT_INCLUDE_HOSTED_PREANALYSIS=1 \
PLAYWRIGHT_BASE_URL=https://... \
E2E_LOGIN_EMAIL=... \
E2E_LOGIN_PASSWORD=... \
node --import tsx scripts/v10/consolidated-audit.ts
```
