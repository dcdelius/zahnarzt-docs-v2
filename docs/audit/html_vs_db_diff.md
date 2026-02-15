# HTML vs DB Diff Report

Generated: 2025-12-23T21:22:27.726Z

## Executive Summary

| Verdict | **PARTIAL** |
|---------|----------------|
| Reason  | 5 high-severity gaps, 0 mismatches. Review recommended. |

---

## Coverage Summary

| Source | Count |
|--------|-------|
| HTML Extract (total entries) | 359 |
| HTML Extract (with constraints) | 235 |
| DB BEMA katalog | 419 |
| DB GOZ katalog | 89 |
| Combinability KB rules | 15 |

### By System (HTML Extract)

| System | Count |
|--------|-------|
| ANALOG | 57 |
| BEL | 92 |
| BEMA | 67 |
| GOZ | 143 |

---

## Diff Analysis

| Diff Type | Count |
|-----------|-------|
| Missing in DB (HTML has constraints) | 164 |
| Missing in HTML (DB has rules) | 30 |
| Mismatch (constraint difference) | 0 |
| High Severity | 5 |

---

## Top 30 High-Severity Diffs

| Code | System | Severity | Type | Details |
|------|--------|----------|------|---------|
| GOZ_PHANTOM_REMOVED | GOZ | HIGH | MISSING_IN_DB | Code not in katalog but has constraints in HTML |
| GOZ_GOZ_2390 | GOZ | HIGH | MISSING_IN_DB | Code not in katalog but has constraints in HTML |
| GOZ_GOZ_3100 | GOZ | HIGH | MISSING_IN_DB | Code not in katalog but has constraints in HTML |
| GOZ_GOZ_9050 | GOZ | HIGH | MISSING_IN_DB | Code not in katalog but has constraints in HTML |
| GOZ_GOZ_9110 | GOZ | HIGH | MISSING_IN_DB | Code not in katalog but has constraints in HTML |
| BEMA_BEMA_01 | BEMA | MEDIUM | MISSING_IN_DB | Code not in katalog but has constraints in HTML |
| BEMA_BEMA_03 | BEMA | MEDIUM | MISSING_IN_DB | Code not in katalog but has constraints in HTML |
| BEMA_BEMA_100 | BEMA | MEDIUM | MISSING_IN_DB | Code not in katalog but has constraints in HTML |
| BEMA_BEMA_101 | BEMA | MEDIUM | MISSING_IN_DB | Code not in katalog but has constraints in HTML |
| BEMA_BEMA_103 | BEMA | MEDIUM | MISSING_IN_DB | Code not in katalog but has constraints in HTML |
| BEMA_BEMA_105 | BEMA | MEDIUM | MISSING_IN_DB | Code not in katalog but has constraints in HTML |
| BEMA_BEMA_106 | BEMA | MEDIUM | MISSING_IN_DB | Code not in katalog but has constraints in HTML |
| BEMA_BEMA_122 | BEMA | MEDIUM | MISSING_IN_DB | Code not in katalog but has constraints in HTML |
| BEMA_BEMA_126 | BEMA | MEDIUM | MISSING_IN_DB | Code not in katalog but has constraints in HTML |
| BEMA_BEMA_128 | BEMA | MEDIUM | MISSING_IN_DB | Code not in katalog but has constraints in HTML |
| BEMA_BEMA_151 | BEMA | MEDIUM | MISSING_IN_DB | Code not in katalog but has constraints in HTML |
| BEMA_BEMA_161 | BEMA | MEDIUM | MISSING_IN_DB | Code not in katalog but has constraints in HTML |
| BEMA_BEMA_165 | BEMA | MEDIUM | MISSING_IN_DB | Code not in katalog but has constraints in HTML |
| BEMA_BEMA_171 | BEMA | MEDIUM | MISSING_IN_DB | Code not in katalog but has constraints in HTML |
| BEMA_BEMA_172 | BEMA | MEDIUM | MISSING_IN_DB | Code not in katalog but has constraints in HTML |
| BEMA_BEMA_173 | BEMA | MEDIUM | MISSING_IN_DB | Code not in katalog but has constraints in HTML |
| BEMA_BEMA_174 | BEMA | MEDIUM | MISSING_IN_DB | Code not in katalog but has constraints in HTML |
| BEMA_BEMA_18 | BEMA | MEDIUM | MISSING_IN_DB | Code not in katalog but has constraints in HTML |
| BEMA_BEMA_181 | BEMA | MEDIUM | MISSING_IN_DB | Code not in katalog but has constraints in HTML |
| BEMA_BEMA_182 | BEMA | MEDIUM | MISSING_IN_DB | Code not in katalog but has constraints in HTML |
| BEMA_BEMA_19 | BEMA | MEDIUM | MISSING_IN_DB | Code not in katalog but has constraints in HTML |
| BEMA_BEMA_20 | BEMA | MEDIUM | MISSING_IN_DB | Code not in katalog but has constraints in HTML |
| BEMA_BEMA_23 | BEMA | MEDIUM | MISSING_IN_DB | Code not in katalog but has constraints in HTML |
| BEMA_BEMA_24 | BEMA | MEDIUM | MISSING_IN_DB | Code not in katalog but has constraints in HTML |
| BEMA_BEMA_25 | BEMA | MEDIUM | MISSING_IN_DB | Code not in katalog but has constraints in HTML |

---

## 20-Code Spot Check

Selection method: Top 20 from (unified.json codes ∪ combinability_kb codes) ∩ html_extract_with_constraints, sorted by constraint density.

| Code | System | HTML Constraints | DB Constraints | Status | Explanation |
|------|--------|------------------|----------------|--------|-------------|


### Spot Check Summary

- ✅ OK: 0
- ⚠️ MISMATCH: 0
- ❌ MISSING_IN_DB: 0
- ❓ UNCLEAR: 0

---

## Quality Scoring

| Subsystem | Status | Notes |
|-----------|--------|-------|
| Combinability (excludes) | ⚠️ Needs Review | 5 high-severity gaps |
| Scope | ✅ OK | Scope extraction functional |
| Requires | ✅ OK | Requires extraction functional |
| MaxCount | ✅ OK | MaxCount extraction functional |

---

## Final Recommendation

> **PARTIAL**: 5 high-severity gaps, 0 mismatches. Review recommended.


### Next Steps (B)
- Review the 5 high-severity diffs
- Consider updating combinability_kb with missing exclusion rules
- Re-run audit after fixes


---

## Snapshot Values (for gate tests)

```json
{
  "missingInDb": 164,
  "missingInHtml": 30,
  "mismatch": 0,
  "highSeverity": 5,
  "totalHtmlEntries": 359,
  "totalWithConstraints": 235
}
```
