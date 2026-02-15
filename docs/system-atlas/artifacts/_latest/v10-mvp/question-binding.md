# Question Instance Binding

**Date**: 2025-12-31
**Prompt**: 3/6
**Status**: ✅ PASS

## Problem
- Questions were bound to `defaultInstanceId` (first instance)
- Multi-tooth dictation: All questions went to tooth 36, none to 14

## Solution

### 1. Added instanceId to DynamicQuestion
```typescript
// contracts/questions.ts
export interface DynamicQuestion {
    id: string;
    instanceId?: string;  // NEW: for multi-treatment binding
    // ...
}
```

### 2. Tagged Questions in processInstance
```typescript
// runV10.ts processInstance
questions: [...compiledBundle.required, ...compiledBundle.optional].map(q => ({
    ...q,
    instanceId,  // Tag each question with its source instance
})),
```

### 3. Fixed convertToQuestionsByInstance
```typescript
// createV10Session.ts
const instanceId = q.instanceId || defaultInstanceId;  // Use question's instanceId
const instanceExists = instances.some(i => i.instanceId === instanceId);
const resolvedInstanceId = instanceExists ? instanceId : defaultInstanceId;
```

## Verification
| Command | Status |
|---------|--------|
| `npm run build` | ✅ |
| `npx vitest run v10/__tests__/ui` | ✅ |
