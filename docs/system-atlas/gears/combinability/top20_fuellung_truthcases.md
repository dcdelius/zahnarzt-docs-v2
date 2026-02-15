# Top-20 Füllung Truthcases

## GKV Cases (1-7)

| # | Title | Dictation | Expected | Verdict |
|---|-------|-----------|----------|---------|
| 1 | GKV O-Fläche ohne LA | "Zahn 16 o Kompositfüllung" | BEMA_13, no GOZ | PASS |
| 2 | GKV MO mit LA | "Zahn 26 mo Kompositfüllung Infiltration" | BEMA_13b, BEMA_40 | PASS |
| 3 | GKV MOD + Kofferdam | "Zahn 36 mod Kofferdam" | BEMA_13c, BEMA_12 | PASS |
| 4 | GKV profunda + Cp | "Zahn 46 o Caries profunda Cp Ca(OH)2" | BEMA_13, BEMA_25 | PASS |
| 5 | GKV 4-flächig + LA Leitung | "Zahn 37 modl LA Leitung" | BEMA_13d, BEMA_41a | PASS |
| 6 | GKV UK-Molar Infiltration | "Zahn 36 o Infiltration" | BEMA_40 (warnnung) | PASS/WARN |
| 7 | GKV mit P (direkte Überkappung) | "Zahn 16 o Pulpaeröffnung P MTA" | BEMA_26 | PASS |

## PKV Cases (8-12)

| # | Title | Dictation | Expected | Verdict |
|---|-------|-----------|----------|---------|
| 8 | PKV MO Komposit | "Zahn 15 mo Kompositfüllung" | GOZ_2080, no BEMA | PASS |
| 9 | PKV MOD + LA + Kofferdam | "Zahn 36 mod Infiltration Kofferdam" | GOZ_2100, GOZ_0090, GOZ_2040 | PASS |
| 10 | PKV Cp + MTA | "Zahn 16 o Caries profunda MTA" | GOZ_233x | PASS |
| 11 | PKV Mehrschicht | "Zahn 26 mod Mehrschichttechnik" | GOZ_2100, **no GOZ_2197** (dropped) | WARN |
| 12 | PKV 4-flächig | "Zahn 37 modl" | GOZ_2120 | PASS |

## MKV Cases (13-20)

| # | Title | Dictation | Expected | Verdict |
|---|-------|-----------|----------|---------|
| 13 | MKV nurKasse → nur BEMA | forceExtraction: nurKasse=true | BEMA only, no GOZ | PASS |
| 14 | MKV mit Mehrkosten bestätigt | forceExtraction: mkvConfirmed=true | BEMA + GOZ | PASS/WARN |
| 15 | MKV LA bleibt BEMA | forceExtraction: anesthesia=infiltr | BEMA_40, no GOZ_0090 | PASS |
| 16 | MKV Kofferdam bleibt BEMA | forceExtraction: kofferdamUsed=true | BEMA_12, no GOZ_2040 | PASS |
| 17 | MKV 2197 vs 2100 Konflikt | forceExtraction + adhäsiv | GOZ_2100, GOZ_2197 dropped | WARN |
| 18 | MKV kein Phantom-Zahn | "Zahn 36 mod 120 Euro" | text not contain "Zahn 120" | PASS |
| 19 | MKV Determinismus | 5x run same input | identical billing | PASS |
| 20 | MKV ohne Bestätigung | forceExtraction: mkvConfirmed=false | BEMA only | PASS |

## Conflict Cases (specific)

| # | Codes | Rule | Expected |
|---|-------|------|----------|
| 11 | GOZ_2100 + GOZ_2197 | regel_goz2197_nicht_neben_2060 | 2197 dropped, WARN |
| 17 | Same | Same | Same |

## Invariants (all cases)

- [ ] No raw booleans in answers
- [ ] sections.length >= 1
- [ ] No GOZ codes in GKV output
- [ ] No BEMA codes in PKV output
- [ ] MKV base services = BEMA
