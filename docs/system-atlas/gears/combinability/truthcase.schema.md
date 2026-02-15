# GIGAPROMPT C — Truthcase Schema

## Truthcase Format (SSOT)

```typescript
interface Truthcase {
  id: string;
  title: string;
  treatmentId: 'fuellung' | 'endo';
  insuranceType: 'GKV' | 'PKV' | 'MKV';
  
  // Input
  dictation: string;
  answers: Record<string, string>;
  forceExtraction?: {
    tooth: string;
    surfaces?: string[];
    materialMentioned?: string;
    mehrkostenConfirmed?: boolean;
    nurKasse?: boolean;
    anesthesia?: string;
    kofferdamUsed?: boolean;
  };
  
  // Expected Output
  expected: {
    state: 'output' | 'questions' | 'error';
    mustContainCodes: string[];
    mustNotContainCodes: string[];
    combinabilityVerdict: 'PASS' | 'WARN' | 'BLOCK';
    droppedCodes?: string[];
    mustContainTextSnippets?: RegExp[];
    invariants?: {
      noRawBooleans?: boolean;
      sectionsCount?: number;
    };
  };
  
  // Metadata
  tags?: string[];
  source?: 'hand-curated' | 'db-generated';
  ruleId?: string;  // For generated cases
}
```

## RuleRecord → Generated Truthcases

| Rule Type | Generated Case |
|-----------|----------------|
| EXCLUDES | Bring both codes together via chips/fixtures |
| INCLUDES | Anchor + included codes present |
| MAX_COUNT | Duplicate instances (multi-tooth) |
| CONDITIONAL | Toggle condition (mkvConfirmed true/false) |

### Generation Strategy

```typescript
function generateFromRule(rule: RuleRecord): Truthcase[] {
  switch (rule.relationType) {
    case 'EXCLUDES':
      return [{
        forceExtraction: { /* trigger both anchor and blockWith */ },
        expected: {
          combinabilityVerdict: rule.autoResolvePolicy ? 'WARN' : 'BLOCK',
          droppedCodes: rule.autoResolvePolicy === 'DROP_ANCHOR' 
            ? rule.codes.anchor : [],
        }
      }];
    case 'MAX_COUNT':
      return [/* multi-instance case */];
  }
}
```

**Note**: If dictation can't trigger codes, use `forceExtraction` fixtures.
SSOT preserved: codes come from KB/renderer, not test hardcoded.
