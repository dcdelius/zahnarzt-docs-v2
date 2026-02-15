# Forensic / KZV-Safe Documentation Elements — Inventory (v1)

**Date:** 2026-02-14  
**Goal:** Provide one SSOT-facing inventory of documentation elements that can be required for **auditability**, **clinical plausibility**, and **billing defensibility** — and classify each element as **Settings-defaultable** vs **Askback-required** (Facts-only).

This document is intended to drive the V10 target architecture:

`Facts → (Contract Context) → Procedure Graph (nodes) → Chips → Output + BillingDB`

## Non-negotiable rules

- **Never fabricate.** If we don’t know a fact, we either omit it or ask an askback.
- **Askbacks set Facts only** (never activate chips directly).
- **Only Procedure nodes** (or explicit `manualOverride`) may emit chips.
- **Composer/Renderer never reads Settings** (only Facts + chips + bundle meta).

## Primary drivers (KZV / legal / quality)

These sources define what “KZV-level” typically means in practice: documentation duty, MKV contract hygiene, and (for selected services) quality reviews.

- **BGB § 630f (Dokumentation der Behandlung)** — timely, complete, traceable documentation (general baseline).  
  URL: https://www.gesetze-im-internet.de/bgb/__630f.html
- **BGB § 630e (Aufklärungspflichten)** — legal basis for informed consent / patient information duties.  
  URL: https://www.gesetze-im-internet.de/bgb/__630e.html
- **SGB V § 28** — legal framing for dental treatment and Mehrkosten.  
  URL: https://www.gesetze-im-internet.de/sgb_5/__28.html
- **StrlSchG § 85 (Aufzeichnungen bei medizinischer Exposition)** — legal baseline for recording X‑ray justification, timing/type, and findings (for radiology-facts contracts).  
  URL: https://www.gesetze-im-internet.de/strlschg/__85.html
- **KZBV BEMA (Fee schedule)** — normative wording for what services include (e.g. Füllung, Röntgen incl. written findings, IP4) and when Mehrkosten agreements are required.  
  URL: https://www.kzbv.de/wp-content/uploads/KZBV_BEMA_2026-01-01.pdf
- **Bewertungsausschuss (KZBV/GKV‑SV) decision: “Amalgamverbot → BEMA 13 a‑d”** — clarifies GKV baseline material class in posterior (self‑adhesive), the Bulkfill exception, and the MKV branch for “beyond baseline” posterior restorations.  
  URL: https://www.kzbv.de/wp-content/uploads/Beschluss-BewAus-Amalgamverbot-BEMA-13a-bis-d_2024-10-02.pdf
- **KZBV MKV form (Füllungen)** — concrete contract fields (region, GOZ positions, estimated Mehrkosten, signatures).  
  URL: https://www.kzbv.de/wp-content/uploads/formular_vereinb_mehrkosten_fuell.pdf
- **KZBV “Schnittstellen zwischen BEMA und GOZ”** — contract framing for private add‑ons / agreements (useful for MKV/PKV contract contexts).  
  URL: https://www.kzbv.de/wp-content/uploads/KZBV_Schnittstellen_20150601a.pdf
- **G‑BA QBÜ‑RL‑Z** — quality review for pulp capping: lists evidence elements (anamnesis, sensibility test, radiographs, indication/contraindications, follow-up).  
  URL: https://www.g-ba.de/richtlinien/133/
- **KZBV Endo (GKV coverage, esp. molars)** — “eligibility” should be handled by targeted askbacks rather than hard errors.  
  URL: https://www.kzbv.de/patienten/medizinische-infos/behandlung-der-zahnwurzel/wann-ist-eine-wurzelkanalbehandlung-erforderlich/

## Legend

For each element below, we classify:

- **Capture path**
  - `DICT` = extracted/normalized from dictation
  - `STD` = filled from Settings defaults into Facts (with provenance)
  - `ASK` = asked via askback → sets Facts
  - `MAN` = manual override (exception)
- **Default policy**
  - `OK-to-default` = can be deterministically filled from Settings if missing in DICT
  - `Default-as-proposal` = can be prefilled, but should be confirmed (ASK) before documenting as “performed”
  - `Never default` = must be explicit (DICT/ASK/MAN) or omitted
- **Scope**
  - `global` = per session/contract
  - `per_instance` = per tooth / per treatment instance
