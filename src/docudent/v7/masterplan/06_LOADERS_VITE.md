# Loaders and Vite Compatibility

## Purpose
Scalable JSON loaders using `import.meta.glob` for Vite compatibility.

---

## Banned Patterns

```typescript
// ❌ FORBIDDEN: Dynamic require
const data = require(`./treatments/${id}.json`);

// ❌ FORBIDDEN: require.context
const modules = require.context('./questions', true, /\.json$/);

// ❌ FORBIDDEN: fs.readFileSync
import fs from 'fs';
const data = JSON.parse(fs.readFileSync('./data.json'));
```

---

## Approved Patterns

### Pattern 1: Static Import (Simple, No Scaling)
```typescript
import fuellungBank from './fuellung_question_bank.json';
import kroneBank from './krone_question_bank.json';

const banks = { fuellung: fuellungBank, krone: kroneBank };
export const getBank = (id: string) => banks[id];
```

### Pattern 2: import.meta.glob (Scalable, Recommended)
```typescript
const modules = import.meta.glob('./*_question_bank.json', { eager: true });

// Type-safe wrapper
type BankModule = { default: QuestionBankFile };
const banks = Object.entries(modules).reduce((acc, [path, mod]) => {
    const id = path.match(/\.\/(.+)_question_bank\.json/)?.[1];
    if (id) acc[id] = (mod as BankModule).default;
    return acc;
}, {} as Record<string, QuestionBankFile>);

export const getQuestionBank = (treatmentId: string) => banks[treatmentId];
```

---

## Loader Implementations

### Question Bank Loader

**File**: `questions/questionBank.ts`

```typescript
import type { QuestionDefinition } from '../schema';

interface QuestionBankFile {
    _meta: { treatmentId: string; version: string };
    questions: QuestionDefinition[];
}

// Eager load all question banks
const questionBankModules = import.meta.glob(
    './*_question_bank.json',
    { eager: true }
) as Record<string, { default: QuestionBankFile }>;

// Build lookup map
const questionBanks = new Map<string, QuestionBankFile>();
for (const [path, mod] of Object.entries(questionBankModules)) {
    const match = path.match(/\.\/(.+)_question_bank\.json/);
    if (match) {
        questionBanks.set(match[1], mod.default);
    }
}

// Public API
export function getQuestionBank(treatmentId: string): QuestionBankFile | null {
    return questionBanks.get(treatmentId) ?? null;
}

export function getQuestionDef(
    treatmentId: string,
    key: string
): QuestionDefinition | null {
    const bank = getQuestionBank(treatmentId);
    return bank?.questions.find(q => q.key === key) ?? null;
}

export function getAvailableTreatmentIds(): string[] {
    return Array.from(questionBanks.keys());
}
```

### Answer Map Loader

**File**: `mappings/answerMapLoader.ts`

```typescript
interface AnswerMapFile {
    _meta: { treatmentId: string; version: string };
    map: AnswerMapping[];
    extractionMapping: Record<string, Record<string, string>>;
    defaults: { alwaysOnChipIds: string[]; mkvChipId: string };
    exclusiveGroups: Record<string, string[]>;
}

const answerMapModules = import.meta.glob(
    './*_answer_map.json',
    { eager: true }
) as Record<string, { default: AnswerMapFile }>;

const answerMaps = new Map<string, AnswerMapFile>();
for (const [path, mod] of Object.entries(answerMapModules)) {
    const match = path.match(/\.\/(.+)_answer_map\.json/);
    if (match) {
        answerMaps.set(match[1], mod.default);
    }
}

export function getAnswerMap(treatmentId: string): AnswerMapFile | null {
    return answerMaps.get(treatmentId) ?? null;
}
```

### Chip Definition Loader

**File**: `logic/chipLoader.ts`

```typescript
const chipModules = import.meta.glob(
    '../behandlungen/*/*.json',
    { eager: true }
) as Record<string, { default: unknown }>;

// Extract chip definitions from unified treatment files
export function getChipDefinitions(treatmentId: string): ChipDefinition[] {
    const path = `../behandlungen/${treatmentId}/${treatmentId}_unified.json`;
    const mod = chipModules[path];
    if (!mod) return [];
    const data = (mod as any).default;
    return data.chips ?? [];
}
```

---

## Directory Structure

```
knowledgeBase/
├── questions/
│   ├── fuellung_question_bank.json
│   ├── krone_question_bank.json        # Add file, auto-discovered
│   ├── wurzel_question_bank.json       # Add file, auto-discovered
│   └── questionBank.ts                 # Loader (import.meta.glob)
│
├── mappings/
│   ├── fuellung_answer_map.json
│   ├── krone_answer_map.json           # Add file, auto-discovered
│   └── answerMapLoader.ts              # Loader (import.meta.glob)
│
└── behandlungen/
    ├── fuellung/
    │   └── fuellung_unified.json
    ├── krone/                           # Add folder, auto-discovered
    │   └── krone_unified.json
    └── wurzel/
        └── wurzel_unified.json
```

---

## Adding New Treatments

### With import.meta.glob (Zero Code Change)
1. Create `{treatment}_question_bank.json` in `questions/`
2. Create `{treatment}_answer_map.json` in `mappings/`
3. Create `{treatment}_unified.json` in `behandlungen/{treatment}/`
4. Add entries to `answerIdTranslator.ts` for ID translation
5. **Done** — loaders auto-discover new files

### Verification
```typescript
// In console or test
import { getAvailableTreatmentIds } from './questionBank';
console.log(getAvailableTreatmentIds()); 
// → ['fuellung', 'krone', 'wurzel']
```

---

## TypeScript Configuration

To suppress `import.meta.glob` lint errors:

**tsconfig.json**:
```json
{
  "compilerOptions": {
    "types": ["vite/client"]
  }
}
```

Or add to existing types array if present.
