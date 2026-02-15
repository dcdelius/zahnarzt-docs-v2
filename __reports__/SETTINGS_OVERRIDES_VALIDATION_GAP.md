# Settings Overrides Validation Gap Analysis

## Summary

This report documents the separation of concerns between Firestore Security Rules and the Settings Validator.

## What Firestore Rules Enforce ✅

The rules at `/orgs/{orgId}/settingsOverrides/{overrideId}` enforce:

| Check | Rule Location | Description |
|-------|---------------|-------------|
| **Read RBAC** | L102 | `isMemberOfOrg(orgId)` - Org members can read |
| **Write RBAC by Scope** | L103-127 | Scope-based write permissions |
| **Org scope** | L111 | `org_admin` required for `scope='org'` |
| **Practice scope** | L114 | `practice_admin` or `org_admin` required |
| **Room scope** | L117-119 | `practiceId` required + `practice_admin` |
| **Provider scope** | L122-125 | `practiceId` required + own-provider check OR admin |
| **Delete** | L104 | `org_admin` only |

## What Firestore Rules Do NOT Enforce ❌

| Check | Why Not | Solution |
|-------|---------|----------|
| **Allowed paths** | Rules can't enumerate all valid paths | Client validator (`contracts/settingsValidator`) |
| **Allowed values** | Rules can't check enum values | Client validator |
| **Value types** | Complex type checking in CEL is fragile | Client validator |
| **Non-empty overrides** | Optional check deferred | Client validator |

## Validation Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT                                  │
│                                                                 │
│  1. User edits setting                                          │
│  2. contracts/settingsValidator.validateOverrides()             │
│  3. If !ok: show error, block write                             │
│  4. core/settings/settingsOverridesService.writeSettingsOverride│
│                                                                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FIRESTORE RULES                            │
│                                                                 │
│  - Checks RBAC (scope + practiceId)                             │
│  - Does NOT check path/value validity                           │
│                                                                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   CLOUD FUNCTION (OPTIONAL)                     │
│                                                                 │
│  - Re-validates using same validator                            │
│  - Rejects/rolls back invalid writes                            │
│  - Defense in depth for direct SDK writes                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Security Model

| Layer | Responsibility |
|-------|----------------|
| **Firestore Rules** | RBAC (who can write where) |
| **Client Validator** | Semantics (what values are valid) |
| **Cloud Function** | Defense in depth (re-validate server-side) |

## Gaps Identified

### G1: Direct SDK Writes Bypass Client Validator
**Risk**: LOW (requires authenticated user with correct claims)  
**Mitigation**: Optional Cloud Function trigger for re-validation

### G2: No Field Restriction on Overrides Object
**Risk**: MEDIUM (arbitrary keys in overrides object)  
**Mitigation**: Client validator + optional CF validation

## Recommendations

1. ✅ **IMPLEMENTED**: Client validator in `contracts/settingsValidator.ts`
2. ✅ **IMPLEMENTED**: Service layer in `core/settings/settingsOverridesService.ts`
3. 📋 **OPTIONAL**: Cloud Function `onWrite` trigger for defense in depth
4. 📋 **OPTIONAL**: Periodic audit job to scan for invalid overrides
