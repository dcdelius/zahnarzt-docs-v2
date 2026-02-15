# Settings Question Reduction Audit

**Date**: 2025-12-31
**Status**: ⚠️ Not fully testable (facts gap blocks evaluation)

## 1. Settings → Facts Flow

### Expected Precedence
```
dictation negation > dictation explicit > manual answers > settings defaults > system defaults
```

### Current Implementation

File: `v10/settings/resolveDefaultsToFacts.ts`

The settings system is designed to:
1. Provide practice-level defaults (e.g., always use Kofferdam)
2. Pre-fill facts to skip askback questions
3. **Never** set chips or billing directly

## 2. Settings Contract

| Rule | Status | Evidence |
|------|--------|----------|
| Settings fill Facts only | ⚠️ Untestable | Can't verify without facts flowing |
| Settings never set Chips | ✅ No chip setting found | Code inspection |
| Settings never set Billing | ✅ No billing setting found | Code inspection |
| Dictation overrides Settings | ⚠️ Untestable | Extraction doesn't populate facts |

## 3. Question Reduction Potential

| Default Setting | Questions Skipped | Status |
|-----------------|-------------------|--------|
| isolation = kofferdam | common.isolation L1 | ⚠️ Can't test (isolation not in facts) |
| adhesive = ja | fuellung.adhesive L1 | ⚠️ Can't test (adhesive not in facts) |
| material = komposit | fuellung.material L1 | ⚠️ Can't test (material not in facts) |

## 4. Test Cases (Blocked)

| Case | Expected | Actual | Blocked By |
|------|----------|--------|------------|
| Default isolation=kofferdam, dictation neutral | Skip isolation question | ❌ Can't test | Facts gap |
| Default isolation=kofferdam, dictation "ohne Kofferdam" | Show isolation question | ❌ Can't test | Extraction gap |
| No defaults, dictation "Komposit" | Skip material question | ❌ Can't test | Facts gap |

## 5. Conclusion

The settings system **appears correct** based on code inspection:
- Settings only modify facts
- No direct chip or billing manipulation found

**However**, we cannot fully verify because:
1. Facts like `material`, `isolation`, `adhesive` are not populated
2. Extraction doesn't map these terms to facts
3. Without proper facts, settings can't reduce questions

## 6. Next Steps

1. 🔴 **Fix facts population** (material, isolation, adhesive)
2. 🟡 **Add settings→facts test** that verifies question reduction
3. 🟡 **Verify negation precedence** ("ohne Kofferdam" overrides default)
