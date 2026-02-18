# Iterative Clinical Test Loop (Hosted UI)

## Goal
Harden V10 by repeating realistic hosted dictation runs, reviewing askbacks/output/billing medically and KZV-forensically, then fixing root causes only.

## Scope
- Environment: `https://zahnarzt-app.web.app` (real auth, real LLM, real Firestore)
- Test focus: Askback quality, output plausibility, billing correctness, provenance consistency
- Rule: no one-off patching per dictation; each fix must generalize and be guarded by tests

## Loop (Rinse & Repeat)
1. Run scenario pack in hosted UI (`20+` dictations mixed GKV/GKV+MKV/PKV, single + multi-treatment).
2. Capture per-case evidence:
   - dictation
   - askbacks shown
   - final output excerpt
   - billing codes
   - runtime meta (`preanalysis`, `extraction`, fallback flags)
3. Classify findings by root category:
   - medical logic
   - KZV/forensic documentation
   - billing mapping
   - askback UX/wording
   - orchestration/determinism
4. Fix root causes in SSOT layers first:
   - `medical_kb.v1.v10.json`
   - procedure event bundles
   - facts normalization
   - pipeline merge/dedupe policy
5. Add/adjust tests for each root fix:
   - unit + gate + hosted E2E slice
6. Re-deploy hosted build and re-run impacted scenarios.

## Quality Rubric per Case
- **Medical plausibility:** clinical sequence and details are coherent.
- **KZV/forensic completeness:** mandatory evidence and disclosures are present when required.
- **Billing coherence:** insurance path and codes match documented treatment.
- **Askback quality:** only necessary questions, understandable wording, no duplicates.
- **Determinism:** same input path gives same structural outcome (no random drift).

## Current next architecture item (not pilot, central)
- Build a central **Clinical Obligations Engine** for cross-treatment gold standards:
  - `when X documented -> require evidence Y`
  - answers: `done | not_done | deferred_next_visit`
  - deterministic askback emission + trace + gates
- Tracked in `known-gaps.md` as **GAP-33**.

## Execution policy
- Always prioritize hosted regression evidence over assumptions.
- Always log findings in Atlas before implementing fixes.
- Always ship with regression gates so the same issue cannot silently return.
