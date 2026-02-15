# ExplainRun Report v1

**Version**: v1  
**Generated**: 2025-12-26

---

## Overview

The ExplainRun report provides a deterministic "full circle" explanation of any V10 pipeline run. It traces the entire journey from dictation input to billing output, documenting:

- How dictation was extracted
- What facts were derived
- Which rules fired
- What chips were emitted
- Which billing codes were generated
- Whether combinability checks passed

---

## Report Structure

```typescript
interface ExplainRunReport {
    version: 'v1';
    generatedAt: string;
    stableHash: string;           // Deterministic, excludes timestamps

    input: {
        treatmentId: string;
        insuranceType: 'GKV' | 'PKV' | 'MKV';
        dictationPreview: string;
        teethCount: number;
    };

    extraction: ExtractionSummary;
    facts: FactEntry[];
    firedRules: FiredRule[];
    askbacks: AskbackMapping[];
    chips: ChipEntry[];
    billingCodes: BillingCodeEntry[];
    combinability: CombinabilityResult;
    textBlocks: TextBlock[];
    kbMeta: KbMetaCollection;
    traceLines: Array<{ key: string; value: unknown }>;
}
```

---

## Usage

```typescript
import { explainRunV10 } from '@/docudent/v10/qa/explainRunV10';

const result = await runV10(input);
const explain = explainRunV10(input, result, { format: 'both' });

// JSON report
console.log(explain.reportJson);

// Markdown report
console.log(explain.reportMarkdown);

// Stable hash (for diff detection)
console.log(explain.stableHash);
```

---

## Stable Hash

The `stableHash` is a SHA256 hash (first 16 chars) computed from:
- All report fields **except** timestamps (generatedAt, checkedAt)
- Sorted keys for deterministic ordering

**Use case**: Compare hashes to detect changes in pipeline behavior.

---

## Example Report

```json
{
    "version": "v1",
    "generatedAt": "2025-12-26T19:00:00.000Z",
    "stableHash": "abc123def456789",
    "input": {
        "treatmentId": "fuellung",
        "insuranceType": "GKV",
        "dictationPreview": "Füllung Zahn 36 mesial-okklusal...",
        "teethCount": 1
    },
    "extraction": {
        "engine": "stub",
        "treatmentId": "fuellung",
        "insuranceType": "GKV",
        "tooth": "36",
        "surfaces": ["mesial", "okklusal"]
    },
    "facts": [
        { "factKey": "tooth", "value": "36", "source": "dictation", "confirmed": true }
    ],
    "firedRules": [
        { "ruleId": "deep_caries", "ruleType": "emit_chip", "scope": "session", "outcome": "triggered" }
    ],
    "chips": [
        { "chipId": "cp", "scope": "session", "emittedByRule": "deep_caries", "billingEligible": true }
    ],
    "billingCodes": [
        { "code": "BEMA_25", "codeSystem": "BEMA", "sourceChipId": "cp", "scope": "session" }
    ],
    "combinability": {
        "verdict": "pass",
        "conflicts": []
    },
    "textBlocks": [
        { "blockIndex": 0, "sectionKey": "main", "text": "Füllung...", "sourceChipIds": ["cp"] }
    ],
    "kbMeta": {
        "medical": { "source": "json", "version": "v1", "hash": "abc123" },
        "treatment": { "source": "json", "version": "v1", "hash": "def456" },
        "combinability": { "source": "json", "version": "v1", "hash": "ghi789" }
    }
}
```

---

## Gates

| Gate | Purpose |
|------|---------|
| gate-m27-explain-report-determinism-100x | Hash stable across 100 runs |
| gate-m27-explain-report-completeness | No null holes |
| gate-m27-textblocks-map-to-chips | Every text block has chipIds |
| gate-m27-billingcodes-map-to-chips | Every code has chipId |
| gate-m27-truthset-hash-present | KB hashes present |

---

## References

- Schema: [explainSchema.v1.ts](src/docudent/v10/qa/explainSchema.v1.ts)
- Generator: [explainRunV10.ts](src/docudent/v10/qa/explainRunV10.ts)
- Truthcases: [combinabilityTruthcases.v1.ts](src/docudent/v10/qa/combinabilityTruthcases.v1.ts)
