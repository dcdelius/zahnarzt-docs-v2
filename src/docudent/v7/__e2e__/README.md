# V7 E2E Test Suite

> **Run `npm run test:v7:merge` before shipping. If it fails, the app is broken.**

## Quick Start

```bash
# Fast unit tests (~4s)
npm run test:v7:unit

# Full browser E2E (all tests)
npm run test:v7:e2e

# Real-case clinical tests (20 fixtures)
npm run test:v7:realcases

# MERGE GATE (unit + realcases)
npm run test:v7:merge
```

## Test Coverage

### Unit Tests (`test:v7:unit`)
- Pipeline wiring
- Output coverage gates
- No-patient-fields gate
- Component unit tests

### E2E Tests (`test:v7:e2e`)
- Füllung/Endo flow smoke tests
- Step gating
- Edit roundtrip
- No mock strings gate
- Visual smoke

### Real Cases (`test:v7:realcases`)
| Category | Count | Fixture IDs |
|----------|-------|-------------|
| Füllung  | 10    | F01-F10    |
| Endo     | 10    | E01-E10    |

Each fixture includes:
- Realistic German clinical dictation
- Expected tooth number
- Must-contain/must-not-contain terms
- Billing expectations (optional)
- Required questions (optional)

## Truth Rules (Fail Conditions)

| Rule | Severity | Description |
|------|----------|-------------|
| CROSS_TREATMENT_LEAKAGE | Hard | Füllung has endo terms or vice versa |
| TOOTH_PRESENCE | Hard | Extracted tooth missing from output |
| FORBIDDEN_MOCK_STRINGS | Hard | Demo data in output |
| MUST_CONTAIN | Hard | Fixture-defined terms missing |
| MUST_NOT_CONTAIN | Hard | Fixture-forbidden terms present |
| BILLING_PLAUSIBILITY | Soft | Empty billing without reason |
| QUESTION_NECESSITY | Soft | Missing critical questions |

## Artifacts on Failure

```
test-results/
├── *.png          # Screenshots
├── *.webm         # Videos
├── *.zip          # Traces
└── audit-report.md # (if generated)
```

### View Traces

```bash
npx playwright show-trace test-results/*.zip
```

## Data-testid Selectors

| Selector | Component |
|----------|-----------|
| `treatment-selector` | TreatmentSelector trigger |
| `treatment-option-{id}` | Treatment menu options |
| `dictation-input` | Dictation textarea |
| `send-button` | Analyze button |
| `questions-panel` | Questions container |
| `question-row-{id}` | Individual question |
| `complete-button` | Fertigstellen button |
| `output-paper` | Output container |
| `edit-button` | Edit button |
| `reset-button` | Reset button |

## Common Failure Patterns

### 1. Cross-Treatment Leakage
```
[CROSS_TREATMENT_LEAKAGE] Füllung output contains endo-only terms: Trepanation
```
**Fix**: Check treatmentId in pipeline, verify output composer routing

### 2. Missing Tooth
```
[TOOTH_PRESENCE] Output missing expected tooth number: 36
```
**Fix**: Check tooth extraction, verify extracted.tooth passed to output

### 3. Mock String Detected
```
[FORBIDDEN_MOCK_STRINGS] Output contains: Mustermann
```
**Fix**: Remove hardcoded demo data from components

### 4. Billing Empty
```
[BILLING_PLAUSIBILITY] Billing is empty with no reason provided
```
**Fix**: Set billingReason when codes empty, or fix eligibility logic

## CI Integration

```yaml
# GitHub Actions
- name: V7 Unit Tests
  run: npm run test:v7:unit

- name: V7 Real Cases (browser)
  run: npx playwright install chromium && npm run test:v7:realcases
```

## Local Development

```bash
# Interactive mode
npx playwright test -c src/docudent/v7/__e2e__/playwright.config.ts --ui

# Headed (see browser)
npm run test:v7:realcases -- --headed

# Debug mode
PWDEBUG=1 npm run test:v7:realcases
```
