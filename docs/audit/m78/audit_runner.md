# M78 Audit Runner Commands

All commands must be run from repo root: `/Users/david/dokumaster-ui`

## Prerequisites
```bash
# Ensure tsx is available (via npx)
npx tsx --version
```

## Phase A: Inventory + Reachability

### A1: File Inventory
```bash
npx tsx scripts/audit/inventory.ts
# Output: docs/audit/m77/inventory.files.jsonl (1681 files)
```

### A2: Import Graph + Reachability Classification
```bash
npx tsx scripts/audit/buildImportGraph.ts
# Output: docs/audit/m77/import-graph.edges.jsonl (2063 edges)
# Output: docs/audit/m77/reachability.classification.jsonl (760 files)
```

### A3: Copy to M78 and analyze
```bash
cp docs/audit/m77/*.jsonl docs/audit/m78/
grep '"UNKNOWN"' docs/audit/m78/reachability.classification.jsonl | wc -l
```

## Phase B: Vitest + Triage

### Run all tests with JSON output
```bash
npx vitest run --reporter=json --outputFile docs/audit/m78/vitest.json
```

### Triage failing tests
```bash
npx tsx scripts/audit/triageFailingTests.ts
# Output: docs/audit/m78/failing-tests.triage.json
```

## Phase C: Parity Check

### Build + CLI Replay
```bash
npx tsx scripts/audit/runProdParity.ts
# Output: docs/audit/m78/parity.prod.e2e.report.json
```

## Running Specific Gate Tests
```bash
# V7 boundary gates
npx vitest run src/docudent/__tests__/gates/gate-v7-ssot-boundaries.test.ts

# Hardcoded chip IDs
npx vitest run src/docudent/__tests__/gates/gate-no-hardcoded-chip-ids.test.ts

# Import resolution
npx vitest run src/docudent/v7/__tests__/gates/gate-m12_4-no-core-services-imports.test.ts

# Parity gate
npx vitest run src/docudent/__tests__/gates/gate-v10-parity-ui-vs-replay.test.ts
```
