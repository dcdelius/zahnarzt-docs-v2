# M1 Entrypoints - Runtime Entry Points

**Generated**: 2025-12-26T16:05:00Z

---

## Entry Points Table

| Entry Point | File | Symbol | Callers | Evidence |
|-------------|------|--------|---------|----------|
| **runV10** | `v10/pipeline/runV10.ts:242` | `export async function runV10()` | V7 shim, QA suite | grep confirmed |
| **runV10Bundle** | `v10/pipeline/runV10Bundle.ts:102` | `export async function runV10Bundle()` | Multi-instance flows | grep confirmed |
| **V10 Public API** | `v10/public.ts:9` | re-exports runV10, runV10Bundle | External consumers | file content confirmed |
| **V7 Shim** | `v7/pipeline/index.ts:49` | `export async function run()` | UI layer | file content confirmed |

---

## Authority Chain

```
UI/Consumer
    ↓
v7/pipeline/index.ts::run()  [SHIM ONLY]
    ↓  toV10Input() adapter
v10/public.ts::runV10()
    ↓
v10/pipeline/runV10.ts::runV10()  [ORCHESTRATOR]
```

---

## Proof: V10 is the Only Runtime Orchestrator

### Evidence 1: V7 Shim is Thin Delegation

File: `v7/pipeline/index.ts:1-17`
```typescript
/**
 * V7 Pipeline — COMPATIBILITY SHIM FOR V10
 *
 * M12.3: V7 is now a thin compatibility layer that delegates ALL
 * execution to V10. No orchestration logic remains in V7.
 *
 * Flow: V7 Input → Adapt → V10 → Adapt → V7 Output
 *
 * ❌ NO extraction calls
 * ❌ NO question generation
 * ❌ NO answer normalization
 * ❌ NO output generation
 * ❌ NO legacy V6 imports
 */
```

### Evidence 2: V7 `run()` Only Calls V10

File: `v7/pipeline/index.ts:52-69`
```typescript
// ─── STEP 1: Convert V7 Input → V10 Input
const v10Input = toV10Input(input);

// ─── STEP 2: Call V10
const v10Output = await runV10(v10Input);

// ─── STEP 3: Convert V10 Output → V7 Output
const v7Result = fromV10Output(v10Output);
```

### Evidence 3: No Other Pipeline Orchestrators

```bash
grep -rn "runV10\|runV10Bundle" src/docudent --include="*.ts" | grep -v "__tests__"
```

Only finds:
- Definition in `runV10.ts`, `runV10Bundle.ts`
- Re-export in `public.ts`, `index.ts`
- Caller in `v7/pipeline/index.ts`
- Caller in `qa/runClinicalSuite.ts`

---

## runV10 Execution Chain (Evidence-Based)

File: `v10/pipeline/runV10.ts`

| Step | Module | Line | Function |
|------|--------|------|----------|
| 1 | Extraction | 297-312 | `selectExtractor().extract()` |
| 2 | Facts | 116-120 | `buildFactsFromExtraction()` |
| 3 | Answers | 123-124 | `applyAnswersToFacts()` |
| 4 | Medical Engine | 127-131 | `applyMedicalKb()` |
| 5 | Askback Compile | 134-142 | `compileAskbacksToQuestions()` |
| 6 | Billing Guard | 431 | `applyBillingGuard()` |
| 7 | Render | 451-460 | `renderFromKbChips()` |
| 8 | Combinability | 478-484 | `checkCombinabilityFromKb()` |

---

## Who Imports v10/public.ts

```
src/docudent/v7/pipeline/index.ts:23
src/docudent/v7/pipeline/adapters/toV10Input.ts:8S
src/docudent/v7/pipeline/adapters/fromV10Output.ts:9
```

All importers are V7 shim layer only.

---

## Commands Run

```bash
grep -rn "runV10\|runV10Bundle\|applyMedicalKb\|renderFromKbChips" src/docudent --include="*.ts"
grep -rn "from '.*v10/public'" src --include="*.ts"
```
