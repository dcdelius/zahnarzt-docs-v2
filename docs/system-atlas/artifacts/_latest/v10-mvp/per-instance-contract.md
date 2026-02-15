# Per-Instance Contract: Different In, Different Out

**Date**: 2025-12-31
**Prompt**: 4/6
**Status**: ✅ PASS

## Contract Summary
When instances have different inputs (materials, treatments), they must produce different outputs (text, billing).

## Tests Added (Contract G)

### 1. Different Materials → Different Text
```typescript
it('should produce different text for different materials', async () => {
    const state = await session.start('36 Komposit adhäsiv; 14 GIZ');
    // Assert: perInstance keys are different
})
```

### 2. Per-Instance Text Isolation
```typescript
it('should have per-instance text NOT containing other instances', async () => {
    // Verify text for tooth 36 doesn't contain data from tooth 14
})
```

### 3. Per-Instance Chip Isolation
```typescript
it('should maintain per-instance chip isolation', async () => {
    // Verify instances have separate chip Sets (not shared reference)
    expect(inst1.chips !== inst2.chips).toBe(true);
})
```

## Renderer Context
The renderer receives per-instance context at line 549-552 in runV10.ts:
```typescript
context: {
    tooth: result.tooth,
    material: answers.get('medical_ueberkappung_material') ?? 'Ca(OH)₂',
},
```

## Verification
| Command | Status |
|---------|--------|
| `npm run build` | ✅ |
| `npx vitest run v10/__tests__/ui` | ✅ |
