# Treatment Evidence Matrix v1

Prepared: 2026-02-16  
Status: Baseline matrix for obligations and askback design.  
Rule: Every obligation added to code must reference at least one source anchor from this matrix.

## 1) Core Source Set

Regulatory/Billing:
- G-BA Behandlungsrichtlinie: https://www.g-ba.de/richtlinien/32/
- G-BA PAR-Richtlinie: https://www.g-ba.de/richtlinien/124/
- G-BA Individualprophylaxe-Richtlinie: https://www.g-ba.de/richtlinien/31/
- G-BA Festzuschuss-Richtlinie: https://www.g-ba.de/richtlinien/27/
- KZBV BEMA/GOZ entry point: https://www.kzbv.de/zahnaerzte/rechtsgrundlagen/bema-und-goz/gebuehrenverzeichnisse/
- GOZ text: https://www.gesetze-im-internet.de/goz_1987/
- SGB V Section 28: https://www.gesetze-im-internet.de/sgb_5/__28.html
- SGB V Section 55: https://www.gesetze-im-internet.de/sgb_5/__55.html

Clinical:
- Direct composites (AWMF): https://www.awmf.org/aktuelles-und-angebot/awmf-aktuell/direkte-kompositrestaurationen-an-bleibenden-zaehnen-im-front-und-seitenzahnbereich
- Fissure sealants (AWMF): https://www.awmf.org/service/awmf-aktuell/fissuren-und-gruebchenversiegelung-1
- Trauma (AWMF): https://www.awmf.org/service/awmf-aktuell/therapie-des-dentalen-traumas-bleibender-zaehne
- WSR (AWMF): https://www.awmf.org/aktuelles-und-angebot/awmf-aktuell/wurzelspitzenresektion
- Caries prevention (AWMF): https://www.awmf.org/service/awmf-aktuell/kariespraevention-bei-bleibenden-zaehnen-grundlegende-empfehlungen-1
- Peri-implant infections (AWMF): https://www.awmf.org/service/awmf-aktuell/die-behandlung-periimplantaerer-infektionen-an-zahnimplantaten
- Implant timing (AWMF): https://www.awmf.org/service/awmf-aktuell/implantationszeitpunkte

## 2) Matrix (20 Treatments)

