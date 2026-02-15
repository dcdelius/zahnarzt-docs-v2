# V10 Medical Scenario Run v2 - Summary

**Run ID:** 2026-02-15T08:23:28.263Z
**Total:** 10 | **Pass:** 9 | **Fail:** 1

## Results

| Case | Insurance | Phase | BillingCodes | Askbacks | Combinability | Status |
|------|-----------|-------|--------------|----------|---------------|--------|
| m01 | GKV | questions | - | mkv_confirmed | ok | ✅ |
| m02 | GKV | questions | - | layering, mkv_confirmed | ok | ✅ |
| m03 | GKV | questions | - | mkv_confirmed, ueberkappung | ok | ✅ |
| m04 | PKV | questions | - | layering | ok | ✅ |
| m05 | MKV | questions | - | layering, mkv_justification, mkv_betrag | ok | ✅ |
| m06 | MKV | questions | - | layering | ok | ✅ |
| m07 | GKV | questions | - | isolation, mkv_confirmed | ok | ✅ |
| m08 | GKV | questions | - | layering, layering, mkv_confirmed, mkv_confirmed | ok | ❌ |
| m09 | GKV | questions | - | material | ok | ✅ |
| m10 | GKV | questions | - | layering, mkv_confirmed | ok | ✅ |

## Top Findings

- LA codes missing in 5 case(s): m01, m02, m04, m07, m10
- Surface codes mismatched in 3 case(s): m02, m08, m10
- 1 case(s) failed assertions: m08

## Medical Aspect Coverage

| Case | Aspect | Expected | Actual | Match |
|------|--------|----------|--------|-------|
| m01 | Kofferdam | BEMA_12 | - | ⚠️ |
| m01 | LA Infiltration | BEMA_40 | - | ⚠️ |
| m02 | Kofferdam | BEMA_12 | - | ⚠️ |
| m02 | LA Leitung | BEMA_41 | - | ⚠️ |
| m02 | Surfaces 3fl (mod) | BEMA_13c | - | ⚠️ |
| m03 | Kofferdam | BEMA_12 | - | ⚠️ |
| m04 | Kofferdam | GOZ_2040 | - | ⚠️ |
| m04 | LA Infiltration | GOZ_0090 | - | ⚠️ |
| m05 | Kofferdam | BEMA_12 | - | ⚠️ |
| m06 | Kofferdam | BEMA_12 | - | ⚠️ |
| m07 | LA Infiltration | BEMA_40 | - | ⚠️ |
| m08 | Kofferdam | BEMA_12 | - | ⚠️ |
| m08 | Surfaces 2fl (od) | BEMA_13b | - | ⚠️ |
| m09 | Kofferdam | BEMA_12 | - | ⚠️ |
| m10 | Kofferdam | BEMA_12 | - | ⚠️ |
| m10 | LA Leitung | BEMA_41 | - | ⚠️ |
| m10 | Surfaces 4fl (modb) | BEMA_13d | - | ⚠️ |