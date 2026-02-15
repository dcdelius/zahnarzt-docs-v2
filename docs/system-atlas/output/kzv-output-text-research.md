# KZV-Oriented Documentation Text — Research Notes + Output Contract (V10)

**Date:** 2026-02-14  
**Goal:** Make V10 output text structurally “KZV-proof” (audit-friendly) while supporting 3 verbosity levels (**Kurz/Mittel/Lang**) without breaking SSOT.

---

## Sources (public)

1) **SGB V § 28 (Zahnärztliche Behandlung / Mehrkostenregelung)** (retrieved 2026-02-15)  
   - URL: https://www.gesetze-im-internet.de/sgb_5/__28.html  
   - Primary legal basis for the dental Mehrkosten regime (and related contract framing).  
   - Used to justify: MKV cannot be treated as “just a chip” — it is a contract context that must be documented as such.

2) **BGB § 630f (Dokumentation der Behandlung)** (retrieved 2026-02-15)  
   - URL: https://www.gesetze-im-internet.de/bgb/__630f.html  
   - Defines the general clinical documentation obligation (timely documentation of measures/results; corrections must remain traceable).  
   - Used to justify: output structure should be evidence-like, not just narrative prose.

3) **BGB § 630e (Aufklärungspflichten)** (retrieved 2026-02-15)  
   - URL: https://www.gesetze-im-internet.de/bgb/__630e.html  
   - Legal basis for patient information/consent duties (what must be explained, when, and in what form).  
   - Used to justify: “Aufklärung” is not a decorative paragraph; it must be tied to Facts/Askbacks (never fabricated).

4) **StrlSchG § 85 (Aufzeichnungen bei medizinischer Exposition)** (retrieved 2026-02-15)  
   - URL: https://www.gesetze-im-internet.de/strlschg/__85.html  
   - Legal baseline for documenting medical exposures (justification/timing/type and findings).  
   - Used to justify: if we render billed X‑ray lines, “Indikation + Befund” should exist as Facts (DICT/ASK), never as fabricated boilerplate.

5) **KZBV — BEMA (Fee schedule PDF)** (retrieved 2026-02-15)  
   - URL: https://www.kzbv.de/wp-content/uploads/KZBV_BEMA_2026-01-01.pdf  
   - Normative wording for what services include (e.g., Füllung Nr. 13; Röntgen incl. written findings documentation; IP4 content).  
   - Used to justify: output must reflect “what was done” in a way consistent with the billed BEMA position semantics.

6) **Bewertungsausschuss decision: “Amalgamverbot → BEMA 13 a‑d”** (retrieved 2026-02-15)  
   - URL: https://www.kzbv.de/wp-content/uploads/Beschluss-BewAus-Amalgamverbot-BEMA-13a-bis-d_2024-10-02.pdf  
   - Clarifies baseline vs exception vs MKV branching for posterior plastic restorations (self‑adhesive, Bulkfill exception, MKV for beyond-baseline).  
   - Used to justify: avoid hard errors for posterior composites; route to targeted clarifying askbacks.

7) **KZBV — MKV form for fillings** (retrieved 2026-02-15)  
   - URL: https://www.kzbv.de/wp-content/uploads/formular_vereinb_mehrkosten_fuell.pdf  
   - Concrete contract fields (region, GOZ items, amounts, signatures) for “Mehrkosten bei Füllungen”.  
   - Used to justify: MKV facts should capture at least “agreement exists + signed + date + estimated amount + justification” (unknown allowed).

8) **KZBV — Schnittstellen zwischen BEMA und GOZ (guide)** (retrieved 2026-02-15)  
   - URL: https://www.kzbv.de/wp-content/uploads/KZBV_Schnittstellen_20150601a.pdf  
   - Contract framing and typical pitfalls for private add‑ons and agreements.  
   - Used to justify: treat MKV/PKV as a first-class “contract context”, not as a random chip.

9) **G‑BA — QBÜ‑RL‑Z Qualitätsbeurteilung zahnärztliche Überkappung** (retrieved 2026-02-15)  
   - URL: https://www.g-ba.de/richtlinien/133/  
   - Defines quality review for pulp capping and enumerates what is evaluated — including documentation items (history/anamnesis, sensibility test, radiographs, indication/contraindications, follow-up).  
   - Used to justify: when Cp/P is present, a small “KZV-evidence” fact set should be captured (prefer DICT; askback only if missing and practice wants strict KZV mode).

10) **KZBV — Wurzelkanalbehandlung (Kostenübernahme GKV, v. a. Molaren)** (retrieved 2026-02-15)  
   - URL: https://www.kzbv.de/patienten/medizinische-infos/behandlung-der-zahnwurzel/wann-ist-eine-wurzelkanalbehandlung-erforderlich/  
   - Official patient-facing explanation of when endo is covered in GKV (notably: additional conditions for molars).  
   - Used to justify: endo in GKV must not hard-error on missing “eligibility”; prefer a targeted askback for molar cases.

> Note: KZV specifics can differ by region. The output contract should remain *structural* (what must be documented), while KB content can be tuned per practice/region later.
>
> See also: `docs/system-atlas/medical/forensic-documentation-elements.md` (inventory + default/askback policy) and `docs/medical/sources/sources.v1.yaml` (SSOT source registry).

