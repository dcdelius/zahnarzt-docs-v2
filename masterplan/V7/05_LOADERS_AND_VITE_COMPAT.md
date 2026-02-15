# V7 Loaders and Vite Compatibility

## Purpose
Documents Vite-compatible loading patterns. `require()` is banned.

---

## Banned Patterns

### ❌ NEVER USE
```typescript
// FORBIDDEN: Dynamic require
const data = require(`./treatments/${id}.json`);

// FORBIDDEN: require.context
const modules = require.context('./questions', true, /\.json$/);
```

These patterns break in Vite/ESM and cause runtime errors.

---

## Approved Patterns

### ✅ Static Import
```typescript
import fuellungQuestionBank from './fuellung_question_bank.json';
```

**Pros**: Type-safe, tree-shakeable  
**Cons**: Must manually add imports for each treatment

### ✅ import.meta.glob (Preferred)
```typescript
const questionBankModules = import.meta.glob(
    './*_question_bank.json',
    { eager: true }
) as Record<string, { default: QuestionBankFile }>;
```

**Pros**: Auto-discovers files, zero code changes for new treatments  
**Cons**: Requires Vite, TypeScript lint may complain (runtime works)

---

## Current Implementation

### Question Bank Loader
| File | Pattern | Status |
|------|---------|--------|
| `questions/questionBank.ts` | `import.meta.glob` | ✅ Working |

### Chip Resolver
| File | Pattern | Status |
|------|---------|--------|
| `logic/chipResolver.ts` | Static import | ✅ Working |

### Output Composer
| File | Pattern | Status |
|------|---------|--------|
| `logic/outputComposer.ts` | Static import | ✅ Working |

---

## Scaling: Adding New Treatments

### With import.meta.glob (Zero Code Change)

1. Create `{treatment}_question_bank.json` in `questions/`
2. Create `{treatment}_answer_map.json` in `mappings/`
3. Create `{treatment}_unified.json` in `behandlungen/{treatment}/`
4. Done — glob patterns auto-discover new files

### With Static Imports (Code Change Required)

1. Create the JSON files as above
2. Add imports to `questionBank.ts`:
   ```typescript
   import newTreatmentBank from './{treatment}_question_bank.json';
   ```
3. Add to static registry:
   ```typescript
   const staticBanks = {
       fuellung: fuellungQuestionBank,
       {treatment}: newTreatmentBank,  // ADD THIS
   };
   ```

---

## TypeScript Lint Errors

### `import.meta.glob` / `import.meta.env`

**Error**: `Property 'glob' does not exist on type 'ImportMeta'`

**Cause**: tsconfig doesn't include Vite types

**Fix**: Add to `tsconfig.json`:
```json
{
  "compilerOptions": {
    "types": ["vite/client"]
  }
}
```

**Current Status**: Lint error exists but **runtime works fine**. Low priority fix.

---

## Directory Structure for Treatments

```
knowledgeBase/
├── questions/
│   ├── fuellung_question_bank.json
│   ├── krone_question_bank.json      # Future
│   └── questionBank.ts               # Loader
├── mappings/
│   ├── fuellung_answer_map.json
│   ├── krone_answer_map.json         # Future
│   └── fuellung_finding_map.json
└── behandlungen/
    ├── fuellung/
    │   └── fuellung_unified.json
    └── krone/                         # Future
        └── krone_unified.json
```
