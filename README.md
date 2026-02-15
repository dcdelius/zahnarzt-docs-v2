# Docudent — Dental Documentation Made Easy

A modern dental documentation platform for German practices. Built with React, Vite, and TypeScript.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## V7 — Current Version

V7 is the production-ready version with:
- **Jeton design system** — Premium, calm, no-cards UI
- **Case management** — Draft → Finalized → Amended lifecycle
- **Review engine** — Automatic quality checks with settings awareness
- **Team management** — Invite-based with claims-driven auth

## Daily Workflow (Intended)

| Time | Action | Description |
|------|--------|-------------|
| **Morgen** | Diktat | Schnelle Dokumentation während der Behandlung |
| **Mittag** | Fallcheck | Kurze Prüfung der automatisch generierten Ausgabe |
| **Abend** | Review & Abschluss | Stapelverarbeitung der Qualitätsprüfung |

## Architecture

- `core/` — Business logic, billing engine, case service
- `v7/` — UI layer, pages, components (no billing logic)
- `contracts/` — Shared type definitions and canonical IDs

See [V7 Architecture](src/docudent/v7/ARCHITECTURE.md) for boundary rules.

## Testing

```bash
# Run all tests
npm test

# Run gate tests only
npm test gate-

# Check V7 boundaries
grep -r "firebase/firestore" src/docudent/v7/  # Should return 0
grep -r "core/billing" src/docudent/v7/        # Should return 0
```

## Pilot Readiness

V7 is ready for controlled pilot usage with:

- **State visibility** — Clear status indicators on all pages
- **Recovery paths** — Reassuring copy for all actions
- **Observability** — Transparent feedback on system behavior
- **Guardrails** — PILOT_MODE enabled to suppress experimental features

When `PILOT_MODE=true` (default), beta badges are hidden and the product feels stable and intentional.

## License

Proprietary — All rights reserved.
