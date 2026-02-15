# V10 Release Checklist (Deterministic Multi-Treatment)

Last update: 2026-02-15
Owner: Engineering + QA

## 1) Architecture Gates

- [ ] `npm test -- --run src/docudent/v10/__tests__/gates`
- [ ] `npm test -- --run src/docudent/__tests__/gates/gate-v10-bundle-instance-provenance.test.ts`
- [ ] `npm test -- --run src/docudent/__tests__/gates/gate-v10-bundle-output-hash.test.ts`
- [ ] `npm test -- --run src/docudent/__tests__/gates/gate-v10-single-intent-direct-run.test.ts`

Pass criteria:
- No billing code without instance provenance.
- Output hash is emitted for bundle outputs.
- Single-intent flow bypasses bundle orchestration.

## 2) Determinism + Pinning

- [ ] `npm test -- --run src/docudent/v10/__tests__/bundle/runV10Bundle.kb-pinning.test.ts`
- [ ] `npm test -- --run src/docudent/v10/__tests__/bundle/runV10Bundle.output-hash.test.ts`

Pass criteria:
- Session pinning: same `kbReleaseId` across segment calls.
- Replay determinism: same input => same `outputHash`.

## 3) UI Traceability

- [ ] `npm test -- --run src/docudent/v10/__tests__/components/QuestionsFlowV2.lanes.test.tsx`
- [ ] `npm test -- --run src/docudent/v10/__tests__/components/MultiOutputRenderer.provenance.test.tsx`

Pass criteria:
- Askbacks can be filtered by treatment lane.
- Output shows `kbReleaseId`, output hash, and code->instance trace.

## 4) Realistic Browser Flow

- [ ] `npx playwright test e2e/v10-realistic-praxis-test.e2e.spec.ts --project=chromium`

Pass criteria:
- 10/10 scenarios pass.
- Each scenario produces output text and billing signals consistent with insurance mode.

## 5) Consolidated Audit (Release Gate)

- [ ] `npm run v10:audit:consolidated`

Pass criteria:
- Combined gate/unit/component/e2e audit passes.
- Audit report saved under `docs/system-atlas/artifacts/_latest/v10-consolidated-audit/`.

## 6) Manual Online Spot Check

- [ ] Hosted V10 loads and can complete one Füllung + one Endo scenario.
- [ ] Output page shows billing tags and provenance labels.
- [ ] No silent fallback to legacy surfaces.

Pass criteria:
- No blocker found in hosted spot-check.

