# Audit.Concepts (V10)

**Generated:** 2026-02-08
**Sources:**
- src/docudent/medical_kb/medical_kb.v1.json
- src/docudent/core/billing/knowledgeBase/treatments/*/unified.json
- src/docudent/core/billing/knowledgeBase/questions/*.json
- src/docudent/core/billing/knowledgeBase/treatments/*/question_bank.json
- src/docudent/core/billing/knowledgeBase/treatments/*/answer_map.json
- src/docudent/core/billing/knowledgeBase/mappings/*_answer_map.json

## Summary
- Concepts: 31
- Concept cases: 71
- Concept-emitted chips: 38
- Rule-emitted chips (legacy): 48
- Askbacks (new): 13
- Askbacks (legacy endoAskbacks): 9
- Askbacks with chipEffect: 5
- Question bank chipActivation: 5
- AlwaysOn chipIds (answer_map): 12
- Medical KB chip definitions: 16
- Unified chips: 68

## Gaps: Emitted chip IDs missing Medical KB chip definitions
| chipId | sources |
| --- | --- |
| p | concept, concept, rule:rule-ueberkappung-p-emits, rule:rule-fuellung-p-direct-capping-emits-chip |
| fluor | concept, rule:rule-fuellung-fluor-emits-chip |
| fuellung_grundleistung | concept, rule:rule-fuellung-baseline |
| insurance_gkv_mkv | concept, rule:rule-mkv-confirmed-emits-insurance-chip, askback:askback-mkv-confirmed.yes |
| mkv_begruendung | concept |
| mehrschicht | concept, concept, concept, concept, rule:rule-mkv-mehrschicht-addon, rule:rule-adhesive-yes-emits-filling-chips, rule:rule-adhesive-yes-emits-chip, rule:rule-layering-yes-emits-chip, askback:askback-adhesive-technique.yes, question:mehrschicht, question:adhasiv, question:mehrschicht, question:adhasiv |
| fuellung_material_komposit | concept, rule:rule-material-composite-emits-chip |
| fuellung_material_giz | concept, rule:rule-material-giz-emits-chip |
| la_infiltr | concept, concept, concept, rule:rule-endo-la-infiltr-emits-chip, rule:rule-fuellung-la-infiltr-emits-chip |
| la_leitung | concept, concept, concept, rule:rule-endo-la-leitung-emits-chip, rule:rule-fuellung-la-leitung-emits-chip |
| kofferdam | concept, concept, concept, concept, rule:rule-endo-kofferdam-emits-chip, rule:rule-fuellung-kofferdam-emits-chip, rule:rule-kofferdam-yes-emits-chip, rule:rule-isolation-rubberdam-emits-chip, askback:askback-kofferdam.yes |
| rel_trocken | concept, concept, rule:rule-kofferdam-no-emits-relative, rule:rule-isolation-relative-emits-chip, askback:askback-kofferdam.no |
| laengenmessung_elek | concept, rule:rule-endo-wl-elek-emits-chip |
| laengenmessung_roentgen | concept, rule:rule-endo-wl-xray-emits-chip |
| kanalaufbereitung_1 | concept, rule:rule-endo-canal-1-emits-chip |
| kanalaufbereitung_2 | concept, rule:rule-endo-canal-2-emits-chip |
| kanalaufbereitung_3 | concept, rule:rule-endo-canal-3-emits-chip |
| kanalaufbereitung_4 | concept, rule:rule-endo-canal-4-emits-chip |
| spuelung_naocl | concept, rule:rule-endo-naocl-emits-chip, alwaysOn:src/docudent/core/billing/knowledgeBase/mappings/endo_answer_map.json |
| spuelung_edta | concept, rule:rule-endo-edta-emits-chip |
| einlage_caoh2 | concept, rule:rule-endo-caoh2-emits-chip |
| provisorischer_verschluss | concept |
| wf_warm | concept, rule:rule-endo-wf-warm-emits-chip |
| wf_einzel | concept, rule:rule-endo-wf-einzel-emits-chip |
| wf_kalt | concept, concept, rule:rule-endo-wf-kalt-emits-chip |
| roentgen_einzelzahn | concept, rule:rule-endo-roentgen-einzelzahn-emits-chip |
| roentgen_kontrolle | concept, rule:rule-endo-roentgen-kontrolle-emits-chip |
| aufbau_postendo | concept, rule:rule-endo-aufbau-postendo-emits-chip |
| trepanation | concept, rule:rule-endo-trepanation-emits-chip |
| komposit_basic | rule:rule-adhesive-no-emits-basic-filling, askback:askback-adhesive-technique.no, alwaysOn:src/docudent/core/billing/knowledgeBase/treatments/fuellung/answer_map.json, alwaysOn:src/docudent/core/billing/knowledgeBase/mappings/fuellung_answer_map.json |
| optisch_elektronisch | question:optisch_elektronisch |
| praeparation | alwaysOn:src/docudent/core/billing/knowledgeBase/treatments/crown_prep/answer_map.json |
| abformung | alwaysOn:src/docudent/core/billing/knowledgeBase/treatments/crown_prep/answer_map.json |
| provisorium | alwaysOn:src/docudent/core/billing/knowledgeBase/treatments/crown_prep/answer_map.json |
| extraktion_einfach | alwaysOn:src/docudent/core/billing/knowledgeBase/treatments/extraction/answer_map.json |
| pzr_vollstaendig | alwaysOn:src/docudent/core/billing/knowledgeBase/treatments/pzr/answer_map.json |

## Gaps: Medical KB chips missing in unified.json
| kbChipId | chipId | treatmentScope |
| --- | --- | --- |
| chip-endo-kofferdam | endo_kofferdam | endo |
| chip-endo-trepanation | endo_trepanation | endo |
| chip-endo-wl | endo_wl | endo |
| chip-endo-preparation | endo_preparation | endo |
| chip-endo-irrigation | endo_irrigation | endo |
| chip-endo-medication | endo_medication | endo |
| chip-endo-obturation | endo_obturation | endo |

## Gaps: Unified chips without concept/rule emitters
| treatment | chipId | phase | category |
| --- | --- | --- | --- |
| crown_prep | praeparation | behandlung | — |
| crown_prep | abformung | behandlung | — |
| crown_prep | provisorium | nachsorge | — |
| extraction | extraktion_einfach | behandlung | — |
| extraction | wundversorgung | nachsorge | — |
| fuellung | la_ila | anaesthesie | dokumentation |
| fuellung | fuellung_material_adhesive | vorbereitung | material |
| fuellung | fuellung_material_etch | vorbereitung | material |
| fuellung | fuellung_material_matrix | vorbereitung | material |
| fuellung | fuellung_material_flowable | fuellung | material |
| fuellung | fuellung_material_bulk | fuellung | material |
| fuellung | doc_aufklaerung | doku | doku |
| fuellung | doc_alternativen | doku | doku |
| fuellung | doc_risiken | doku | doku |
| fuellung | doc_einverstaendnis | doku | doku |
| fuellung | doc_okklusion | finishing | doku |
| fuellung | doc_politur | finishing | doku |
| fuellung | optisch_elektronisch | doku | doku |
| pzr | pzr_vollstaendig | behandlung | — |
| pzr | zahnstein_entfernung | behandlung | — |
| pzr | fluoridierung | nachsorge | — |

## Concepts Inventory (concept cases)
| conceptId | caseId | emitChips | requiredAskbacks | optionalAskbacks |
| --- | --- | --- | --- | --- |
| indirect-capping | decision_required | — | medical_ueberkappung | — |
| indirect-capping | material_required | — | medical_ueberkappung_material | — |
| indirect-capping | indirect_cp | cp | — | — |
| indirect-capping | no_cp_not_required | cp_not_required | — | — |
| direct-capping | decision_required | — | medical_ueberkappung | — |
| direct-capping | material_required | — | medical_ueberkappung_material | — |
| direct-capping | direct_p | p | — | — |
| direct-capping | direct_type | p | — | — |
| pulpa-protection | deep_caries_askback | — | fuellung_pulpaschutz | — |
| bleeding-excav | hemostasis_required | — | medical_hemostasis | — |
| postop-sensitivity | sensitivity_followup_required | — | medical_sensitivity_followup | — |
| fluoridation | fluor_applied | fluor | — | — |
| fuellung-baseline | baseline | fuellung_grundleistung | — | — |
| billing-context | insurance_context_unknown | — | — | fuellung_insurance_context |
| billing-context | mkv_required_side_composite | — | medical_mkv_confirmed | — |
| billing-context | mkv_justification_required | — | fuellung_mkv_justification | — |
| billing-context | mkv_confirmed_emits_track | insurance_gkv_mkv | — | — |
| billing-context | mkv_justification_emits_doc | mkv_begruendung | — | — |
| billing-context | mkv_mehrschicht_addon_layering | mehrschicht | — | — |
| billing-context | mkv_mehrschicht_addon_adhesive | mehrschicht | — | — |
| material-selection | material_unknown | — | fuellung_material | — |
| material-selection | material_komposit | fuellung_material_komposit | — | — |
| material-selection | material_giz | fuellung_material_giz | — | — |
| local-anesthesia-infiltration | infiltr_fuellung | la_infiltr | — | — |
| local-anesthesia-infiltration | infiltr_endo | la_infiltr | — | — |
| local-anesthesia-infiltration | infiltr_general | la_infiltr | — | — |
| local-anesthesia-leitung | leitung_fuellung | la_leitung | — | — |
| local-anesthesia-leitung | leitung_endo | la_leitung | — | — |
| local-anesthesia-leitung | leitung_general | la_leitung | — | — |
| surface-anesthesia | surface_general | oberflaeche_la | — | — |
| surface-anesthesia | surface_fuellung | oberflaeche_la | — | — |
| kofferdam | kofferdam_used | kofferdam | — | — |
| kofferdam | kofferdam_not_used | rel_trocken | — | — |
| kofferdam | kofferdam_askback | — | — | medical_kofferdam |
| kofferdam | kofferdam_required_endo | — | medical_endo_kofferdam | — |
| kofferdam | kofferdam_endo | kofferdam | — | — |
| kofferdam | kofferdam_fuellung | kofferdam | — | — |
| kofferdam | isolation_unknown_askback | — | fuellung_isolation | — |
| kofferdam | isolation_rubberdam | kofferdam | — | — |
| kofferdam | isolation_relative | rel_trocken | — | — |
| adhesive-technique | adhesive_mkv_required | — | medical_adhesive_technique | — |
| adhesive-technique | adhesive_unknown_composite | — | fuellung_adhesive | — |
| adhesive-technique | adhesive_yes_emits_mehrschicht | mehrschicht | — | — |
| layering-technique | layering_unknown_medium_large | — | fuellung_layering | — |
| layering-technique | layering_yes_emits_mehrschicht | mehrschicht | — | — |
| caries-excavation | exkavation_performed | exkavation | — | — |
| finishing-polishing | finishing_performed | finishing | — | — |
| vitality-test | vipr_pos | vipr_pos | — | — |
| vitality-test | vipr_neg | vipr_neg | — | — |
| percussion-test | perk_pos | perk_pos | — | — |
| percussion-test | perk_neg | perk_neg | — | — |
| working-length-measurement | wl_method_required | — | medical_endo_wl_method | — |
| working-length-measurement | wl_electronic | laengenmessung_elek | — | — |
| working-length-measurement | wl_xray | laengenmessung_roentgen | — | — |
| endo-canal-preparation | canal_1 | kanalaufbereitung_1 | — | — |
| endo-canal-preparation | canal_2 | kanalaufbereitung_2 | — | — |
| endo-canal-preparation | canal_3 | kanalaufbereitung_3 | — | — |
| endo-canal-preparation | canal_4 | kanalaufbereitung_4 | — | — |
| endo-irrigation | irrigation_required | — | medical_endo_irrigation | — |
| endo-irrigation | irrigation_naocl | spuelung_naocl | — | — |
| endo-irrigation | irrigation_edta | spuelung_edta | — | — |
| endo-medication | medication_caoh2 | einlage_caoh2 | — | — |
| endo-temporary-closure | temp_closure | provisorischer_verschluss | — | — |
| endo-obturation | wf_warm | wf_warm | — | — |
| endo-obturation | wf_einzel | wf_einzel | — | — |
| endo-obturation | wf_kalt | wf_kalt | — | — |
| endo-obturation | wf_kalt_default | wf_kalt | — | — |
| endo-radiography | diagnostic_xray | roentgen_einzelzahn | — | — |
| endo-radiography | control_xray | roentgen_kontrolle | — | — |
| endo-post-buildup | postendo_aufbau | aufbau_postendo | — | — |
| endo-trepanation | trepanation_step | trepanation | — | — |

## Concept cases without emitChips
- caries-profunda
- indirect-capping:decision_required
- indirect-capping:material_required
- direct-capping:decision_required
- direct-capping:material_required
- pulpitis-risk
- pulpa-protection:deep_caries_askback
- bleeding-excav:hemostasis_required
- postop-sensitivity:sensitivity_followup_required
- billing-context:insurance_context_unknown
- billing-context:mkv_required_side_composite
- billing-context:mkv_justification_required
- material-selection:material_unknown
- kofferdam:kofferdam_askback
- kofferdam:kofferdam_required_endo
- kofferdam:isolation_unknown_askback
- relative-isolation
- adhesive-technique:adhesive_mkv_required
- adhesive-technique:adhesive_unknown_composite
- layering-technique:layering_unknown_medium_large
- working-length-measurement:wl_method_required
- endo-irrigation:irrigation_required

## Legacy emitters: medical_kb.rules (emit_chip)
| ruleId | chipId |
| --- | --- |
| rule-fuellung-baseline | fuellung_grundleistung |
| rule-mkv-mehrschicht-addon | mehrschicht |
| rule-ueberkappung-yes-emits-cp | cp |
| rule-ueberkappung-p-emits | p |
| rule-ueberkappung-no-emits-cp-not-required | cp_not_required |
| rule-endo-trepanation-emits-chip | trepanation |
| rule-endo-kofferdam-emits-chip | kofferdam |
| rule-endo-wl-elek-emits-chip | laengenmessung_elek |
| rule-endo-wl-xray-emits-chip | laengenmessung_roentgen |
| rule-endo-canal-1-emits-chip | kanalaufbereitung_1 |
| rule-endo-canal-2-emits-chip | kanalaufbereitung_2 |
| rule-endo-canal-3-emits-chip | kanalaufbereitung_3 |
| rule-endo-canal-4-emits-chip | kanalaufbereitung_4 |
| rule-endo-naocl-emits-chip | spuelung_naocl |
| rule-endo-edta-emits-chip | spuelung_edta |
| rule-endo-caoh2-emits-chip | einlage_caoh2 |
| rule-endo-wf-kalt-emits-chip | wf_kalt |
| rule-endo-roentgen-kontrolle-emits-chip | roentgen_kontrolle |
| rule-endo-la-leitung-emits-chip | la_leitung |
| rule-endo-la-infiltr-emits-chip | la_infiltr |
| rule-endo-wf-warm-emits-chip | wf_warm |
| rule-endo-wf-einzel-emits-chip | wf_einzel |
| rule-endo-roentgen-einzelzahn-emits-chip | roentgen_einzelzahn |
| rule-endo-aufbau-postendo-emits-chip | aufbau_postendo |
| rule-fuellung-la-leitung-emits-chip | la_leitung |
| rule-fuellung-la-infiltr-emits-chip | la_infiltr |
| rule-fuellung-oberflaeche-la-emits-chip | oberflaeche_la |
| rule-fuellung-kofferdam-emits-chip | kofferdam |
| rule-fuellung-p-direct-capping-emits-chip | p |
| rule-fuellung-fluor-emits-chip | fluor |
| rule-fuellung-exkavation-emits-chip | exkavation |
| rule-fuellung-finishing-emits-chip | finishing |
| rule-surface-anesthesia-emits-chip | oberflaeche_la |
| rule-vipr-pos-emits-chip | vipr_pos |
| rule-vipr-neg-emits-chip | vipr_neg |
| rule-perk-pos-emits-chip | perk_pos |
| rule-perk-neg-emits-chip | perk_neg |
| rule-adhesive-yes-emits-filling-chips | mehrschicht |
| rule-adhesive-no-emits-basic-filling | komposit_basic |
| rule-kofferdam-yes-emits-chip | kofferdam |
| rule-kofferdam-no-emits-relative | rel_trocken |
| rule-mkv-confirmed-emits-insurance-chip | insurance_gkv_mkv |
| rule-material-composite-emits-chip | fuellung_material_komposit |
| rule-material-giz-emits-chip | fuellung_material_giz |
| rule-isolation-rubberdam-emits-chip | kofferdam |
| rule-isolation-relative-emits-chip | rel_trocken |
| rule-adhesive-yes-emits-chip | mehrschicht |
| rule-layering-yes-emits-chip | mehrschicht |

## Askbacks with chipEffect (non-concept chip activation)
| askbackId | option | chipId | source |
| --- | --- | --- | --- |
| askback-mkv-confirmed | yes | insurance_gkv_mkv | endoAskbacks |
| askback-adhesive-technique | yes | mehrschicht | endoAskbacks |
| askback-adhesive-technique | no | komposit_basic | endoAskbacks |
| askback-kofferdam | yes | kofferdam | endoAskbacks |
| askback-kofferdam | no | rel_trocken | endoAskbacks |

## Question bank chipActivation (non-concept chip activation)
| questionKey | option | chipId | file |
| --- | --- | --- | --- |
| mehrschicht | yes | mehrschicht | src/docudent/core/billing/knowledgeBase/questions/fuellung_question_bank.json |
| adhasiv | yes | mehrschicht | src/docudent/core/billing/knowledgeBase/questions/fuellung_question_bank.json |
| optisch_elektronisch | yes | optisch_elektronisch | src/docudent/core/billing/knowledgeBase/questions/fuellung_question_bank.json |
| mehrschicht | yes | mehrschicht | src/docudent/core/billing/knowledgeBase/treatments/fuellung/question_bank.json |
| adhasiv | yes | mehrschicht | src/docudent/core/billing/knowledgeBase/treatments/fuellung/question_bank.json |

## alwaysOnChipIds (answer_map defaults)
| chipId | source |
| --- | --- |
| praeparation | src/docudent/core/billing/knowledgeBase/treatments/crown_prep/answer_map.json |
| abformung | src/docudent/core/billing/knowledgeBase/treatments/crown_prep/answer_map.json |
| provisorium | src/docudent/core/billing/knowledgeBase/treatments/crown_prep/answer_map.json |
| extraktion_einfach | src/docudent/core/billing/knowledgeBase/treatments/extraction/answer_map.json |
| exkavation | src/docudent/core/billing/knowledgeBase/treatments/fuellung/answer_map.json |
| komposit_basic | src/docudent/core/billing/knowledgeBase/treatments/fuellung/answer_map.json |
| finishing | src/docudent/core/billing/knowledgeBase/treatments/fuellung/answer_map.json |
| pzr_vollstaendig | src/docudent/core/billing/knowledgeBase/treatments/pzr/answer_map.json |
| spuelung_naocl | src/docudent/core/billing/knowledgeBase/mappings/endo_answer_map.json |
| exkavation | src/docudent/core/billing/knowledgeBase/mappings/fuellung_answer_map.json |
| komposit_basic | src/docudent/core/billing/knowledgeBase/mappings/fuellung_answer_map.json |
| finishing | src/docudent/core/billing/knowledgeBase/mappings/fuellung_answer_map.json |

## Askbacks defined but never emitted
| askbackId |
| --- |
| askback-ueberkappung |
| askback-ueberkappung-material |
| askback-hemostasis |
| askback-sensitivity-followup |
| askback-kofferdam |
| askback-mkv-confirmed |
| askback-mkv-justification |
| askback-layering |
| askback-pulpaschutz |
| askback-adhesive-technique |
| askback-material |
| askback-isolation |
| askback-la-type |

## Legacy endoAskbacks defined but never emitted
| askbackId |
| --- |
| askback-endo-kofferdam |
| askback-endo-wl-method |
| askback-endo-irrigation |
| askback-endo-medication |
| askback-endo-obturation-technique |
| askback-endo-canal-count |
| askback-mkv-confirmed |
| askback-adhesive-technique |
| askback-kofferdam |

## Unified chips missing textSnippets
- None

## Unified chips missing billingRef
| treatment | chipId | phase | category |
| --- | --- | --- | --- |
| endo | vipr_pos | befund | befund |
| endo | vipr_neg | befund | befund |
| endo | perk_neg | befund | befund |
| endo | perk_pos | befund | befund |
| endo | spuelung_naocl | spuelung | leistung |
| endo | spuelung_edta | spuelung | leistung |
| endo | provisorischer_verschluss | einlage | leistung |
| fuellung | fuellung_grundleistung | fuellung | leistung |
| fuellung | vipr_pos | befund | befund |
| fuellung | vipr_neg | befund | befund |
| fuellung | perk_neg | befund | befund |
| fuellung | perk_pos | befund | befund |
| fuellung | la_ila | anaesthesie | dokumentation |
| fuellung | rel_trocken | vorbereitung | leistung |
| fuellung | exkavation | exkavation | leistung |
| fuellung | cp_not_required | ueberkappung | leistung |
| fuellung | komposit_basic | fuellung | leistung |
| fuellung | finishing | finishing | leistung |
| fuellung | fuellung_material_giz | fuellung | material |
| fuellung | fuellung_material_komposit | fuellung | material |
| fuellung | fuellung_material_adhesive | vorbereitung | material |
| fuellung | fuellung_material_etch | vorbereitung | material |
| fuellung | fuellung_material_matrix | vorbereitung | material |
| fuellung | fuellung_material_flowable | fuellung | material |
| fuellung | fuellung_material_bulk | fuellung | material |
| fuellung | insurance_gkv_mkv | info | insurance |
| fuellung | mkv_begruendung | info | insurance |
| fuellung | doc_aufklaerung | doku | doku |
| fuellung | doc_alternativen | doku | doku |
| fuellung | doc_risiken | doku | doku |
| fuellung | doc_einverstaendnis | doku | doku |
| fuellung | doc_okklusion | finishing | doku |
| fuellung | doc_politur | finishing | doku |
| fuellung | optisch_elektronisch | doku | doku |

## Unified chips with defaultActive=true
| treatment | chipId | phase |
| --- | --- | --- |
| crown_prep | praeparation | behandlung |
| endo | vipr_neg | befund |
| endo | perk_neg | befund |
| endo | la_leitung | anaesthesie |
| endo | kofferdam | vorbereitung |
| endo | trepanation | zugang |
| endo | spuelung_naocl | spuelung |
| extraction | extraktion_einfach | behandlung |
| fuellung | fuellung_grundleistung | fuellung |
| fuellung | vipr_pos | befund |
| fuellung | perk_neg | befund |
| fuellung | la_infiltr | anaesthesie |
| fuellung | kofferdam | vorbereitung |
| fuellung | exkavation | exkavation |
| fuellung | cp_not_required | ueberkappung |
| fuellung | komposit_basic | fuellung |
| fuellung | finishing | finishing |
| fuellung | fuellung_material_giz | fuellung |
| fuellung | fuellung_material_komposit | fuellung |
| pzr | pzr_vollstaendig | behandlung |
