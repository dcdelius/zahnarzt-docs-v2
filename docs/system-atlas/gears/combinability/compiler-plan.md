# Combinability Compiler Plan

## Input → Output

```
kombinationen.json + HTML truthset
        ↓
   [COMPILER]
        ↓
combinability_kb.vX.json + meta.json + diff.report.md
```

## Build Steps (Deterministic)

### Step 1: Fetch & Validate Input

```bash
# Read source files
kombinationen.json           # Manual rules (14)
html_truthset/*.html         # Extracted rules (6+)
```

**Fail-fast**:
- Unknown code format → ERROR
- Empty matcher (betrifft = []) → ERROR
- Missing required fields → ERROR

### Step 2: Normalize

| Operation | Example |
|-----------|---------|
| Range expansion | `GOZ_2060..2120` → `[GOZ_2060, GOZ_2080, GOZ_2100, GOZ_2120]` |
| Symmetry check | If A blocks B, ensure B blocks A |
| Duplicate merge | Same rule from multiple sources → merge sourceRefs |
| Conflict detect | Same codes with different severity → WARN |

### Step 3: Compile

```typescript
interface CompiledRule {
  id: string;
  typ: 'ausschluss' | 'bedingung' | 'haeufigkeit' | 'dokumentation';
  betrifft: string[];
  blockWith?: string[];
  autoResolve?: 'drop_anchor' | 'drop_blockwith';
  schweregrad: 'regress' | 'warnung' | 'info';
  scope: 'SESSION' | 'TOOTH' | 'QUADRANT' | 'CANAL';
  sourceRefs: SourceRef[];
  priority: number;
}
```

### Step 4: Sort & Hash

```typescript
// Deterministic sort
rules.sort((a, b) => a.id.localeCompare(b.id));

// Content hash
const hash = sha256(JSON.stringify(rules));
```

### Step 5: Output Artifacts

| Artifact | Content |
|----------|---------|
| `combinability_kb.v{N}.json` | Compiled rules + meta |
| `meta.json` | Version, hash, timestamp, ruleCount |
| `diff.report.md` | Added/removed/changed rules vs previous version |

## Fail-Fast Rules

| Condition | Action |
|-----------|--------|
| Code not in catalog (BEMA/GOZ) | ERROR |
| Empty betrifft array | ERROR |
| blockWith contains anchor | ERROR |
| Conflicting autoResolve policies | WARN |
| Duplicate rule ID | ERROR |

## Definition of Done

- [ ] All rules from kombinationen.json compiled
- [ ] HTML truthset rules merged
- [ ] No validation errors
- [ ] Hash matches expected
- [ ] diff.report shows no unexpected changes
- [ ] All gate tests pass
