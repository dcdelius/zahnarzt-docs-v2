# Concept-Registry Tabelle (V10 Medical KB)

Konzept‑Landkarte für die aktuelle V10‑KB.  
Quelle: `src/docudent/medical_kb/medical_kb.v1.v10.json`.

**Legende**
- **Scope**: `fuellung` / `endo` / `multi` (treatment‑agnostic)
- **Cases**: Concept‑Cases (trigger conditions)
- **Emits**: Chips (IDs) die emittiert werden
- **Askbacks**: Askback‑IDs (optional gekennzeichnet)

| Concept ID | Scope | Cases | Emits | Askbacks | Notes |
|---|---|---|---|---|---|
| caries-profunda | multi | — | — | — | Tiefe Karies mit Annäherung an die Pulpa (< 2mm Restdentin) |
| indirect-capping | fuellung | decision_required, material_required, indirect_cp, no_cp_not_required | cp, cp_not_required | medical_ueberkappung, medical_ueberkappung_material | Schutz der Pulpa durch Applikation eines bioaktiven Materials bei pulpanaher Kavität ohne Pulpaeröffnung |
| direct-capping | fuellung | decision_required, material_required, direct_p | p | medical_ueberkappung, medical_ueberkappung_material | Überkappung bei punktförmiger, iatrogener Pulpaeröffnung |
| pulpitis-risk | multi | — | — | — | Risiko einer Pulpabeteiligung bei tiefer Karies, erfordert Patientenaufklärung |
| pulpa-protection | fuellung | deep_caries_askback | — | fuellung_pulpaschutz | Schutzmaßnahme bei tiefer Karies |
| bleeding-excav | fuellung | hemostasis_required | — | medical_hemostasis | Relevante Blutung während der Kariesexkavation, erfordert Dokumentation |
| postop-sensitivity | fuellung | sensitivity_followup_required | — | medical_sensitivity_followup | Überempfindlichkeit nach Füllungstherapie, Kontrollindikation bei länger als 4 Wochen |
| fluoridation | fuellung | fluor_applied | fluor | — | Fluoridierung nach Füllungstherapie |
| fuellung-baseline | fuellung | baseline | fuellung_grundleistung | — | Grundleistung bei jeder Füllung (BEMA 13a-d) |
| billing-context | fuellung | insurance_context_unknown, mkv_confirmed_required, mkv_justification_required_(confirmed/mentioned), mkv_betrag_required_(confirmed/mentioned), mkv_confirmed_emits_track, mkv_mehrschicht_addon_* | insurance_gkv_mkv, mehrschicht | fuellung_insurance_context (optional), medical_mkv_confirmed, mkv_betrag, fuellung_mkv_justification | Kontextfragen für Mehrkosten und Abrechnungspfad |
| material-selection | fuellung | material_unknown, material_komposit, material_giz | fuellung_material_komposit, fuellung_material_giz | fuellung_material | Dokumentation des verwendeten Füllungsmaterials |
| local-anesthesia-infiltration | fuellung, endo | infiltr_fuellung, infiltr_endo, infiltr_general | la_infiltr | — | Lokalanästhesie durch Infiltration |
| local-anesthesia-leitung | fuellung, endo | leitung_fuellung, leitung_endo, leitung_general | la_leitung | — | Lokalanästhesie über Leitungsblock |
| surface-anesthesia | fuellung | surface_general, surface_fuellung | oberflaeche_la | — | Topische Oberflächenanästhesie vor Injektion |
| kofferdam | endo, fuellung | kofferdam_used, kofferdam_not_used, kofferdam_askback, kofferdam_required_endo, kofferdam_endo, kofferdam_fuellung, isolation_unknown_askback, isolation_rubberdam, isolation_relative | kofferdam, rel_trocken | medical_kofferdam (optional), medical_endo_kofferdam, fuellung_isolation | Absolute Trockenlegung mit Kofferdam |
| relative-isolation | multi | — | — | — | Relative Trockenlegung (Watterollen/Sauger) |
| adhesive-technique | fuellung | adhesive_mkv_required, adhesive_unknown_composite, adhesive_yes_emits_mehrschicht | mehrschicht | medical_adhesive_technique, fuellung_adhesive | Ätz-/Primer-/Bond-Protokoll bei Komposit |
| layering-technique | fuellung | layering_unknown_medium_large, layering_yes_emits_mehrschicht | mehrschicht | fuellung_layering | Schichtweiser Aufbau der Kompositfüllung |
| caries-excavation | fuellung | exkavation_performed | exkavation | — | Entfernung kariöser Zahnsubstanz |
| finishing-polishing | fuellung | finishing_performed | finishing | — | Okklusionskontrolle, Einschleifen und Politur |
| vitality-test | multi | vipr_pos, vipr_neg | vipr_pos, vipr_neg | — | Test der Zahnpulpa-Vitalität |
| percussion-test | multi | perk_pos, perk_neg | perk_pos, perk_neg | — | Klopfschmerztest zur Beurteilung |
| working-length-measurement | endo | wl_method_required, wl_electronic, wl_xray | laengenmessung_elek, laengenmessung_roentgen | medical_endo_wl_method | Bestimmung der Arbeitslänge in der Endodontie |
| endo-canal-preparation | endo | canal_1, canal_2, canal_3, canal_4 | kanalaufbereitung_1, kanalaufbereitung_2, kanalaufbereitung_3, kanalaufbereitung_4 | — | Aufbereitung nach Kanalanzahl in der Endodontie |
| endo-irrigation | endo | irrigation_required, irrigation_naocl, irrigation_edta | spuelung_naocl, spuelung_edta | medical_endo_irrigation | Dokumentation der Spüllösungen in der Endodontie |
| endo-medication | endo | medication_caoh2 | einlage_caoh2 | — | Medikamentöse Einlage im Wurzelkanal |
| endo-obturation | endo | wf_warm, wf_einzel, wf_kalt, wf_kalt_default | wf_warm, wf_einzel, wf_kalt | — | Technik der Wurzelfüllung |
| endo-radiography | endo | diagnostic_xray, control_xray | roentgen_einzelzahn, roentgen_kontrolle | — | Diagnostik- und Kontrollröntgen im Endo-Verlauf |
| endo-post-buildup | endo | postendo_aufbau | aufbau_postendo | — | Aufbau nach Wurzelkanalbehandlung |
| endo-trepanation | endo | trepanation_step | trepanation | — | Zugang zur Pulpenkammer im Endo-Ablauf |