| Treatment ID | Regulatory/billing anchors | Clinical anchors | Obligations that must exist in code |
|---|---|---|---|
| `fuellung` | Behandlungsrichtlinie, BEMA/GOZ catalogs, SGB V 28 | Direct composites | depth/material/isolation, cp/p evidence, MKV rationale |
| `endo` | Behandlungsrichtlinie, BEMA/GOZ catalogs | Endo-relevant evidence flow | diagnosis-step coherence, WL evidence, irrigation/obturation evidence |
| `extraction` | Behandlungsrichtlinie, BEMA/GOZ catalogs | Oral surgery standard care | indication, anesthesia path, wound care/follow-up |
| `crown_prep` | Festzuschuss-Richtlinie, BEMA/GOZ catalogs, SGB V 55 | restorative/prosthetic standards | prep-impression-provisional sequence evidence |
| `pzr` | Individualprophylaxe-Richtlinie, BEMA/GOZ catalogs | prevention recommendations | hygiene status, performed preventive steps, recall hints |
| `ueberkappung` | KZBV BEMA (`25` indirekt, `26` direkt), GOZ (`2330` indirekt, `2340` direkt) | direct restorative guidance | direct vs indirect path, material, pulp status |
| `fissurenversiegelung` | KZBV BEMA (`IP5` Fissurenversiegelung), GOZ (`2000` Fissurenversiegelung) | fissure sealants guideline | indication eligibility, tooth/surface, post-op recommendation |
| `parodontologie` | PAR-Richtlinie (KZBV), BEMA (`04`, `AIT`, `UPTa/b/c`), GOZ (`4000`, `4070/4075`) | periodontology guidance | PSI/baseline, staged PAR evidence, reevaluation |
| `upt` | PAR-Richtlinie (KZBV/G-BA), BEMA (`UPTa/b/c`) | periodontology maintenance guidance | risk-based interval, performed maintenance blocks |
| `wsr` | KZBV BEMA 2026 (`54`, `55`, `WR1`, `WR2`), GOZ Anlage 1 (`3110`, `3120`) | AWMF S2k Wurzelspitzenresektion (083-025) | indication, imaging basis, surgical access (`trepaniert` vs `osteotomie`), tooth-group documentation (front/praemolar vs molar) |
| `trauma` | KZBV BEMA 2026 (`100` semipermanente Schienung), GOZ Anlage 1 (`7070` semipermanente Schiene) | AWMF Leitlinie 083-004 (Dentales Trauma bleibender Zähne) | trauma class, Schienungsentscheidung, immediate interventions, follow-up plan |
| `implant` | GOZ Anlage 1 (`9000` Implantatinsertion, `9040` Freilegung), BEMA-Systematik (GKV außerhalb Regelversorgung) | AWMF Implantationszeitpunkte + AWMF periimplantäre Infektionen | indication, consent context, surgical/prosthetic phase evidence |
| `krone` | Festzuschuss-Richtlinie, BEMA/GOZ catalogs, SGB V 55 | prosthetic standards | indication, prep, impression, insertion documentation |
| `teilkrone` | Festzuschuss-Richtlinie, KZBV/KZV BEMA (`20c`, `19`) und GOZ (`2220`, `2260`, `5180`), SGB V 55 | prosthetic standards | conservative preparation rationale and insertion chain |
| `bruecke` | GOZ Anlage 1 (`5070`, `5120`), Festzuschuss-Richtlinie, SGB V 55 | AWMF 083-003 (festsitzender Zahnersatz) | Brueckenart (definitiv/provisorisch), Eingliederung, Verlaufskontrolle |
| `teilprothese` | BZAEK GOZ-Kommentar `5200` (Interimsteilprothese), BZAEK GOZ-Kommentar `5210` (Modellgussprothese), KZBV Gebührenverzeichnisse, G-BA Festzuschuss-Richtlinie | removable prosthetic standards | type split (`interim` vs `modellguss`), insertion evidence, pressure-point/adaptation follow-up |
| `totalprothese` | BZAEK GOZ-Kommentar `5220` (Totalprothese), BZAEK GOZ-Kommentar `5230` (Immediatprothese), KZBV Gebührenverzeichnisse, G-BA Festzuschuss-Richtlinie | removable prosthetic standards | type split (`konventionell` vs `immediat`), insertion evidence, adaptation/follow-up |
| `schiene` | KZBV BEMA 2026 Teil 2 (`K1/K2/K3/K6-K9`), GOZ Abschnitt H (`7000-7060`) | AWMF Leitlinie 083-027 (Okklusionsschienen) | indication, Schienentyp (Okklusions-/Protrusionsschiene), fitting/eingliederung, adjustment/follow-up evidence |
| `untersuchung` | KZBV BEMA (`01` eingehende Untersuchung), GOZ (`0010` eingehende Untersuchung) | baseline diagnostic standards | indication/anlass, baseline findings, assessment and recommendation basis |
| `roentgen` | KZBV BEMA (Ae925a intraoral, Ae935d OPG), GOAE Anlage O (5000 intraoral, 5004 Panoramaschicht) | diagnostic imaging standards | indication, modality (Einzelzahn/OPG), timing, documented finding and billing-ref mapping via DB |

## 3) Governance Rule for Engineering

For each new obligation in `obligations.v1.json`, require:
1. `sourceRef.sourceId` pointing to this matrix.
2. `sourceRef.anchorId` pointing to a concrete section or guideline anchor.
3. Gate failure if sourceRef is missing.

## 4) Open Medical QA Tasks

1. Confirm latest publication status and applicability per AWMF document before each treatment goes `active`.
2. Add precise anchor IDs (chapter/section) for each obligation during implementation.
3. Add a periodic review process for source freshness before release branches.
