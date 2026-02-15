# Workflow Reality — Chairside vs Planning

> **Purpose:** Define clear boundaries between chairside documentation and planning modules.

---

## Two Distinct Workflows

### 1. Chairside Documentation (MVP Focus)

**What it is:** Real-time documentation during or immediately after treatment.

**User:** Dentist (Behandler)

**Trigger:** Dictation after completing an appointment step.

**Output:**
- Treatment documentation text
- Billing suggestions (not final)
- Mehrkosten estimate (if applicable)

**Scope:**
- Single treatment per dictation
- Immediate documentation
- No prior planning required

---

### 2. ZE Planning (Separate Module)

**What it is:** Planning for complex prosthetic work requiring HKP approval.

**User:** ZMV (Zahnmedizinische Fachangestellte)

**Trigger:** Patient requires crown/bridge/denture.

**Output:**
- HKP (Heil- und Kostenplan)
- Befundaufnahme
- Festzuschuss calculation
- Lab order with BEL2 codes

**Scope:**
- Multi-step treatment planning
- Insurance approval flow
- Lab communication

---

## "Case" Concept

**One patient can have multiple appointments/steps.**

```
Case: Patient Müller — Crown Tooth 26
├── Appointment 1: Crown Prep (chairside → doc)
├── Appointment 2: Crown Try-In (chairside → doc)
├── Appointment 3: Crown Insertion (chairside → doc)
└── HKP: Planned separately by ZMV
```

### How Steps Connect

| Appointment | Chairside Doc | References HKP |
|-------------|---------------|----------------|
| Crown Prep | ✓ Generated | Optional |
| Crown Try-In | ✓ Generated | Optional |
| Crown Insertion | ✓ Generated | Yes (final billing) |

---

## Chairside ZE Steps

Even for ZE (Zahnersatz), the **chairside** steps are documentable without full HKP:

| ZE Treatment | Chairside Steps |
|--------------|-----------------|
| Crown | Prep → Try-In → Insertion |
| Bridge | Prep multiple → Try-In → Insertion |
| Denture | Impressions → Bite → Try-In → Insertion |

**MVP handles:** Individual step documentation  
**Not MVP:** Full HKP planning wizard

---

## Responsibility Split

| What | Chairside (Dentist) | ZMV |
|------|---------------------|-----|
| Dictate treatment | ✓ | |
| Generate doc text | ✓ (auto) | |
| Suggest billing codes | ✓ (auto) | |
| Finalize billing | | ✓ |
| Create HKP | | ✓ |
| Patient cost comm. | ✓ (Mehrkosten) | ✓ (HKP total) |
| Submit to insurance | | ✓ |

---

## Summary

> **Chairside = documentation + suggestions**  
> **ZMV = finalization + compliance**

The system never finalizes billing autonomously. It provides:
1. Good-enough suggestions
2. Editable documentation
3. Clear Mehrkosten display

Final decisions remain with trained staff.
