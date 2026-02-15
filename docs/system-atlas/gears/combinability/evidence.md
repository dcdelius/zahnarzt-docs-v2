# GIGAPROMPT A — Evidence Report

## IST-Analyse: Combinability Data Sources

### Evidence Table

| Source | Path | Format | Semantik | Coverage | Status |
|--------|------|--------|----------|----------|--------|
| **kombinationen.json** | `core/billing/knowledgeBase/regeln/` | JSON array | Manual rules | GOZ/BEMA | ✅ Maschinenlesbar |
| **combinability_kb.v1.json** | `v10/kb/combinability/` | JSON with schema | V10 compiled KB | GOZ/BEMA | ✅ Executable |
| **commentParser.ts** | `core/billing/knowledgeBase/secondary/` | TypeScript parser | Extracts softRules from HTML | BEMA/GOZ/BEL | ⚠️ Text → Soft rules |
| **commentIndex_analog.json** | `core/billing/knowledgeBase/secondary/` | JSON index | Analog billing references | GOZ | ✅ Parsed |
| **HTML Truthset** | `v10/kb/combinability/` (sourceRefs) | HTML files from kommentar.bema-goz.de | "nicht neben" patterns | GOZ | ✅ Already extracted |

### Diagnostic: Maschinenlesbar vs Text

| Source | Maschinenlesbar? | Notes |
|--------|------------------|-------|
| kombinationen.json | ✅ Yes | 14 rules with `typ`, `betrifft`, `regel`, `schweregrad` |
| combinability_kb.v1.json | ✅ Yes | 20 rules with `blockWith`, `autoResolve`, `sourceRefs` |
| commentParser.ts | ⚠️ Partial | Extracts `softRules[]` with patterns like "nicht neben" |
| HTML source | ❌ Text only | Need manual curation or NLP extraction |

### Example Records from kombinationen.json

```json
{
  "id": "regel_goz2197_nicht_neben_2060",
  "typ": "ausschluss",
  "titel": "GOZ 2197 nicht neben GOZ 2060-2120",
  "betrifft": ["GOZ_2197", "GOZ_2060", "GOZ_2080", "GOZ_2100", "GOZ_2120"],
  "regel": { "operator": "darf_nicht", "bedingung": "2197 nicht mit 2060-2120" },
  "schweregrad": "regress",
  "quelle": { "dokument": "GOZ Kommentar BZÄK" }
}
```

## Conclusion

- **Primary SSOT**: `combinability_kb.v1.json` (compiled, V10)
- **Source**: `kombinationen.json` + HTML truthset
- **Provider**: `wissing-kommentar` (kommentar.bema-goz.de)
- **Gap**: No direct DB table; rules are file-based JSON
