# Case Service V1 — Flow Documentation

## Overview

The Case Service handles the complete lifecycle of dental documentation cases in Firestore.

## Case Lifecycle

```
┌─────────────┐
│   CREATE    │ → Must have status='draft'
│   (draft)   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   UPDATE    │ → Allowed while status='draft'
│   (draft)   │   Can update: input, extracted, answers, output
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  FINALIZE   │ → Sets status='finalized' + finalizedAt
│ (finalized) │   Stores reproducibility hash
└──────┬──────┘
       │
       │ ❌ NO UPDATES ALLOWED (immutable)
       │
       ▼
┌─────────────┐
│   AMEND?    │ → Only status→'amended' + reason allowed
│  (amended)  │   Create NEW case with amendedFromCaseId
└─────────────┘
```

## API

```typescript
import { createCaseService } from 'core/case/caseService';

const caseService = createCaseService(firestore);

// 1. Create draft
const caseId = await caseService.createDraftCase({
    orgId: 'org_123',
    practiceId: 'prac_456',
    providerId: 'prov_789',
    patientRef: 'patient_hash_abc', // NO PII!
    treatmentId: 'fuellung',
    createdBy: uid,
});

// 2. Update draft
await caseService.updateDraftCase(orgId, practiceId, caseId, {
    input: { rawDictation: '36 mod profunda', ... },
    extracted: { version: 'v6', payload: {...} },
    answers: { vitality: 'positive', ... },
});

// 3. Finalize
await caseService.finalizeCase(orgId, practiceId, caseId, {
    playbookVersionId: 'v2.3.1',
    extractionVersion: 'v6',
    resolvedSettings: { ... },
    auditModeEnabled: true, // Optional: store full snapshot
});

// 4. (Optional) Mark as amended
await caseService.markAsAmended(orgId, practiceId, caseId, 'Patient correction');
// Then create new case with amendedFromCaseId
```

## Reproducibility Fields

Every finalized case stores:

| Field | Purpose |
|-------|---------|
| `playbookVersionId` | Git tag/commit of rules |
| `extractionVersion` | `'v6'` or `'v7'` |
| `resolvedSettingsHash` | SHA-256 of resolved settings |
| `_resolvedSettingsSnapshot` | Full settings (if auditModeEnabled) |

## Security Rules Enforcement

- **Create**: Must have `status='draft'`
- **Update (draft)**: Allowed for provider/assistant
- **Finalize**: Must set `finalizedAt`
- **Finalized**: **IMMUTABLE** (all updates denied)
- **Amend**: Only `status`, `updatedAt`, `amendmentReason` allowed
