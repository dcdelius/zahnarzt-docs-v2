# KB Releases: Versioning + Distribution Plan (Long-Term)

**Captured:** 2026-01-30  
**Status:** Draft (decision record + rollout plan)

## Goal

Long-term SSOT strategy for all billing-relevant knowledge:
- medical concepts + askbacks + defaults (medical_kb)
- treatment chips (unified.json per treatment)
- combinability KB + catalogs

Constraints:
- no hardcoded billing strings in runtime
- reproducible outputs (pin version + hash per case/session)
- safe updates (no silent behavior changes)

## Current Reality (Repo Audit)

- Firestore is the primary app data store today (org/practice/memberships/invites/users, plus optional settings).
- Medical KB is loaded from a versioned JSON artifact in the repo:
  - `src/docudent/medical_kb/medical_kb.v1.json` (provider: `src/docudent/v10/kb/medical/providers/jsonProvider.ts`)
- Treatment KB (chips + billingRef fields) is loaded from versioned JSON artifacts in the repo:
  - `src/docudent/core/billing/knowledgeBase/treatments/*/unified.json`
  - provider layer exists + can optionally load from Firestore (feature flag):
    - `src/docudent/v10/kb/treatment/providers/jsonProvider.ts`
    - `src/docudent/v10/kb/treatment/providers/firestoreProvider.ts` (flag: `VITE_KB_FIRESTORE`)
- Practice/User settings can be stored in Firestore (flag: `VITE_SETTINGS_FIRESTORE`):
  - `src/docudent/v10/settings/useSettings.ts`

## Decision

The long-term SSOT for billing KB must be **immutable, versioned releases**.

Firestore should **not** be the place where KB is edited "live".
If Firestore is used for KB at all, it is only as a **read-only mirror** of a pinned release.

SSOT principles:
- Releases are append-only: create a new release; never mutate an existing one.
- Runtime always runs against a pinned release identifier (version) and verifies hashes.
- Cases store KB provenance (version + hash) at finalize time.

## Target Architecture

### 1) KB Release Artifact

A "KB release" is a bundle with a stable ID (e.g. `2026-02-01` or `kb_2026_02_01`):
- medical KB (concepts + askbacks + defaults)
- per-treatment unified KBs
- combinability KB
- catalogs (BEMA/GOZ/...)
- manifest with hashes for every artifact

The manifest is the contract:
- `releaseId`
- `createdAt`
- per-artifact `{ path, version, hash }`

### 2) Provider Chain (Runtime)

Providers must be swappable, but behavior must remain deterministic:
1. forced provider (repro bundle injection for QA)
2. remote provider (backend/CDN) for the pinned releaseId
3. local fallback (repo-bundled JSON) for dev/offline safety

Implementation note:
- today only Treatment KB has a Firestore provider; medical/combinability are JSON-only.
- long-term: align all KB types behind the same releaseId + meta interface.

### 3) Pinning + Provenance

Required fields:
- Practice setting: `activeKbReleaseId` (what the practice runs by default)
- Case finalization: store `kbMeta` (versions + hashes) inside the case doc (or an immutable subdoc)
- Repro bundle export: include `kbMeta` (already supported by `src/docudent/v10/debug/reproBundle.ts`)

## Firestore Role (Long-Term)

Firestore remains the right store for:
- org/practice/user data
- practice/user settings (including `activeKbReleaseId`)
- session metadata, case docs, audit trails

Firestore is acceptable as a KB mirror only if:
- data is seeded from a release artifact
- writes are locked down (rules/admin-only)
- release docs are immutable (no updates, only new versions)

## Rollout Plan (Minimal Disruption)

### Phase 0: Version Pinning in Settings (UI + Storage)
- Add `PracticeSettings.activeKbReleaseId`
- UI in Settings: choose release (manual string for now)
- Default to "bundled" release when unset

### Phase 1: Persist KB Meta in Cases
- At finalize time, store:
  - medical KB version/hash
  - treatment KB version/hash (per treatmentId used)
  - combinability KB version/hash
- Enforce via a gate test: "finalized cases include kb meta"

### Phase 2: Remote Distribution (Preferred)
- Implement an HTTP provider (CDN/backend) that serves a pinned `releaseId` + manifest
- Cache aggressively (in-memory + browser cache); verify hashes from manifest

### Phase 3: Optional Firestore Mirror (Bridge)
- Seed `kb_releases/{releaseId}` + `kb_releases/{releaseId}/treatments/{treatmentId}`
- Only for "no-backend-yet" deployments
- Keep it mirror-only; SSOT remains the release build pipeline

### Phase 4: Admin UX + Auditability
- Show activeKbReleaseId in UI (header/debug)
- Provide "Update to latest" action that explicitly bumps releaseId
- Record who changed it and when

## Open Questions

- What is the canonical releaseId format (date-based vs semantic)?
- Where does the release artifact live (repo, CDN, backend DB)?
- Do we allow different releases per practice vs per org?
- Should cases store full KB snapshot in audit mode (expensive) vs only version+hash (recommended)?

