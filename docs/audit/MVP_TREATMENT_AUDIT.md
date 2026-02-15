# MVP Treatment Audit Summary

## Overview

| Treatment | Questions | Sections | Question Bank | Template |
|-----------|-----------|----------|--------------|----------|
| **fuellung** | 11 (6 forensic, 2 mkv, 3 upsell) | 7 | [question_bank.json](file:///Users/david/dokumaster-ui/src/docudent/core/billing/knowledgeBase/treatments/fuellung/question_bank.json) | [template.json](file:///Users/david/dokumaster-ui/src/docudent/core/billing/knowledgeBase/treatments/fuellung/template.json) |
| **endo** | 6 (all forensic) | 7 | [question_bank.json](file:///Users/david/dokumaster-ui/src/docudent/core/billing/knowledgeBase/treatments/endo/question_bank.json) | [template.json](file:///Users/david/dokumaster-ui/src/docudent/core/billing/knowledgeBase/treatments/endo/template.json) |
| **extraction** | 2 (all forensic) | 4 | [question_bank.json](file:///Users/david/dokumaster-ui/src/docudent/core/billing/knowledgeBase/treatments/extraction/question_bank.json) | [template.json](file:///Users/david/dokumaster-ui/src/docudent/core/billing/knowledgeBase/treatments/extraction/template.json) |
| **pzr** | 2 (1 forensic, 1 upsell) | 3 | [question_bank.json](file:///Users/david/dokumaster-ui/src/docudent/core/billing/knowledgeBase/treatments/pzr/question_bank.json) | [template.json](file:///Users/david/dokumaster-ui/src/docudent/core/billing/knowledgeBase/treatments/pzr/template.json) |
| **crown_prep** | 2 (all forensic) | 3 | [question_bank.json](file:///Users/david/dokumaster-ui/src/docudent/core/billing/knowledgeBase/treatments/crown_prep/question_bank.json) | [template.json](file:///Users/david/dokumaster-ui/src/docudent/core/billing/knowledgeBase/treatments/crown_prep/template.json) |

---

## Question Flow (File:Line Evidence)

### questionService.ts Order
[questionService.ts:171-206](file:///Users/david/dokumaster-ui/src/docudent/v6/services/questionService.ts#L171-L206)

```
1. forensic questions → filtered by `when` clause
2. mkv questions → only if hasMKV=true
3. upsell questions → only if hasMKV=true and chip not active
```

---

## Fuellung Questions (with `when` conditions)

| Key | Prompt | Category | When |
|-----|--------|----------|------|
| vitality | Sensibilitätsprobe? | forensic | *(always)* |
| percussion | Perkussionsprobe? | forensic | *(always)* |
| tiefe | Kavitätentiefe? | forensic | anyKeywords: karies, profunda, tief, pulpanah |
| ueberkappung | Überkappung erforderlich? | forensic | anyOf: [keywords] OR tiefe="tief" |
| isolation | Trockenlegung? | forensic | *(always)* |
| ueberkappung_material | Überkappungsmaterial? | forensic | requiresAnswers: ueberkappung=true |

---

## Output Render Functions

### Main Composer
[outputComposer.ts:562-732](file:///Users/david/dokumaster-ui/src/docudent/core/billing/knowledgeBase/logic/outputComposer.ts#L562-L732)

### Section Renderers (approximate lines)
| Section | Function | Line |
|---------|----------|------|
| header | renderHeader | 235 |
| befund | renderBefundFromMapping | 270 |
| aufklaerung | renderAufklaerung | 335 |
| behandlung | renderBehandlung | 390 |
| leistungen | renderLeistungen | 480 |
| abrechnung | renderAbrechnung | 518 |
| hinweise | renderHinweise | 545 |

---

## JSON Audit Files

- [treatment-fuellung.json](file:///Users/david/dokumaster-ui/docs/audit/treatment-fuellung.json)
- [treatment-endo.json](file:///Users/david/dokumaster-ui/docs/audit/treatment-endo.json)
- [treatment-extraction.json](file:///Users/david/dokumaster-ui/docs/audit/treatment-extraction.json)
- [treatment-pzr.json](file:///Users/david/dokumaster-ui/docs/audit/treatment-pzr.json)
- [treatment-crown_prep.json](file:///Users/david/dokumaster-ui/docs/audit/treatment-crown_prep.json)

---

## Fuellung Golden Dictations

| # | Dictation | Expected Questions |
|---|-----------|-------------------|
| 1 | Zahn 15 MO Composite | vitality, percussion, isolation |
| 2 | Zahn 36 MOD Kofferdam Karies media | vitality, percussion, tiefe |
| 3 | Zahn 46 Karies profunda pulpanah Überkappung | vitality, percussion, ueberkappung, isolation |
| 4 | Zahn 24 Amalgam-Austausch Composite | vitality, percussion, isolation |
| 5 | 47 MO Anästhesie relative Trockenlegung | vitality, percussion |

---

## Endo Golden Dictations

| # | Dictation | Expected Questions |
|---|-----------|-------------------|
| 1 | Zahn 36 Trepanation 3 Kanäle | vitality, percussion |
| 2 | 46 Zwischensitzung Einlagenwechsel | vitality, percussion, kanalzahl |
| 3 | Zahn 16 Wurzelfüllung 4 Kanäle | vitality, percussion |
| 4 | 26 apikale Parodontitis Trepanation | endo_step, vitality, percussion, kanalzahl, spuelung, medikament |
| 5 | 14 Endo-Start devitales Pulpagewebe | vitality, percussion, kanalzahl, spuelung, medikament |
