## Medical KB emit_chip inventory (V10 migration)

**Status (2026-02-08):**
- V10 pipeline disables KB chip emission (`allowChipEmission=false`).
- V10 loads `medical_kb.v1.v10.json` (no `emit_chip` / `emitChips`).
- V10 uses `medicalKbV10` export from `src/docudent/medical_kb/index.ts`.
- Procedure nodes are SSOT for chip emission.
- Settings “standard chips” are still supported via `contract.standard_chips`.
- Legacy KB snapshot: `src/docudent/medical_kb/legacy/medical_kb.v1.legacy.json`

### Summary
- **KB rule emitters:** 48 `emit_chip` actions in `rules`
- **KB concept-case emitters:** 52 `emitChips` in `concept.cases`
- **Unique chip IDs emitted by KB:** 39
- **Procedure coverage:** 39/39 chips are already emitted by Procedure nodes

### Mapping (KB emitters → Procedure emitters)
| Chip | KB-Emitter (Regel/Konzept) | Procedure-Emitter |
|---|---|---|
| aufbau_postendo | concept:endo-post-buildup:postendo_aufbau<br/>rule:rule-endo-aufbau-postendo-emits-chip | endo.post_buildup |
| cp | concept:indirect-capping:indirect_cp<br/>rule:rule-ueberkappung-yes-emits-cp | fuellung.capping.indirect |
| cp_not_required | concept:indirect-capping:no_cp_not_required<br/>rule:rule-ueberkappung-no-emits-cp-not-required | fuellung.capping.not_required |
| einlage_caoh2 | concept:endo-medication:medication_caoh2<br/>rule:rule-endo-caoh2-emits-chip | endo.medication.caoh2 |
| exkavation | concept:caries-excavation:exkavation_performed<br/>rule:rule-fuellung-exkavation-emits-chip | fuellung.exkavation |
| finishing | concept:finishing-polishing:finishing_performed<br/>rule:rule-fuellung-finishing-emits-chip | fuellung.finishing |
| fluor | concept:fluoridation:fluor_applied<br/>rule:rule-fuellung-fluor-emits-chip | fuellung.fluor |
| fuellung_grundleistung | concept:fuellung-baseline:baseline<br/>rule:rule-fuellung-baseline | fuellung.baseline |
| fuellung_material_giz | concept:material-selection:material_giz<br/>rule:rule-material-giz-emits-chip | fuellung.material.giz |
| fuellung_material_komposit | concept:material-selection:material_komposit<br/>rule:rule-material-composite-emits-chip | fuellung.material.komposit |
| insurance_gkv_mkv | concept:billing-context:mkv_confirmed_emits_track<br/>rule:rule-mkv-confirmed-emits-insurance-chip | contract.mkv.insurance |
| kanalaufbereitung_1 | concept:endo-canal-preparation:canal_1<br/>rule:rule-endo-canal-1-emits-chip | endo.canal.count.1 |
| kanalaufbereitung_2 | concept:endo-canal-preparation:canal_2<br/>rule:rule-endo-canal-2-emits-chip | endo.canal.count.2 |
| kanalaufbereitung_3 | concept:endo-canal-preparation:canal_3<br/>rule:rule-endo-canal-3-emits-chip | endo.canal.count.3 |
| kanalaufbereitung_4 | concept:endo-canal-preparation:canal_4<br/>rule:rule-endo-canal-4-emits-chip | endo.canal.count.4 |
| kofferdam | concept:kofferdam:isolation_rubberdam<br/>concept:kofferdam:kofferdam_endo<br/>concept:kofferdam:kofferdam_fuellung<br/>concept:kofferdam:kofferdam_used<br/>rule:rule-endo-kofferdam-emits-chip<br/>rule:rule-fuellung-kofferdam-emits-chip<br/>rule:rule-isolation-rubberdam-emits-chip<br/>rule:rule-kofferdam-yes-emits-chip | common.isolation.kofferdam |
| komposit_basic | rule:rule-adhesive-no-emits-basic-filling | fuellung.tech.adhesive.basic |
| la_infiltr | concept:local-anesthesia-infiltration:infiltr_endo<br/>concept:local-anesthesia-infiltration:infiltr_fuellung<br/>concept:local-anesthesia-infiltration:infiltr_general<br/>rule:rule-endo-la-infiltr-emits-chip<br/>rule:rule-fuellung-la-infiltr-emits-chip | common.anesthesia.infiltration |
| la_leitung | concept:local-anesthesia-leitung:leitung_endo<br/>concept:local-anesthesia-leitung:leitung_fuellung<br/>concept:local-anesthesia-leitung:leitung_general<br/>rule:rule-endo-la-leitung-emits-chip<br/>rule:rule-fuellung-la-leitung-emits-chip | common.anesthesia.block |
| laengenmessung_elek | concept:working-length-measurement:wl_electronic<br/>rule:rule-endo-wl-elek-emits-chip | endo.wl.electronic |
| laengenmessung_roentgen | concept:working-length-measurement:wl_xray<br/>rule:rule-endo-wl-xray-emits-chip | endo.wl.xray |
| mehrschicht | concept:adhesive-technique:adhesive_yes_emits_mehrschicht<br/>concept:billing-context:mkv_mehrschicht_addon_adhesive<br/>concept:billing-context:mkv_mehrschicht_addon_layering<br/>concept:layering-technique:layering_yes_emits_mehrschicht<br/>rule:rule-adhesive-yes-emits-chip<br/>rule:rule-adhesive-yes-emits-filling-chips<br/>rule:rule-layering-yes-emits-chip<br/>rule:rule-mkv-mehrschicht-addon | fuellung.tech.adhesive.mehrschicht<br/>fuellung.tech.layering.mehrschicht |
| mkv_begruendung | concept:billing-context:mkv_justification_emits_doc | contract.mkv.justification |
| oberflaeche_la | concept:surface-anesthesia:surface_fuellung<br/>concept:surface-anesthesia:surface_general<br/>rule:rule-fuellung-oberflaeche-la-emits-chip<br/>rule:rule-surface-anesthesia-emits-chip | common.anesthesia.surface |
| p | concept:direct-capping:direct_p<br/>concept:direct-capping:direct_type<br/>rule:rule-fuellung-p-direct-capping-emits-chip<br/>rule:rule-ueberkappung-p-emits | fuellung.capping.direct |
| perk_neg | concept:percussion-test:perk_neg<br/>rule:rule-perk-neg-emits-chip | common.percussion.neg |
| perk_pos | concept:percussion-test:perk_pos<br/>rule:rule-perk-pos-emits-chip | common.percussion.pos |
| provisorischer_verschluss | concept:endo-temporary-closure:temp_closure | endo.temp_closure |
| rel_trocken | concept:kofferdam:isolation_relative<br/>concept:kofferdam:kofferdam_not_used<br/>rule:rule-isolation-relative-emits-chip<br/>rule:rule-kofferdam-no-emits-relative | common.isolation.relative |
| roentgen_einzelzahn | concept:endo-radiography:diagnostic_xray<br/>rule:rule-endo-roentgen-einzelzahn-emits-chip | endo.xray.diagnostic |
| roentgen_kontrolle | concept:endo-radiography:control_xray<br/>rule:rule-endo-roentgen-kontrolle-emits-chip | endo.xray.control |
| spuelung_edta | concept:endo-irrigation:irrigation_edta<br/>rule:rule-endo-edta-emits-chip | endo.irrigation.edta |
| spuelung_naocl | concept:endo-irrigation:irrigation_naocl<br/>rule:rule-endo-naocl-emits-chip | endo.irrigation.naocl |
| trepanation | concept:endo-trepanation:trepanation_step<br/>rule:rule-endo-trepanation-emits-chip | endo.trepanation |
| vipr_neg | concept:vitality-test:vipr_neg<br/>rule:rule-vipr-neg-emits-chip | common.vitality.neg |
| vipr_pos | concept:vitality-test:vipr_pos<br/>rule:rule-vipr-pos-emits-chip | common.vitality.pos |
| wf_einzel | concept:endo-obturation:wf_einzel<br/>rule:rule-endo-wf-einzel-emits-chip | endo.wf.einzel |
| wf_kalt | concept:endo-obturation:wf_kalt<br/>concept:endo-obturation:wf_kalt_default<br/>rule:rule-endo-wf-kalt-emits-chip | endo.wf.kalt |
| wf_warm | concept:endo-obturation:wf_warm<br/>rule:rule-endo-wf-warm-emits-chip | endo.wf.warm |

### Nächste Schritte (Migration)
1) **KB emit_chip Regeln in V10 endgültig entfernen oder in `/legacy` verschieben.**  
   V10 nutzt Procedure Nodes als SSOT; KB bleibt Askback/Default‑Quelle.
2) **Procedure Nodes bleiben Owner der Chip‑Emission** (inkl. MKV‑Begründung, Anästhesie, Kofferdam, Endo‑Steps).
3) **Settings‑Chips** weiter **nur über `contract.standard_chips`** emittieren (nie über KB/QuestionBank).
4) **Gate beibehalten:** KB‑Emissionen bleiben in V10 deaktiviert.
