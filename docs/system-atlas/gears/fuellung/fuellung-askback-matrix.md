# PROMPT B — Fuellung Askback Matrix

## Askback Categories

| Category | Description | When to Ask |
|----------|-------------|-------------|
| **A) BILLING-CRITICAL** | Without answer, wrong billing codes | Always if unclear |
| **B) COMBINABILITY-CRITICAL** | Without answer, risk BLOCK/WARN | When conflict possible |
| **C) TEXT-QUALITY** | Only for better text, never billing | textLength=mittel/lang only |

## Askback Matrix

| Trigger | Category | Question | Options | FactsUpdate | Chips Affected | Billing Impact |
|---------|----------|----------|---------|-------------|----------------|----------------|
| cariesDepth=profunda AND ueberkappungDone=unknown | A | "Wurde eine Überkappung durchgeführt?" | ja/nein | ueberkappungDone | cp_done/cp_not_required | BEMA_25/GOZ_233x |
| ueberkappungDone=true AND materialUnknown | C | "Welches Überkappungsmaterial?" | Ca(OH)2/MTA/Biodentine | ueberkappungMaterial | text only | None |
| MKV AND mehrkosten unklar | A | "Mehrkostenvereinbarung?" | Mehrkosten vereinbart / Nur Kasse | mkvPresent, mehrkostenConfirmed, nurKasse | insurance_gkv_mkv | MKV addon on/off |
| MKV AND mehrkosten bestätigt/erwähnt AND justification missing | A | "Mehrkosten-Begründung?" | Mehrschicht/Ästhetik/Keine | mkvJustification | mkv_begruendung | GOZ addon |
| MKV AND mehrkosten bestätigt/erwähnt AND amount missing | A | "Mehrkostenbetrag (Patientenanteil)?" | Freitext/€ | mkvBetrag | mkv_begruendung | GOZ addon |
| anesthesia.mentioned=true AND type=unknown | C | "Welche Anästhesie?" | Infiltration/Leitung | anesthesia.type | la_infiltration/la_leitung | BEMA_40/41a |
| kofferdamMentioned=true AND kofferdamUsed=unknown | C | "Wurde Kofferdam angelegt?" | ja/nein | kofferdamUsed | kofferdam | BEMA_12 |

## Minimal Askback Policy

### Rule 1: MKV Clarify First (Side-Branch)
If MKV is selected but Mehrkosten are not explicitly mentioned (no MKV keyword, no € amount, no confirmed flag) → ask `mkv_confirmed` first (Mehrkosten vs Nur Kasse).

### Rule 2: MKV Confirmed → Ask Details
If MKV AND Mehrkosten are confirmed/mentioned → ask `mkv_betrag` and `mkv_justification` only if still missing.

### Rule 3: Überkappung Material → Optional
Only ask in textLength=mittel/lang. For kurz, use default "Überkappungsmaterial".

### Rule 4: LA Type → Default Infiltration
If LA mentioned but type unclear → default to Infiltration (UK Molar = warning only).
**NO ASKBACK** unless explicitly requested.

### Rule 5: Kofferdam → No Askback
If Kofferdam mentioned → assume used. Only billing BEMA_12 if explicitly stated.

## Implementation Spec

| Component | Location | Change |
|-----------|----------|--------|
| Signal detection | `buildFactsFromExtraction.ts` | detectMehrkostenSignals() |
| Askback trigger | KB concept `billing-context` | cases: `mkv_confirmed_required`, `mkv_justification_required_*`, `mkv_betrag_required_*` |
| FactsUpdate | `runV10.ts:applyAskbackUpdate()` | set mehrkostenConfirmed, mkvJustification |
| Text composition | `composeDocumentationV10.ts` | read mkvJustification for MKV section |

## Gate Plan (10 tests)

| Test | Input | Expected |
|------|-------|----------|
| MKV + Komposit → no askback | MKV, "komposit" | state=output, no questions |
| MKV + "nur Kasse" → BEMA only | MKV, "nur Kasse" | no GOZ codes |
| MKV + 120€ → auto-confirm | MKV, "120 Euro" | GOZ addon present |
| MKV unclear → askback | MKV, no signals | state=questions |
| GKV → no MKV askback | GKV | no MKV question |
| PKV → no MKV askback | PKV | no MKV question |
| Cp + no material → optional askback | profunda, Cp done | material askback (text only) |
| Kofferdam mentioned → no askback | "Kofferdam" | BEMA_12 emitted |
| LA unclear → default infiltration | "betäubt" | BEMA_40 (not 41a) |
| Determinism 10x | any | identical output |
