# Settings Coverage (Askbacks)

Stand: 2026-02-03

## Überblick
- Askbacks in `medical_kb.v1.json`: 13
- Askbacks mit Settings-Mapping: 13
- Askbacks ohne Settings-Mapping: 0

## Gemappt (aus SettingsSchema)
- askback-adhesive-technique
- askback-hemostasis
- askback-isolation
- askback-kofferdam
- askback-la-type
- askback-layering
- askback-material
- askback-mkv-confirmed
- askback-mkv-justification
- askback-pulpaschutz
- askback-sensitivity-followup
- askback-ueberkappung
- askback-ueberkappung-material

## Nicht gemappt

## Mappings ohne KB-Askback
- endo_canal_count
- endo_medication
- fuellung_adhesive
- medical_irrigation
- medical_wf_technique
- medical_wl_method

---

## ChipStandards (Standard‑Chips aus Settings)
**Stand:** 2026‑02‑08

**Quelle**
- `practice.chipStandards.global[]`
- `practice.chipStandards.perTreatment[treatmentId][]`
- `user.chipStandards.global[]`
- `user.chipStandards.perTreatment[treatmentId][]`

**Pipeline**
1. `getStandardChipIdsForInstance` filtert per KB (`hasChipInKb`)  
   → `src/docudent/v10/settings/chipStandards.ts`
2. `resolveContractContext` legt `standardChips` in `contract.values` ab  
   → `src/docudent/v10/procedure/resolver/resolveContractContext.ts`
3. Procedure‑Node `contract.standard_chips` emittiert Chips  
   → `src/docudent/v10/procedure/registry/capabilities/index.ts`
4. Billing‑Guard behandelt diese Chips als **settings**‑Quelle  
   → `src/docudent/v10/pipeline/runV10.ts`

**Hinweise**
- Reihenfolge: Practice → User (stabile Union; Duplikate entfernt).
- Standard‑Chips bleiben im Control Center overridable.
- UI‑Standardliste liegt in `src/docudent/v10/settings/docStandardChips.ts` (Praxis + Benutzer).
- Gate: `gate-v10-doc-standard-chips.test.ts` stellt sicher, dass die Default‑IDs in der KB existieren.
