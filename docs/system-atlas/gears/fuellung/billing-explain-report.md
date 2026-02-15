# Billing Explain Report — Specification

## Purpose

DEV-only debug artifact showing exactly how billing codes were derived.

## Output Structure

```typescript
interface BillingExplainReport {
  // Input snapshot
  input: {
    dictation: string;
    insuranceType: string;
    treatmentId: string;
    answers: Record<string, string>;
  };
  
  // Facts snapshot
  facts: {
    tooth: string;
    surfaces: string[];
    surfaceCount: number;
    cariesDepth: string;
    material: string;
    adhesiveTechnique: boolean;
    anesthesia: { type: string; mentioned: boolean };
    kofferdamUsed: boolean;
    mehrkostenConfirmed: boolean;
    nurKasse: boolean;
  };
  
  // KB evaluation
  kbRules: {
    fired: { ruleId: string; action: string; sourceRef: string }[];
    skipped: { ruleId: string; reason: string }[];
  };
  
  // Chips emitted
  chips: {
    id: string;
    source: 'medical_kb' | 'treatment_kb';
    ruleId: string;
  }[];
  
  // Billing resolution
  billingResolution: {
    chipId: string;
    availableBranches: string[];
    selectedBranch: string;
    reason: string;
    resolvedCode: string;
  }[];
  
  // Surface mapping
  surfaceMapping: {
    surfaceCount: number;
    branch: string;
    resolvedCode: string;
  };
  
  // Combinability
  combinability: {
    verdict: 'PASS' | 'WARN' | 'BLOCK';
    rulesHit: { ruleId: string; codes: string[]; action: string }[];
    droppedCodes: string[];
    warnings: string[];
  };
  
  // Final output
  finalCodes: string[];
  codeCount: number;
}
```

## Implementation Location

| Component | File | Function |
|-----------|------|----------|
| Builder | `v10/qa/billingExplainReport.ts` | `buildBillingExplainReport()` |
| Integration | `runV10.ts` | `meta.billingExplain` (DEV only) |
| UI | Debug Drawer | JSON viewer |

## Example Output

```json
{
  "facts": {
    "tooth": "36",
    "surfaces": ["m", "o", "d"],
    "surfaceCount": 3,
    "mehrkostenConfirmed": true
  },
  "chips": [
    { "id": "fuellung_grundleistung", "ruleId": "rule-fuellung-baseline" },
    { "id": "mehrschicht", "ruleId": "rule-mehrschicht-if-adhesive" }
  ],
  "billingResolution": [
    { "chipId": "fuellung_grundleistung", "branch": "GKV", "resolvedCode": "BEMA_13c" },
    { "chipId": "fuellung_grundleistung", "branch": "MKV", "resolvedCode": "GOZ_2100" }
  ],
  "combinability": {
    "verdict": "WARN",
    "droppedCodes": ["GOZ_2197"],
    "warnings": ["Auto-resolved: GOZ_2197 dropped"]
  },
  "finalCodes": ["BEMA_13c", "GOZ_2100"]
}
```

## Gate Test

```typescript
it('explain report contains all required fields', async () => {
  const result = await runV10({ ... });
  const explain = result.meta.billingExplain;
  
  expect(explain.facts).toBeDefined();
  expect(explain.chips.length).toBeGreaterThan(0);
  expect(explain.combinability.verdict).toBeDefined();
  expect(explain.finalCodes).toEqual(result.output.billingCodes);
});
```
