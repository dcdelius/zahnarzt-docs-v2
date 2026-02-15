# V7 E2E Testing Guide

Quick reference for running Playwright E2E tests for DocuDent V7.

## One-Command Run

```bash
# From repo root - runs both multiinstance specs
npm run e2e:v7

# With Playwright UI (debugging)
npm run e2e:v7:ui
```

## How It Works

The scripts use `playwright.config.ts` which:
- Starts dev server automatically via `webServer` config
- Sets `VITE_STUB_EXTRACTION=true` for deterministic behavior
- Uses port 5173 (dev) or 4173 (preview/CI)

## Specs Covered

| File | Purpose |
|------|---------|
| `v7-multiinstance-2teeth.e2e.spec.ts` | 2-teeth → Panel → Apply → Output |
| `v7-multiinstance-questions-2teeth.e2e.spec.ts` | Same + Questions → Retry → Output |

## Test Fixtures

### Force Questions State (for E2E determinism)

Use the storage helper in tests:

```typescript
import { initStorage } from './helpers/storage';

test.beforeEach(async ({ page }) => {
    await initStorage(page, { forceQuestionsFixture: true, clearPanelHidden: true });
});
```

This sets `localStorage.v7_questions_fixture = 'force_questions'`.

## CI Integration

GitHub Actions workflow: `.github/workflows/e2e-playwright.yml`

**On failure, download artifacts:**
- `playwright-report/` - HTML report with traces
- `test-results/` - Screenshots, videos

**View trace locally:**
```bash
npx playwright show-trace test-results/*/trace.zip
```

## Key Test IDs

- `multiinstance-panel` - Multi-tooth detection panel
- `apply-multiinstance` - Apply button
- `multiinstance-questions-screen` - Per-instance questions UI
- `multi-retry-after-questions` - Retry button
- `multi-output-paper` - Output container
- `multi-copy-button` - Copy button
