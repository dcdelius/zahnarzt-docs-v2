# Golden Output Gate v2

## Zweck

Qualitätssicherung für Output-Generierung mit:
- 100% SSOT-Konformität (jede Zeile hat Evidence)
- Deterministische Testbarkeit
- Praxis-/KZV-tauglicher Stil
- Strikte Tests (nicht weichgespült)

---

## Test-Kategorien (147 Tests)

| Kategorie | Anzahl | Prüft |
|-----------|--------|-------|
| Structure & Order | 30 | sectionsOrder exakt, keine leeren Sections, lineCount bounds |
| Evidence Coverage | 30 | Jede Zeile Evidence, requiredEvidence, forbiddenEvidence |
| Dedupe | 10 | chipIds unique über alle Sections |
| Billing | 20 | mustContainCodes, mustNotContainCodes (exakt) |
| Style Rules | 50 | Bullet ratio ≤45%, prose sentences, no duplicates, no garbage |
| Warnings | 4 | Devital/Endo warnings vorhanden |
| Juristik Static | 3 | Templates/Disclosures ohne §/SGB/BGB |

---

## Evidence Plan (pro Fixture)

Jede Fixture definiert:

```json
{
  "sections": {
    "befund": {
      "requiredEvidence": { "mappingKeys": ["fuellung_finding_map.diagnose"] },
      "forbiddenEvidence": { "ruleIds": ["RULE_FUELLUNG_DEVITAL_WARNUNG"] },
      "minLines": 1,
      "maxLines": 6
    }
  },
  "dedupe": { "chipIdsUnique": ["kofferdam", "la_infiltr"] },
  "billing": { "mustContainCodes": ["BEMA_13c"], "mustNotContainCodes": ["GOZ_2197"] }
}
```

---

## Style Rules

| Regel | Wert |
|-------|------|
| maxBulletRatio | 0.45 |
| minProseSentences (behandlung) | 1 |
| maxConsecutiveBullets | 6 |
| forbiddenTokens | undefined, null, NaN, [object Object] |

---

## Juristik Gate

**Verbotene Tokens in Templates/Disclosures:**
- `§`, `SGB`, `BGB`, `gemäß`, `nach §`

**juristik_referenzen.json:** Nur Metadata, kein Fließtext (max 200 chars).

---

## Composer Contract

`ComposedSection` liefert:
- `lines: string[]` (individuelle Zeilen)
- `evidenceByLineIndex: EvidenceRef[][]` (Evidence pro Zeile)
- `evidenceRefs: EvidenceRef[]` (aggregiert)

---

## Gate-Kommando

```bash
npm run proof-pack          # 350+ Tests inkl. Golden Output
npm run proof-pack:full     # +E2E
```

**Exit 0 = 100% PASS.**

---

## Änderungen

| Item | Vorher | Nachher |
|------|--------|---------|
| Disclosures | "gemäß" | "lt." |
| ComposedSection | content only | +lines[], +evidenceByLineIndex[] |
| Golden Tests | 93 (relaxed) | 147 (strict) |
