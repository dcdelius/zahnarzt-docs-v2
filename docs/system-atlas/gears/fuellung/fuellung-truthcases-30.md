# PROMPT C — Fuellung 30 Truthcases

## GKV Cases (1-10)

| # | Input | Expected Codes | Verdict |
|---|-------|----------------|---------|
| 1 | "Zahn 16 o Komposit" | BEMA_13 | PASS |
| 2 | "Zahn 26 mo Kompositfüllung" | BEMA_13b | PASS |
| 3 | "Zahn 36 mod Kofferdam" | BEMA_13c, BEMA_12 | PASS |
| 4 | "Zahn 46 modl Infiltration" | BEMA_13d, BEMA_40 | PASS |
| 5 | "Zahn 16 o profunda Cp Ca(OH)2" | BEMA_13, BEMA_25 | PASS |
| 6 | "Zahn 37 mo Leitung" | BEMA_13b, BEMA_41a | PASS |
| 7 | "Zahn 36 mo betäubt" | BEMA_13b, BEMA_40 | PASS |
| 8 | "Zahn 16 o GIZ-Füllung" | BEMA_13 | PASS |
| 9 | "Zahn 26 mo P MTA" | BEMA_13b, BEMA_26 | PASS |
| 10 | "Zahn 36 mod Kofferdam Leitung" | BEMA_13c, BEMA_12, BEMA_41a | PASS |

## PKV Cases (11-18)

| # | Input | Expected Codes | Verdict |
|---|-------|----------------|---------|
| 11 | "Zahn 15 mo Komposit" | GOZ_2080 | PASS |
| 12 | "Zahn 25 mod Mehrschicht" | GOZ_2100 (no GOZ_2197) | WARN |
| 13 | "Zahn 36 modl Kofferdam LA" | GOZ_2120, GOZ_2040, GOZ_0090 | PASS |
| 14 | "Zahn 16 o profunda MTA" | GOZ_2060, GOZ_233x | PASS |
| 15 | "Zahn 26 o adhäsiv" | GOZ_2060 | PASS |
| 16 | "Zahn 36 mod Leitung" | GOZ_2100, GOZ_2100a | PASS |
| 17 | "Zahn 46 mo Infiltration" | GOZ_2080, GOZ_0090 | PASS |
| 18 | "Zahn 16 o ästhetisch optimiert" | GOZ_2060 | PASS |

## MKV Cases (19-30)

| # | Input | forceExtraction | Expected | Verdict |
|---|-------|-----------------|----------|---------|
| 19 | "36 mod Komposit" | mkvConfirmed=true | BEMA_13c + GOZ_2100 | WARN (2197 dropped) |
| 20 | "36 mod nurKasse" | nurKasse=true | BEMA_13c only | PASS |
| 21 | "36 mod 120 Euro" | mkvAmount="120" | BEMA_13c + GOZ | WARN |
| 22 | "36 o Mehrschicht" | adhesive=true | BEMA_13 + GOZ_2060 | WARN |
| 23 | "36 mo Komposit Kofferdam" | kofferdam=true | BEMA_12, BEMA_13b + GOZ | PASS/WARN |
| 24 | "36 mod betäubt" | anesthesia=infiltr | BEMA_40, BEMA_13c + GOZ | WARN |
| 25 | "36 mod Leitung" | anesthesia=leitung | BEMA_41a + base | WARN |
| 26 | "36 mod" | unclear signals | state=questions | N/A |
| 27 | "36 mod profunda Cp" | cariesDepth=profunda | BEMA_25 + GOZ | WARN |
| 28 | "36 o adhäsiv bestätigt" | adhesive=true | BEMA_13 + GOZ_2060 | WARN |
| 29 | "36 mod GIZ nurKasse" | nurKasse=true, material=giz | BEMA_13c only | PASS |
| 30 | "36 modl Mehrschicht 200€" | mkvAmount="200" | BEMA_13d + GOZ_2120 | WARN |

## Invariants (all cases)

- [ ] No raw booleans in output
- [ ] No GOZ codes in GKV
- [ ] No BEMA codes in PKV
- [ ] MKV base services = BEMA only (LA, Kofferdam)
- [ ] GOZ_2197 never in final billing when F-code present
- [ ] sections.length >= 1
- [ ] fullText contains tooth number

## Conflict Cases

| # | Codes Present | Rule | Result |
|---|--------------|------|--------|
| 12 | GOZ_2100 + GOZ_2197 | regel_goz2197_nicht_neben_2060 | 2197 dropped, WARN |
| 19 | Same | Same | Same |
| 21 | Same | Same | Same |
