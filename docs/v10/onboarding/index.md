# V10 Onboarding Index

Welcome to V10 documentation. Start here.

---

## Quick Links

| Doc | Purpose | Time |
|-----|---------|------|
| [Executive Summary](./executive-summary.md) | What is this? What are guards? | 5 min |
| [60-Minute Route](./60min-route.md) | Step-by-step learning path | 60 min |
| [Full Circle Map](./full-circle-map.md) | Complete pipeline reference | Reference |
| [Debug Playbook](./debug-playbook.md) | When things go wrong | Reference |

---

## Run Gates

```bash
# SSOT gates
npx vitest run src/docudent/__tests__/gates/gate-m25*.test.ts \
  src/docudent/__tests__/gates/gate-m26*.test.ts

# All gates
npx vitest run src/docudent/__tests__/gates/

# Determinism
npx vitest run src/docudent/__tests__/gates/gate-m21-determinism*.test.ts
```

---

## Source of Truth

| Data | Location |
|------|----------|
| Architecture Map v3 | [docs/audit/archmap_v3/architecture-map.v3.md](../../audit/archmap_v3/architecture-map.v3.md) |
| Data Assets | [docs/audit/archmap_v3/data-assets.runtime.v3.json](../../audit/archmap_v3/data-assets.runtime.v3.json) |
| Runtime Closure | [docs/audit/archmap_v3/runtime-closure.v3.json](../../audit/archmap_v3/runtime-closure.v3.json) |
| Gates Mapping | [docs/audit/archmap_v3/gates-to-modules.v3.md](../../audit/archmap_v3/gates-to-modules.v3.md) |

---

## Entry Points

| Entry | File |
|-------|------|
| runV10 | [src/docudent/v10/pipeline/runV10.ts#L242](src/docudent/v10/pipeline/runV10.ts#L242) |
| runV10Bundle | [src/docudent/v10/pipeline/runV10Bundle.ts#L102](src/docudent/v10/pipeline/runV10Bundle.ts#L102) |
| V7 shim | [src/docudent/v7/pipeline/index.ts#L49](src/docudent/v7/pipeline/index.ts#L49) |
