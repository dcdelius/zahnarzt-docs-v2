# Combinability Truthcases

**Version**: v1  
**Count**: 25

---

## Overview

Combinability truthcases validate the combinability checker against known billing code combinations. Each case defines:

- **codes**: Billing codes to check
- **insuranceType**: GKV, PKV, or MKV
- **scope**: session, tooth, or multi-tooth
- **expectedVerdict**: pass, warn, or block

---

## Case Distribution

| Verdict | Count | Purpose |
|---------|-------|---------|
| PASS | 10 | Valid combinations |
| WARN | 4 | Unusual but allowed |
| BLOCK | 8 | Mutual exclusions |
| Multi-tooth | 3 | Per-tooth scope |

---

## BLOCK Cases (Critical)

| ID | Codes | Reason |
|----|-------|--------|
| block_001 | GOZ_2197 + GOZ_2060 | GOZ mutual exclusion |
| block_002 | GOZ_2060 + GOZ_2080 (same tooth) | Same-tooth exclusion |
| block_003 | BEMA_13a + BEMA_13b | BEMA mutual exclusion |
| block_004 | GOZ_2197 + GOZ_2060 + GOZ_2080 | Triple conflict |
| block_005 | BEMA_01 + BEMA_04 | Session exclusion |
| block_006 | GOZ_4000 + GOZ_4005 | Quadrant exclusion |
| block_007 | GOZ_2197 + BEMA_25 (MKV) | MKV exclusion |

---

## Sources & Rationale

All rules derived from:
- BEMA/GOZ fee schedules
- KZBV guidelines
- Clinical practice standards

---

## Gate

```bash
npx vitest run src/docudent/__tests__/gates/gate-m27-combinability-truthcases.test.ts
```

Validates:
- At least 25 cases exist
- All cases have required fields
- Multi-tooth cases have teeth arrays
- Unique IDs

---

## References

- [combinabilityTruthcases.v1.ts](src/docudent/v10/qa/combinabilityTruthcases.v1.ts)
- [combinability_kb.v1.json](src/docudent/v10/kb/combinability/combinability_kb.v1.json)
