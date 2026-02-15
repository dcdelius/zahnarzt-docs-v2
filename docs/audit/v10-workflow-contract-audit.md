# M61: V10 Workflow Contract Audit

## Fuellung Chip Inventory

### Unified.json Chips (19)
| chipId | phase | category | billingRef |
|--------|-------|----------|------------|
| vipr_pos | befund | befund | - |
| vipr_neg | befund | befund | - |
| perk_neg | befund | befund | - |
| perk_pos | befund | befund | - |
| la_infiltr | anaesthesie | leistung | BEMA_40/GOZ_0090 |
| la_leitung | anaesthesie | leistung | BEMA_41a/GOZ_0100 |
| oberflaeche_la | anaesthesie | leistung | GOZ_0080 |
| kofferdam | vorbereitung | leistung | BEMA_12/GOZ_2040 |
| rel_trocken | vorbereitung | leistung | - |
| exkavation | exkavation | leistung | - |
| **cp** | ueberkappung | leistung | BEMA_25/GOZ_2330 |
| cp_not_required | ueberkappung | leistung | - |
| p | ueberkappung | leistung | BEMA_26/GOZ_2340 |
| komposit_basic | fuellung | leistung | - |
| mehrschicht | fuellung | leistung | GOZ_2197 |
| finishing | finishing | leistung | - |
| fluor | finishing | leistung | BEMA_IP4/GOZ_1020 |

### Question Bank (14 questions)
| key | category | when | chipActivation |
|-----|----------|------|----------------|
| vitality | forensic | always | - |
| percussion | forensic | always | - |
| tiefe | forensic | if keywords | - |
| ueberkappung | forensic | if tief OR keywords | - |
| anesthesia_type | forensic | if keywords | - |
| diagnose_confirmation | forensic | if karies w/o type | - |
| isolation | forensic | if not mentioned | - |
| ueberkappung_material | forensic | **if ueberkappung=true** | - |
| mkv_vereinbarung | mkv | - | - |
| mkv_betrag | mkv | - | - |
| mehrschicht | upsell | - | mehrschicht |
| adhasiv | upsell | - | adhasiv |
| hemostasis | medical | if keywords | - |
| sensitivity_followup | medical | if keywords | - |

## Identified Issues

### 1. CP/Material Redundancy 🔴
- `ueberkappung` asks "Überkappung erforderlich?" (yes/no)
- `ueberkappung_material` asks "Überkappungsmaterial?" (when ueberkappung=true)
- **Redundancy**: If user has `defaultCappingMaterial` in settings, material should NOT be asked.

### 2. chipId Naming ✅
- All chipIds in unified.json are properly namespaced (no 2-letter aliases like "cp" alone)
- `cp` exists as canonical chipId in unified.json ✅

### 3. Missing chipActivation Mapping
- `ueberkappung_material` answer does NOT have `chipActivation` field
- Material must be mapped to `cp.material` variable, not a separate chip

## Contract Violations

| Issue | Severity | Fix |
|-------|----------|-----|
| Material asked when settings provide default | HIGH | Check settings before asking |
| Missing chipActivation for material | MEDIUM | Material is variable of cp chip |

## Chip Closure Status

All fuellung chipIds are properly defined in unified.json. The "cp missing" error mentioned was likely a runtime variable substitution issue, not a missing chip.
