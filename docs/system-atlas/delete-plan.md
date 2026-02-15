# Delete Plan

Safe deletion rules, buckets, and exit criteria.

## Sprint Rules

1. **No delete without gates green**
   - `npx vitest run` — 0 failing files
   - `gate-no-runtime-imports-from-v6` — PASS
   - `gate-m82-billingref-closure` — PASS
   - UI/CLI parity — diff=0

2. **Max 200 files per PR**
   - Review overhead scales with file count
   - Smaller PRs = faster rollback

3. **Order of operations**
   - First: Move out (docs/html) — no code changes
   - Then: Delete legacy v6 — after gate confirms no imports
   - Last: Orphaned files — after atlas confirms 0 consumers

## Buckets

### Bucket 1: HTML Reference Docs (690 files)

**Files**: `src/docudent/{BEMA,GOZ,BEL,Analogleistungen}/*.html`

**Action**: Move to `docs/reference/html/`

**Exit Criteria**:
- [ ] `npm run build` PASS
- [ ] `npx vitest run` PASS
- [ ] No runtime regressions

**Risk**: LOW — HTML not imported at runtime

---

### Bucket 2: Legacy V6 (256 files)

**Files**: `src/docudent/v6/**`

**Prerequisite**: `gate-no-runtime-imports-from-v6` PASS (✓ already passing)

**Action**: Delete

**Exit Criteria**:
- [ ] Gate still PASS after delete
- [ ] `npm run build` PASS
- [ ] Repro R1 + R2 still work

**Risk**: MEDIUM — some v6 may be test-only imports

---

### Bucket 3: Orphaned Files (945 dead_code)

**Source**: [atlas.files.jsonl](./artifacts/m79/atlas.files.jsonl)

**Action**: Review each, delete if:
- 0 importers
- Not in runtime.manifest.json
- Not a type file or barrel

**Exit Criteria**:
- [ ] Manual review log
- [ ] No broken imports

**Risk**: HIGH — may have dynamic imports

---

### Bucket 4: Legacy UI + Speech Helpers (12 files + _legacy folder)

**Files**:
- `src/services/{WebSpeechService.js,GoogleSpeechService.js}`
- `src/components/AudioTranscriber.jsx`
- `src/components/{BausteinSelector.jsx,BausteinVerwaltung.jsx,ChipConfigPanel.jsx,ChipInput.jsx,TemplateBuilder.jsx,PreDictationChecklist.jsx,GenerateReview.jsx,EmailResponder.jsx,DocumentationModal.jsx}`
- `src/_legacy/**` (follow-up after UI route verification)

**Action**:
- Delete unused speech helpers + legacy UI components after confirming no imports
- Optionally move `_legacy` to `docs/legacy/` if you want to preserve snapshot

**Status**:
- ✅ Removed unused speech helpers + legacy UI components (2026-01-26)
- ☐ `_legacy/**` pending separate cleanup

**Exit Criteria**:
- [ ] `npx vitest run` PASS
- [ ] `npm run build` PASS
- [ ] V10 UI smoke test (dictation → questions → output)

**Risk**: LOW–MEDIUM — UI routes may still reference `_legacy`

---

## Rollback Plan

1. **Git revert PR**
2. **Verify gates green**
3. **Deploy previous version**

All deletions must be in dedicated PRs with clear commit messages:
```
chore(cleanup): remove HTML docs from src/ (bucket 1)

- Moved 690 HTML files to docs/reference/html/
- No runtime changes
- Gates: PASS
```

## Checklist Before Delete Sprint

- [ ] All M82 artifacts generated
- [ ] `runtime.manifest.json` exists
- [ ] Gates G1-G4 passing
- [ ] Repro R1 + R2 passing
- [ ] Team notified
