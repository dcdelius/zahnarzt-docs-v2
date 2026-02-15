# Gate Suite Summary — Fuellung + Combinability

## Current Gates (58 tests, 10 files)

| Gate | File | Tests | Purpose |
|------|------|-------|---------|
| No Hardcoded Billing | `gate-no-hardcoded-billing.test.ts` | 2 | No GOZ_/BEMA_ in runtime |
| Billing Channelization | `gate-billing-channelization.test.ts` | 8 | GKV→BEMA, PKV→GOZ |
| MKV Base No GOZ | `gate-mkv-base-no-goz.test.ts` | 3 | LA/Kofferdam stays BEMA |
| GOZ Addon Confirm | `gate-goz-addon-requires-confirmation.test.ts` | 4 | GOZ only when MKV confirmed |
| KB Schema BillingRef | `gate-kb-schema-billingref-policy.test.ts` | 6 | Chips have billingRefs |
| Combinability Auto-Resolve | `gate-combinability-auto-resolve.test.ts` | 7 | 2197 dropped, not blocked |
| Combinability Final Billing | `gate-combinability-final-billing.test.ts` | 4 | droppedCodes filtered |
| Truthcases Top-15 | `gate-truthcases-top15.test.ts` | 15 | Clinical scenarios |
| KB Schema Combinability | `gate-kb-schema-combinability.test.ts` | 6 | Valid matchers, sourceRefs |
| Determinism | `gate-determinism.test.ts` | 3 | 10x run identical |

## What Each Gate Prevents

| Gate | Prevents |
|------|----------|
| No Hardcoded Billing | Runtime code generating billing codes directly |
| Billing Channelization | PKV patient getting BEMA codes |
| MKV Base No GOZ | LA chip emitting GOZ_0090 in MKV |
| GOZ Addon Confirm | Unconfirmed MKV getting GOZ addons |
| KB Schema BillingRef | Chip without billingRef → no code |
| Combinability Auto-Resolve | GOZ_2197 causing error instead of drop |
| Combinability Final Billing | Dropped codes appearing in output |
| Truthcases | Regression in clinical scenarios |
| KB Schema Combinability | Invalid rule matchers |
| Determinism | Non-deterministic billing |

## CI Integration

```bash
# Full gate run
npm test -- --run src/docudent/v10/__tests__/gates

# Current: 10 files, 58 tests, ALL PASS
```

## Next Gates (TODO)

| Gate | Purpose |
|------|---------|
| `gate-fuellung-truthcases-30.test.ts` | 30 clinical cases |
| `gate-explain-report.test.ts` | Explain report structure |
| `gate-askback-minimal.test.ts` | Max 1-2 askbacks per case |
| `gate-text-no-warning.test.ts` | fullText contains no debug |