- **Output owner**
  - `Chip` = emitted by Procedure node (text + billing refs)
  - `Disclosure` = standard/legal/patient-information paragraph (text-length aware)
  - `Befund` = findings/diagnosis rendering (Facts → text)

---

# KZV-level baseline (source-backed minimums)

This section is strictly derived from the sources above and should remain *minimal*.  
Additions must be backed by new sources (or be explicitly marked as “practice preference”).

## A) Documentation duty (BGB § 630f)

- **Key measures + results must be recorded** (diagnosis/findings, treatment steps, outcomes).  
  - Capture: `DICT` → if required by procedure graph: `ASK`  
  - Default policy: `Never default`  
  - Output owner: `Befund` + `Chip` (never fabricate).

## B) Informed consent (BGB § 630e)

- **Consent / patient information must be documentable** when performed.  
  - Capture: `ASK` (confirm) or explicit `DICT`  
  - Default policy: `Never default` (Settings may *enable* the askback, not auto‑assert consent)  
  - Output owner: `Disclosure` (fact‑gated).

## C) Radiology documentation (StrlSchG § 85)

When radiographs are performed or billed, the following **Facts** should exist:
- **Justification / indication**  
- **Type / region** (e.g., bitewing, periapical, OPG)  
- **Timing** (date/time)  
- **Findings** (written Befund)

Policy: `Never default`; if missing, askback (or omit the radiology chip if not performed).

## D) Pulp capping evidence set (QBÜ‑RL‑Z)

For **Cp/P** cases, the QBÜ‑RL‑Z quality review expects evidence of:
- **Anamnesis** (symptoms, clinical context)  
- **Sensibility test** (method + result)  
- **Radiological diagnostics + findings**  
- **Indication** and **tooth retention intent**  
- **Contraindications ruled out**  
- **Follow‑up / control measures**

Policy: `Never default`.  
Strict mode may ask for missing items; otherwise keep as optional/hidden askbacks.

## E) MKV contract hygiene (SGB V § 28 + MKV forms)

When **MKV** is active, the following Facts should exist (if the practice requires strict mode):
- **Agreement exists** (confirmed)  
- **Estimated amount / Mehrkosten**  
- **GOZ positions** (or mapping via billing refs)  
- **Date / signatures** (as applicable)

Policy: do not auto‑assert; askback if missing and strict MKV compliance is enabled.

---

# 1) Universal (all treatments)

## 1.1 Identity / scope facts

- **Tooth/teeth (FDI)**  
  - Capture: `DICT` → if missing: `ASK`  
  - Default policy: `Never default`  
  - Scope: `per_instance`  
  - Output owner: `Chip`/structure (chips must not be emitted for “unknown tooth”; instead ask).

- **Surfaces (MOD/… )** (only when needed, e.g. restorative)  
  - Capture: `DICT` → if required and missing: `ASK`  
  - Default policy: `Never default`  
  - Scope: `per_instance`  
  - Output owner: `Chip` (affects restorative text + billing constraints).

## 1.2 Consent / information (Aufklärung & Einwilligung)

- **Treatment consent documented (“patient informed + agreed”)**  
  - Capture: ideally `ASK` (confirm), optionally `DICT` if explicitly stated  
  - Default policy: `Never default` (a Settings toggle may *enable the askback*, not auto-assert completion)  
  - Scope: `global` (sometimes per_instance for specific risks)  
  - Output owner: `Disclosure` (structure) + optional `Chip` (treatment-specific risks).

- **Anesthesia information (side effects + post-op caution)**  
  - Capture: `DICT` (anesthesia performed) → disclosure text can be `STD`  
  - Default policy: `OK-to-default` for *text* if anesthesia fact is true; `Never default` for “anesthesia performed”  
  - Scope: `per_instance`  
  - Output owner: `Disclosure` (text-length aware).

## 1.3 Diagnostics / indication

- **Diagnosis / indication (e.g., caries depth, symptoms, endo diagnosis)**  
  - Capture: `DICT` → if required by the Procedure graph and missing: `ASK`  
  - Default policy: `Never default`  
  - Scope: `per_instance`  
  - Output owner: `Befund` + `Chip` (some chips require a diagnosis to be defensible).

