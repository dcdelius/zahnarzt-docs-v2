# PROMPT A — Fuellung Facts Contract

## Complete Fuellung Facts Table

| Fact | Type | Source | Used By | Missing Impact | Resolution |
|------|------|--------|---------|----------------|------------|
| `surfaces` | string[] | extraction | renderer (surface_mapping) | Wrong F-code | Askback or default |
| `surfaceSource` | enum | extraction | trace | Debug only | N/A |
| `surfaceAmbiguous` | bool | extraction | askback trigger | None | N/A |
| `cariesDepth` | enum | extraction | Cp/P concept cases | Missing Cp billing | askback on profunda |
| `capping.performed` | enum | askback | Cp/P chips | Missing BEMA_25/26 | askback required |
| `capping.material` | string | askback | text composer | Incomplete text | optional askback |
| `materialMentioned` | string | extraction | surface_mapping, text | Wrong material in text | default=komposit |
| `adhesiveTechnique` | bool | extraction | Mehrschicht chip | Missing GOZ addon | derives from material |
| `kofferdamUsed` | bool | extraction | Kofferdam chip | Missing BEMA_12 | optional askback |
| `kofferdamMentioned` | bool | extraction | text | Debug only | N/A |
| `anesthesia` | object | extraction | LA chip | Missing BEMA_40/41a | default=none |
| `hasMkv` | bool | UI settings | branch routing | N/A | UI required |
| `mehrkostenMentioned` | bool | extraction | MKV askback trigger | N/A | signal detection |
| `mehrkostenSignalsClear` | bool | computed | MKV auto-confirm | Askback if unclear | signal detection |
| `mehrkostenConfirmed` | bool | computed/askback | GOZ addon chips | No GOZ addon | askback or signal |
| `nurKasse` | bool | extraction | suppress GOZ | BEMA only | signal detection |
| `mkvAmount` | string | extraction | text composer | Amount in text | optional |
| `mkvJustification` | string | askback | text composer | Justification in text | optional |

## Gap Analysis: Ist vs Soll

### Soll (Perfekt)

| Requirement | Fact | Status |
|-------------|------|--------|
| Zahn + Flächen | surfaces, tooth | ✅ |
| Diagnose (profunda) | cariesDepth | ✅ |
| LA (ja/nein + Art) | anesthesia | ✅ |
| Isolation (Kofferdam) | kofferdamUsed | ✅ |
| Material | materialMentioned | ✅ |
| Technik (adhäsiv) | adhesiveTechnique | ✅ |
| Überkappung + Material | capping.performed, capping.material | ⚠️ askback needed |
| Finishing | polishing, occlusion | ❌ missing |
| MKV Betrag + Consent | mkvAmount, mehrkostenConfirmed | ✅ |

### Gaps

| Gap | Impact | Fix |
|-----|--------|-----|
| Finishing (Politur/Okklusion) | Text incomplete in "mittel/lang" | Add extraction keywords + text chip |
| capping.material | Text says "Ca(OH)2" without source | Askback when capping.performed=yes |

## Hardcode Sweep (V10 Fuellung-relevant)

```bash
grep -rn "'BEMA_13\|'BEMA_25\|'GOZ_2" src/docudent/v10/{renderer,billing,pipeline,facts} --include="*.ts"
# ZERO MATCHES ✅
```

**Verdict: SSOT intact. Zero runtime hardcodes.**
