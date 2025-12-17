# Firebase Emulator Tests

## Setup

```bash
# Install dependencies (one-time)
npm install --save-dev @firebase/rules-unit-testing firebase-admin

# Start emulator and run tests
firebase emulators:exec --only firestore "npx vitest run tests/firebase/firestore.rules.test.ts"

# Or run emulator in background and tests separately:
firebase emulators:start --only firestore
# In another terminal:
npx vitest run tests/firebase/firestore.rules.test.ts
```

## Test Coverage

| Suite | Tests |
|-------|-------|
| A) Orgs | 5 tests |
| B) Practices | 4 tests |
| C) SettingsOverrides | 8 tests |
| D) Cases Immutability | 11 tests |
| E) patients_private | 5 tests |
| **Total** | **33 tests** |

## Key Tests

### Case Immutability
- `create` must have `status='draft'`
- `draft→finalized` requires `finalizedAt`
- `finalized` docs reject all field updates
- `finalized→amended` only allows `status+updatedAt+amendmentReason`

### SettingsOverrides
- `org_admin` can write `scope='org'`
- `practice_admin` can write `scope='practice'`
- `provider` can write `scope='provider'` ONLY for own `providerId`
