# V10 Release & Rollback Playbook

**Updated:** 2026-02-15

## Release Checklist

1. Run consolidated audit:
   - `npm run v10:audit:consolidated`
2. Build production bundle:
   - `npm run build`
3. Deploy hosting:
   - `firebase deploy --only hosting`
4. Smoke test hosted app:
   - open `https://zahnarzt-app.web.app`
   - verify app boots (`#root` present, no console/page errors)

## Rollback Triggers

Rollback immediately if one of these occurs:

- hosted UI does not boot
- deterministic gates fail on main
- endo procedure BLOCK gates throw unexpectedly in standard flows
- billing completeness regressions appear in production checks

## Rollback Options

### A) Fast hosting rollback (preferred)

1. List hosting releases in Firebase console.
2. Promote previous known-good version.
3. Re-run smoke test.

### B) Git rollback (code-level)

1. Identify last known-good commit on `main`.
2. Revert release commits in reverse order:
   - `git revert <newest_commit>...<oldest_commit>` (or single revert per commit)
3. Push reverted main.
4. Deploy hosting again.

## Post-Rollback Verification

- `npm run v10:audit:consolidated`
- `npm run build`
- smoke test hosted URL
- confirm `docs/system-atlas/artifacts/_latest/v10-consolidated-audit/report.json` is PASS