- **Vitality test / “VIPR” (Vitalitätsprüfung)**  
  - Capture: `DICT` → if deep caries / endo suspected and not stated: `ASK`  
  - Default policy: `Never default`  
  - Scope: `per_instance`  
  - Output owner: `Befund` (test + result) and/or `Chip` if it changes the procedure graph.

- **Radiology / X-ray (type + indication + region + timing)**  
  - Capture: `DICT` → if required and missing: `ASK`  
  - Default policy: `Never default`  
  - Scope: `per_instance` (sometimes global)  
  - Output owner: `Befund` + `Disclosure` (when legally/contractually needed).  
  - Notes: BEMA explicitly includes **written findings documentation** for billed X‑rays; StrlSchG §85 is a legal baseline for recording justification/timing/type and findings.

## 1.4 Infection control / isolation (cross-cutting)

- **Isolation method (Rubber dam / cotton rolls / etc.)**  
  - Capture: `DICT` OR `STD` (practice standard)  
  - Default policy: `Default-as-proposal` (safe mode: ask to confirm if not in dictation)  
  - Scope: `per_instance`  
  - Output owner: `Chip` (relevant for Endo and some restorative workflows).

## 1.5 Post-op instructions (cross-cutting)

- **Generic post-op instructions** (e.g., after LA / after extraction)  
  - Capture: `STD` (text) gated by Facts/chips  
  - Default policy: `OK-to-default` for *text* when the triggering chip/fact exists; `Never default` for “was explicitly instructed”  
  - Scope: `per_instance` or `global`  
  - Output owner: `Disclosure`.

---

# 2) Treatment-specific inventories

## 2.1 Restorative / Füllung

- **Restoration material (Komposit / Amalgam / GIZ / …)**  
  - Capture: `DICT` → else `STD` (user/practice default) → else `ASK`  
  - Default policy: `OK-to-default`  
  - Scope: `per_instance`  
  - Output owner: `Chip` (text + billing refs).

- **Posterior restoration branch (GKV baseline vs MKV vs exception)** *(BEMA 13)*  
  - Capture: `DICT` → else `ASK` (only when the dictation is ambiguous)  
  - Default policy: `Never default` (branch)  
  - Scope: `per_instance`  
  - Output owner: `Chip` + `Disclosure` (MKV contract context).  
  - Notes: In GKV posterior, “self‑adhesive” is baseline; “Bulkfill” is a defined exception when self‑adhesive is not lege artis; “adhesive posterior composite beyond baseline” routes to MKV. The system must not hard‑error here — it must ask a targeted clarification.

- **Adhesive strategy (etching/bonding system)**  
  - Capture: `STD` (practice default) → if required and missing: `ASK`  
  - Default policy: `OK-to-default`  
  - Scope: `per_instance`  
  - Output owner: `Chip`.

- **Matrix / wedge (Class II / approximal)**  
  - Capture: `DICT` → else `STD` (if always used) → else `ASK` when approximal surfaces present  
  - Default policy: `Default-as-proposal`  
  - Scope: `per_instance`  
  - Output owner: `Chip`.

- **Caries depth (media/profunda/pulpanah)**  
  - Capture: `DICT` → else `ASK` when restorative facts imply deep caries  
  - Default policy: `Never default`  
  - Scope: `per_instance`  
  - Output owner: `Befund` + `Chip` constraints.

- **Indirect vs direct pulp capping** *(must not be conflated)*  
  - Capture: `DICT` → else `ASK` when “very deep” / pulp-near signals exist  
  - Default policy: `Never default` (type)  
  - Scope: `per_instance`  
  - Output owner: `Chip` (Cp vs P) + `Disclosure` (risk notes if needed).

- **Capping material** (often from Settings, not dictation)  
  - Capture: `STD` → else `ASK` (if capping is required)  
  - Default policy: `OK-to-default`  
  - Scope: `per_instance`  
  - Output owner: `Chip` param (`{{material}}`).

- **Finishing: occlusion check / polish**  
  - Capture: `DICT` → else optional `STD`  
  - Default policy: `Default-as-proposal` (only if practice truly wants it documented by default)  
  - Scope: `per_instance`  
  - Output owner: `Chip`.

- **Mehrkostenvereinbarung (MKV) contract**  
  - Capture: `Contract context` + `ASK` (confirm / amount / justification)  
  - Default policy: `Never default`  
  - Scope: `global` (sometimes per_instance if multi-treatment)  
  - Output owner: `Disclosure` (MKV statement) + `Chip` for justification (facts-driven).

