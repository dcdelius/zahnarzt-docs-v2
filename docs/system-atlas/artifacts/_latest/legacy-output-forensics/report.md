# Legacy Output Forensics Report

**Date**: 2026-01-12  
**Purpose**: Document legacy output composer path and compare to V10 for parity assessment.

---

## 1. Legacy Output Path — Evidence Table

### Core Files

| File | Lines | Function | Purpose | Git Blame |
|------|-------|----------|---------|-----------|
| [outputComposer.ts](file:///Users/david/dokumaster-ui/src/docudent/core/billing/knowledgeBase/logic/outputComposer.ts) | 1230 | `composeOutput` | Template-driven section rendering | `87bebc33` (2025-12-12) |
| [fillingTextRenderer.ts](file:///Users/david/dokumaster-ui/src/docudent/core/filling/fillingTextRenderer.ts) | 184 | `renderFillingNote` | German clinical text from fields | Legacy |
| [templates/](file:///Users/david/dokumaster-ui/src/docudent/core/billing/knowledgeBase/templates/) | - | OutputTemplate JSON | Section layout + phrasebank | - |
| [disclosures/](file:///Users/david/dokumaster-ui/src/docudent/core/billing/knowledgeBase/disclosures/) | - | Disclosure JSON | Aufklärung/MKV/PostOP text | - |

### Call Chain

```
V7/V8 Orchestrator
  → processWithRulesEngine() → ProcessingResult (chips, billingCodes)
  → composeOutput(templateId, engineResult, activeChips, extractedData, insuranceType, options)
      → loadTemplate(templateId)
      → loadDisclosures()
      → loadFindingMap(templateId)
      → for each sectionDef:
          - header → renderHeader()
          - befund → renderBefundFromMapping()
          - aufklaerung → renderAufklaerung()
          - behandlung → renderBehandlung()
          - leistungen → renderLeistungen()
          - abrechnung → renderAbrechnung()
          - hinweise → renderHinweise()
      → fullText = sections.map(s => `[${s.label}]\n${s.content}`).join('\n\n')
```

### SSOT Inputs (Legacy)

| Input | Description | SSOT-safe? |
|-------|-------------|------------|
| `activeChips` | Chips from rules engine | ✅ |
| `chip.textSnippets` | Text per verbosity | ✅ |
| `disclosures` | Aufklärung/MKV/PostOP clauses | ✅ |
| `findingMap` | Befund label mapping | ✅ |
| `phrasebank` | Behandlung connectors | ✅ |
| `extractedData.tooth` | Tooth number | ⚠️ From extraction |
| `options.hasMKV` | MKV checkbox | ✅ UI flag |

---

## 2. Legacy Section Structure

### composeOutput Sections (line 764-816)

| Section ID | Renderer | Content Source |
|------------|----------|----------------|
| `header` | `renderHeader` | extractedData + TREATMENT_LABELS |
| `befund` | `renderBefundFromMapping` | findingMap + extractedData |
| `aufklaerung` | `renderAufklaerung` | disclosures + chips + insurance |
| `behandlung` | `renderBehandlung` | chips.textSnippets + phrasebank |
| `leistungen` | `renderLeistungen` | chips.textSnippets |
| `abrechnung` | `renderAbrechnung` | billingDetails + MKV disclosures |
| `hinweise` | `renderHinweise` | disclosures + postop |

### MKV Handling (Legacy)

| Location | File:Line | Logic |
|----------|-----------|-------|
| renderAbrechnung | :620-670 | Adds MKV disclosure if `options.hasMKV` |
| insuranceType | :724 | 'GKV' or 'PKV' (MKV = GKV + hasMKV flag) |
| MKV disclosure | disclosures.json | Static text "§ 28 Abs. 2 SGB V" |

---

## 3. V10 Composer Structure

### composeDocumentationV10 (327 lines)

| Section ID | Builder | Content Source |
|------------|---------|----------------|
| `dokumentation` | `buildDokumentationSection` | facts + label helpers |
| `abrechnung` | `buildAbrechnungSection` | billingCodes |
| `mkv` | `buildMkvSection` | insuranceType + mkvAmount |
| `hinweise` | `buildHinweiseSection` | hasAnesthesia flag |

### V10 SSOT Inputs

| Input | Description | SSOT-safe? |
|-------|-------------|------------|
| `perInstance` | Per-tooth facts/chips/billing | ✅ |
| `facts.surfaces/depth/anesthesia/capping` | Clinical facts | ✅ |
| `billingCodes` | BillingRef IDs | ✅ |
| `mkvAmount` | Extracted from dictation | ⚠️ Via detectMkvAmount |

---

## 4. Gaps Identified

### Missing from V10

| Feature | Legacy | V10 | Status |
|---------|--------|-----|--------|
| **Befund section** | `renderBefundFromMapping` | ❌ Missing | Use facts directly |
| **Aufklärung section** | `renderAufklaerung` | ❌ Missing | Could add if needed |
| **Leistungen section** | `renderLeistungen` | ❌ Missing | Merged into Dokumentation |
| **Behandlung prose** | `renderBehandlung` + phrasebank | ❌ Missing | Simplified in Dokumentation |
| **EvidenceRefs** | Per-section tracking | ❌ Missing | Not needed for V10 |
| **Template loading** | JSON templates | ❌ Not used | Hardcoded sections |
| **Disclosure system** | Contextual clauses | ⚠️ Partial | MKV text inline |

### V10 Already Has

| Feature | Status |
|---------|--------|
| KZV-style sections | ✅ 4 sections |
| Tooth + surfaces | ✅ formatSurfaces |
| Anesthesia labels | ✅ formatAnesthesiaLabel |
| Capping + material | ✅ formatCappingLabel |
| Depth labels | ✅ formatDepthLabel |
| MKV section | ✅ buildMkvSection |
| MKV amount detection | ✅ detectMkvAmount |
| GOZ addon billing | ✅ via mehrkostenConfirmed |

---

## 5. Recommendations

### Minimal Port Strategy

| Action | Effort | Impact |
|--------|--------|--------|
| Keep V10 4-section structure | None | ✅ Simpler |
| Add Befund section if needed | Low | Optional |
| Keep inline label helpers | None | ✅ SSOT safe |
| Skip Aufklärung section | None | Low priority |
| Skip template loading | None | ✅ Simpler |
| Skip evidenceRefs | None | Not needed |

### NOT Recommended

- ❌ Port 1230-line outputComposer.ts
- ❌ Port template + disclosure loading system
- ❌ Port evidenceRefs tracking
- ❌ Port phrasebank

---

## GO/NO-GO Summary

### ✅ GO — V10 Can Reach Legacy Quality

**Evidence**:
1. V10 already produces KZV-style sections
2. Clinical details (tooth, surfaces, depth, LA, Cp) are present
3. MKV section works with amount detection
4. GOZ addon billing now works (fix applied 2026-01-12)
5. 233 tests pass

**Remaining Gaps** (low priority):
- No Befund section (can add if requested)
- No Aufklärung section (can add if requested)
- No evidenceRefs (not needed for V10)

**Conclusion**: V10 composer is functionally equivalent to legacy for the core use case. No port of the 1230-line legacy composer is needed.
