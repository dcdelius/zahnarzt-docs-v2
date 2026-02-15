# Fuellung Gear Documentation

## Overview

Documentation for the Fuellung (filling) treatment pack in V10.

## Gate Tests

| Gate | Description | Command |
|------|-------------|---------|
| `gate-fuellung-billing-complete` | 40 truthcases, all must have `isComplete: true` | `npm test -- --run gate-fuellung-billing-complete` |
| `gate-fuellung-no-user-facing-block` | No BLOCK verdict from combinability | `npm test -- --run gate-fuellung-no-user-facing-block` |
| `gate-kb-coverage-fuellung` | KB structure validation | `npm test -- --run gate-kb-coverage-fuellung` |
| `gate-fuellung-no-silent-defaults` | No silent defaults in output | `npm test -- --run gate-fuellung-no-silent-defaults` |
| `gate-fuellung-capping-ssot` | GP7: Cp/P via KB only, no hardcode | `npm test -- --run gate-fuellung-capping-ssot` |
| `gate-fuellung-text-billing-consistency` | GP8: Text matches final billingCodes | `npm test -- --run gate-fuellung-text-billing-consistency` |
| `gate-fuellung-droppedcodes-propagation` | GP8: DroppedCodes absent from text | `npm test -- --run gate-fuellung-droppedcodes-propagation` |

## Run All Fuellung Gates

```bash
npm test -- --run src/docudent/v10/__tests__/gates/gate-fuellung
```

## Documentation

- [**Text-Billing SSOT (GP8)**](./fuellung-text-billing-ssot.md) - DroppedCodes filtering
- [**Chip SSOT Contract (GP7)**](./fuellung-chip-ssot-contract.md) - Cp/P emission concepts
- [Billing Completeness Contract](./gp4-billing-completeness-contract.md)
- [Debug Playbook](./gp4-debug-playbook.md)
- [Truthcases](./fuellung-truthcases-30.md)
- [Facts Contract](./fuellung-facts-contract.md)
- [Askback Matrix](./fuellung-askback-matrix.md)