## 2.2 Endodontics (Endo)

- **Endo diagnosis (pulpitis/necrosis/apical periodontitis/…)**  
  - Capture: `DICT` → else `ASK` when endo procedure is chosen but diagnosis is missing  
  - Default policy: `Never default`  
  - Scope: `per_instance`  
  - Output owner: `Befund` (+ optional chips that reference the diagnosis context).

- **Rubber dam (Kofferdam)**  
  - Capture: `DICT` OR `STD`  
  - Default policy: `Default-as-proposal` (confirm if not dictated)  
  - Scope: `per_instance`  
  - Output owner: `Chip`.

- **Working length method (WL)** *(Settings default exists in V10)*  
  - Capture: `STD` → else `ASK`  
  - Default policy: `OK-to-default`  
  - Scope: `per_instance`  
  - Output owner: `Chip`.

- **Instrumentation technique (WF / canal preparation)** *(Settings default exists in V10)*  
  - Capture: `STD` → else `ASK`  
  - Default policy: `OK-to-default`  
  - Scope: `per_instance`  
  - Output owner: `Chip`.

- **Irrigation protocol / solutions** *(Settings default exists in V10)*  
  - Capture: `STD` → else `ASK`  
  - Default policy: `OK-to-default`  
  - Scope: `per_instance`  
  - Output owner: `Chip`.

- **Interappointment medication (Einlage)** *(Settings default exists in V10)*  
  - Capture: `STD` → else `ASK` when multi-visit implied  
  - Default policy: `OK-to-default`  
  - Scope: `per_instance`  
  - Output owner: `Chip`.

- **Canal count treated** *(Settings default exists in V10)*  
  - Capture: `DICT` → else `STD` → else `ASK`  
  - Default policy: `OK-to-default` (only if the practice uses stable defaults; otherwise ask)  
  - Scope: `per_instance`  
  - Output owner: `Chip` (billing multiplicity).

- **Obturation technique (warm/cold/single cone)** *(Settings default exists in V10)*  
  - Capture: `STD` → else `ASK`  
  - Default policy: `OK-to-default`  
  - Scope: `per_instance`  
  - Output owner: `Chip`.

- **Radiographs (pre-op / WL / post-op)**  
  - Capture: `DICT` → else `ASK` when required by the practice/contract  
  - Default policy: `Never default`  
  - Scope: `per_instance`  
  - Output owner: `Befund`.

## 2.3 Extraction / surgery

- **Indication for extraction**  
  - Capture: `DICT` → else `ASK` when extraction is selected without indication  
  - Default policy: `Never default`  
  - Scope: `per_instance`  
  - Output owner: `Befund`.

- **Surgical complexity (simple vs flap/osteotomy/sectioning)**  
  - Capture: `DICT` → else `ASK` when billing path depends on it  
  - Default policy: `Never default`  
  - Scope: `per_instance`  
  - Output owner: `Chip` + constraints.

- **Wound closure (suture material / hemostatic measures)**  
  - Capture: `DICT` → else `STD` (if always used) → else `ASK`  
  - Default policy: `Default-as-proposal`  
  - Scope: `per_instance`  
  - Output owner: `Chip`.

- **Post-op instructions (bleeding/swelling/pain)**  
  - Capture: `STD` (text) gated by extraction facts  
  - Default policy: `OK-to-default` for text; `Never default` for asserting it was delivered  
  - Scope: `global`  
  - Output owner: `Disclosure`.

## 2.4 Prophylaxis / PZR

- **Indication / scope (full mouth vs localized)**  
  - Capture: `DICT` → else `ASK`  
  - Default policy: `Never default`  
  - Scope: `global` or `per_instance` (depending on model)  
  - Output owner: `Chip`.

- **Measures performed (scaling/polishing/fluoride/CHX)**  
  - Capture: `DICT` → else `STD` (practice protocol) → else `ASK`  
  - Default policy: `Default-as-proposal`  
  - Scope: `global`  
  - Output owner: `Chip`.

- **Local fluoridation (IP 4) “high caries risk” justification (when 2×/half-year)**  
  - Capture: `DICT` → else `ASK` **only** if the billing branch requires the “high caries risk” condition  
  - Default policy: `Never default`  
  - Scope: `global`  
  - Output owner: `Befund`/evidence line (Facts) + `Chip` (billing ref).  
  - Notes: Keep this out of the critical path unless the second IP4 is actually being claimed.

