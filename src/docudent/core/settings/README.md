# Settings Overrides Architecture

## Overview

Settings overrides allow customization of treatment defaults at multiple scopes:
- **Org**: Organization-wide defaults
- **Practice**: Practice-specific overrides
- **Room**: Treatment room overrides
- **Provider**: Personal provider preferences

## Storage

Firestore: `/orgs/{orgId}/settingsOverrides/{overrideId}`

| Field | Type | Description |
|-------|------|-------------|
| id | string | Deterministic ID based on scope |
| orgId | string | Parent org |
| scope | enum | 'org' \| 'practice' \| 'room' \| 'provider' |
| scopeId | string? | practiceId/roomId/providerId |
| practiceId | string? | Required for room/provider scopes |
| overrides | object | Sparse key-value pairs |
| updatedAt | timestamp | |
| updatedBy | string | UID |

## Validation Architecture

**Separation of Concerns:**

| Layer | Enforces |
|-------|----------|
| **Firestore Rules** | RBAC (who can write where) |
| **Client Validator** | Semantics (valid paths/values) |

### Client Validation

```typescript
import { validateOverrides } from 'contracts/settingsValidator';

const result = validateOverrides(overrides);
if (!result.ok) {
    // Show validation errors
    console.error(result.issues);
    return;
}

// Safe to write
await settingsOverridesService.writeSettingsOverride({...});
```

### Firestore Rules (RBAC Only)

Rules enforce:
- Org members can read all overrides
- `org_admin` required for `scope='org'`
- `practice_admin` required for practice/room scopes
- Providers can write their own provider-scope settings
- `practiceId` required in doc for room/provider scopes

Rules do NOT validate:
- Allowed settings paths
- Allowed values for each path
- Value types

## SSOT Sources

| Source | Content |
|--------|---------|
| `contracts/settingsTypes.ts` | Type definitions |
| `contracts/settingsUiRegistry.ts` | Allowed paths + values + labels |
| `contracts/settingsValidator.ts` | Validation logic |
| `core/settings/settingsOverridesService.ts` | Firestore write service |
