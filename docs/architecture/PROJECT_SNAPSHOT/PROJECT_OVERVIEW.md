# Docudent Project Overview

> Persistent knowledge snapshot for new developers and new chat sessions.

---

## What is Docudent?

**Docudent** is an AI-powered dental documentation assistant that transforms voice dictations into structured treatment documentation with billing codes. It is used by German dental practices to:

1. **Document treatments** — Convert spoken dictation into formatted clinical notes
2. **Generate billing codes** — Automatically suggest BEMA (statutory insurance) and GOZ (private insurance) billing codes
3. **Ensure compliance** — Validate combinations, check frequency limits, prevent regress risks

---

## Core Goals

| Goal | Description |
|------|-------------|
| **Speed** | Documentation in seconds, not minutes |
| **Accuracy** | Legally correct billing codes (no regress) |
| **Compliance** | No copyrighted text leakage (Wissing commentaries) |
| **Scalability** | Support multiple treatment types and practices |

---

## What Problems It Solves

### For Dentists
- ❌ **Before:** Manual documentation takes 5-10 minutes per patient
- ✅ **After:** Dictate treatment, get documentation + billing in 30 seconds

### For Practice Managers
- ❌ **Before:** Billing errors lead to rejected claims (regress)
- ✅ **After:** Automated validation catches combination conflicts

### For Compliance Officers
- ❌ **Before:** Risk of exposing copyrighted commentary text
- ✅ **After:** Gate tests prevent commentary leaks in exports

---

## System Architecture (High-Level)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Dictation  │────▶│  Extraction │────▶│   Billing   │
│   (Voice)   │     │   (LLM)     │     │  Inference  │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                    ┌─────────────┐     ┌──────▼──────┐
                    │   Output    │◀────│  Questions  │
                    │  (Docs)     │     │  (Dynamic)  │
                    └─────────────┘     └─────────────┘
```

---

## Key Files

| Purpose | File |
|---------|------|
| Entry Point | `src/main.jsx` |
| Router | `src/App.jsx` |
| V7 Pipeline | `src/docudent/v7/pipeline/index.ts` |
| V5 Controller | `src/docudent/v5/hooks/useBillingV5Controller.ts` |
| Billing Engine | `src/docudent/core/billing/knowledgeBase/logic/treatmentEngine.ts` |
| BEMA Catalog | `src/docudent/core/billing/knowledgeBase/kataloge/bema.json` |
| GOZ Catalog | `src/docudent/core/billing/knowledgeBase/kataloge/goz.json` |

---

## Related Documentation

- [PIPELINES.md](./PIPELINES.md) — V5/V6/V7 pipeline details
- [BILLING_LOGIC.md](./BILLING_LOGIC.md) — How billing inference works
- [SAFETY_AND_COMPLIANCE.md](./SAFETY_AND_COMPLIANCE.md) — Copyright and gates
- [DEVELOPMENT_RULES.md](./DEVELOPMENT_RULES.md) — What must never be done