## 2.5 Crown preparation

- **Indication (caries/defect/fracture/prosthetic reason)**  
  - Capture: `DICT` → else `ASK`  
  - Default policy: `Never default`  
  - Scope: `per_instance`  
  - Output owner: `Befund`.

- **Impression method (digital / conventional)**  
  - Capture: `DICT` → else `STD` → else `ASK`  
  - Default policy: `OK-to-default`  
  - Scope: `per_instance`  
  - Output owner: `Chip`.

- **Provisional (placed yes/no + material)**  
  - Capture: `DICT` → else `ASK` when expected by the treatment graph  
  - Default policy: `Never default`  
  - Scope: `per_instance`  
  - Output owner: `Chip`.

---

# 3) Default vs Askback decision rules (proposed)

1) **Normalize DICT → Facts** (with provenance).  
2) If a Procedure node requires a Fact:
   - If Fact is unknown: apply `STD` defaults **only for OK-to-default** items.
   - If still unknown: emit `ASK` askback(s).
3) **Never turn “medical implausibility” into an error** if it can be resolved by clarification:
   - Prefer an askback (“Confirm / choose / explain”) over BLOCKing the pipeline.
   - Reserve hard BLOCK only for true legal/combinability violations that cannot be clarified.

## Askback minimization (KZV-proof without annoyance)

Goal: the user should only be asked questions that prevent one of these three failures:

1) **Billing defensibility failure** (e.g., a billing path depends on a fact that is unknown).  
2) **Evidence fabrication risk** (e.g., a template would print a material/technique that we did not actually know).  
3) **Quality review evidence gap** for the *specific* triggered event (e.g., Cp/P should capture at least a minimal evidence set if the practice runs “strict KZV mode”).

Proposed rule set:

- **Settings may provide defaults**, but only for “OK-to-default” facts, and only as `provenance=STD` (never “performed” unless dictated/confirmed).  
- **TextLength gates evidence**:
  - `kurz`: ask only (1) + (2).
  - `mittel`: ask (1) + (2) + selected (3) “high value” evidence items.
  - `lang/forensic`: ask (1) + (2) + the full (3) evidence set for the triggered event(s).
- **Batch questions by event** (one “cluster” per tooth/instance), not one-off random asks.
- **Always offer an explicit “unknown / not documented” choice** for evidence-only asks so the flow can proceed without errors (and the output simply omits that evidence line).

Concrete examples (v1):

- **Indirect vs direct pulp capping (Cp vs P)**  
  - Required to avoid wrong emission: `pulpaOpened` (direct only if true), `capping.type` (direct/indirect), `capping.material` (OK-to-default from Settings).  
  - Evidence (strict mode): `vipr.performed + result`, `radiograph.present`, `anamnesis.symptoms`.  
  - If “very deep” is dictated but type is unknown → askback: “Indirekt überkappt?” (sets Facts, procedure decides Cp chip).

- **MKV contract**  
  - Required: `contract.mkv.enabled`, `contract.mkv.confirmed`, `contract.mkv.onlyKasse`, and if Mehrkosten: `contract.mkv.amount` + `contract.mkv.justification`.  
  - Evidence: `contract.mkv.signed` (yes/no/unknown), `contract.mkv.copyHandedOut` (yes/no/unknown).  
  - Ask once per session (global), never per tooth.

- **Endo in GKV (molars)**  
  - If tooth is molar + insurance=GKV + endo path selected: ask a single “eligibility” question (sets Facts).  
  - If not eligible: do not hard-error; route to a clarifying askback (“Privat/Analog?” or “Nur Befund/Plan?” depending on product policy).

---

# 4) Where this plugs into V10

- **Facts**: `src/docudent/v10/facts/*`
- **Settings defaults**: `src/docudent/v10/settings/*` → populate Facts (with provenance)
- **Askbacks**: `src/docudent/v10/askbacks/*` (Facts-only)
- **Procedure nodes / bundles**: `src/docudent/v10/procedure/*` and `src/docudent/core/billing/knowledgeBase/event_bundles/*`
- **Output contract + sources**:
  - KZV-oriented output notes: `docs/system-atlas/output/kzv-output-text-research.md`
  - Medical source SSOT: `docs/medical/sources/sources.v1.yaml`