---

## What “KZV-proof” means for Docudent

Docudent output should make it easy for a reviewer to answer:

1) **What was done?** (procedure, tooth, surfaces, steps)
2) **Why was it indicated?** (diagnosis/finding context when available/required)
3) **What makes the billing defensible?** (materials/techniques/constraints that justify codes)
4) **What agreements/disclosures exist?** (MKV contract, patient information, post-op notes)

This is not about “writing a novel” — it is about **deterministic, complete, non-contradictory evidence**.

Key principle for low-friction UX:
- We should not ask “nice-to-have” questions in the critical path. Instead, we should:
  - fill OK-to-default items from Settings (with provenance),
  - ask only what is required for (a) billing channelization, (b) KZV-proof evidence, or (c) template params that would otherwise be fabricated,
  - offer optional (collapsed) askbacks for forensically strict practices.

---

## Source-backed evidence lists (strict mode)

These lists define **what evidence can be asked for** when a strict KZV mode is enabled.
They do **not** mandate that we always ask — the default UX should remain low-friction.

### QBÜ‑RL‑Z (Überkappung, Cp/P)

The QBÜ‑RL‑Z Prüfkatalog for pulp capping expects the following evidence items:
- **Anamnesis** (e.g., symptoms and clinical history)
- **Sensibility testing** (method + result)
- **Radiological diagnostics** (type + findings)
- **Indication** (why pulp capping was appropriate)
- **Contraindications ruled out**
- **Follow‑up / control measures**

**Output rule:** If any of these facts are known, they may appear in `Befund` or `Aufklärung` sections.  
**Askback rule:** Only ask for missing items in strict‑mode or when the procedure graph marks them as required.

### StrlSchG § 85 (Radiology)

When radiographs are performed/billed, the minimum evidence should include:
- **Justification / indication**
- **Type / region**
- **Timing (date/time)**
- **Findings**

**Output rule:** Never fabricate these; include only if the Facts exist.  
**Askback rule:** Ask only when radiology is billed or explicitly referenced.

### MKV (Mehrkostenvereinbarung)

The MKV form provides the baseline structure for contract‑safe documentation:
- **Agreement exists + patient confirmation**
- **Estimated Mehrkosten** (amount)
- **GOZ positions / private add‑ons** (via billing refs)
- **Date / signatures** (if captured)

**Output rule:** Always render a concise MKV statement when contract context is MKV.  
**Askback rule:** Amount / justification should be asked only when required by the practice or by billing policy.

---

## Output Sections (recommended default)

V10 already supports template-driven sections. The recommended baseline structure:

- **Befund**: diagnosis/findings (only if known or required by the treatment/code context)
- **Aufklärung**: patient informed + (MKV) agreement statement if active
- **Behandlungsablauf**: prose summary from chip snippets, ordered by phase
- **Durchgeführte Leistungen**: bullet list of billable steps (chip subset with billing refs)
- **Hinweise**: post-op notes (esp. LA) + optional patient statements
- **Abrechnung**: billing details (rendered separately; not necessarily included in copyText)

---

## Verbosity Contract (Kurz/Mittel/Lang)

### `kurz` (minimal, audit-safe)
- Keep: **Behandlungsablauf** (very compact) + **Durchgeführte Leistungen**.
- Keep MKV statement if MKV is active (even in short mode).
- Avoid long generic paragraphs; prefer **one-liners**.

### `mittel` (practice default)
- Keep: all recommended sections, but keep each chip to ~1–2 sentences max.
- Include diagnosis when known (and/or when it unlocks/justifies a billing path).

### `lang` (forensic / fully explicit)
- Keep: all sections.
- Allow more detail per chip and add clarifying disclosures/hints.

### Invariants (all lengths)
- **Longer length never adds new facts.** It only expands on existing Facts/Chips/Disclosures.
- **Disclosures are fact‑gated.** If the fact is unknown, the disclosure must not be rendered.
- **Contract context is authoritative.** MKV/PKV/GKV selection drives contract statements; dictation hints only add detail, never override.

---

## Implementation Mapping (SSOT)

**Text sources allowed**:
- Treatment KB chips: `.../treatments/<treatmentId>/unified.json` → `chips[].textSnippets.{kurz|mittel|lang}`
- Disclosures: `src/docudent/core/billing/knowledgeBase/disclosures/standard_disclosures.json`
- Finding maps (Befund rendering): `.../treatments/<treatmentId>/finding_map.json`
- Templates (layout only): `.../treatments/<treatmentId>/template.json`

**Composer (layout only, no medical meaning)**:
- `src/docudent/core/billing/knowledgeBase/logic/outputComposer.ts`

---

## Current Gap / Improvement (2026-02-14)

- Chips already have 3 text lengths, but **disclosures previously had only one text**.
- To make “Kurz/Mittel/Lang” feel consistent, disclosures need verbosity variants too.

Status: implemented `textSnippets` support for disclosures (see `standard_disclosures.json` + `outputComposer.ts`).
