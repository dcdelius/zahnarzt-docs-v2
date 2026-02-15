# Masterplan Sync Report

> **Datum:** 2025-12-12  
> **Scope:** 16 Dateien im Masterplan-Ordner

---

## 1. Was wurde aktualisiert?

### index.md
- Version auf 5.0 (SSOT Output System) aktualisiert
- Tabelle um Test & Quality Gates erweitert
- Neue Pfade: templates/, mappings/, disclosures/, outputComposer.ts
- Gate-Kommando Referenz hinzugefügt

### 03_EngineArchitecture.md
- OutputComposer als zweite zentrale Komponente dokumentiert
- EvidenceRef Interface und Line-Level Traceability beschrieben
- SSOT-Quellen-Tabelle (Template, Chips, Mappings, Disclosures)
- ComposedOutput und ComposedSection Interfaces
- Aktualisierte Dateipfade mit neuen Ordnern

### ProofPack_TestStrategy_v1.md
- Version auf 4.0 (Golden Output Gate v2) aktualisiert
- Test-Blöcke Tabelle: 9 Blöcke, 361 Tests (vorher 214)
- Neuer Block I: Golden Output v2 (147 Tests) vollständig dokumentiert
- Evidence Gate, Style Rules, Juristik Gate beschrieben
- Risiken auf IST-Stand korrigiert

### PROOF_PACK_STATUS.md
- Version auf 3.0 aktualisiert
- Tabelle mit 361 Tests (vorher 82)
- Golden Output v2 Kategorie-Aufschlüsselung
- SSOT Output System Dateien verifiziert
- Aktualisierte Dateiliste (src/test/golden-outputs/)

### 10_MVP_Scope.md
- Feature-Tabelle mit Gate-Spalte (welcher Test prüft)
- "✅ Implementiert" nur wo Test existiert
- Gate-Nachweis Sektion mit Test-Zahlen
- Post-MVP Liste mit Prioritäten

### Golden_Output_Gate_v2.md
- Bereits aktuell (heute erstellt)

---

## 2. Was war falsch/alt und ist korrigiert?

| Datei | ALT (falsch) | NEU (korrekt) |
|-------|--------------|---------------|
| ProofPack_TestStrategy | 214 Tests, 8 Blöcke | 361 Tests, 9 Blöcke |
| PROOF_PACK_STATUS | 5 Test-Blöcke, 82 Tests | 9 Blöcke, 361 Tests |
| 03_EngineArchitecture | Nur TreatmentEngine | +OutputComposer, +EvidenceRef |
| index.md | Fehlte Output System | templates/, mappings/, disclosures/ |
| 10_MVP_Scope | "✅ Done" ohne Gate | Gate-Spalte, Test-Nachweis |

---

## 3. Datei-Diskrepanz: 12 vs 16

**Ursprüngliche Anforderung:** "12 Dateien"

**Tatsächlich:** 16 Dateien

| Typ | Anzahl | Dateien |
|-----|--------|---------|
| **Kern-Dokumentation** | 11 | 01-11 (ProductVision bis Roadmap) |
| **Index** | 1 | index.md |
| **Test/Quality Gates** | 3 | ProofPack_TestStrategy, PROOF_PACK_STATUS, Golden_Output_Gate_v2 |
| **Komplett-Referenz** | 1 | masterplan_v3.md |
| **GESAMT** | **16** | |

---

## 4. Evidence & Repro (AUDITIERBAR)

### Test-Block Outputs

```bash
# SSOT Compliance Scanner
$ node scripts/ssot-compliance-scanner.cjs
→ All billing codes in production are sourced from JSON databases.
→ STATUS: PASS

# Billing Routing Proof
$ node scripts/billing-routing-proof.cjs
→ No alternative code paths exist.
→ STATUS: PASS

# Golden Master
$ npm run test:golden
→ Tests  62 passed (62)
→ STATUS: PASS

# Property Tests
$ npm run test:property
→ Tests  20 passed (20)
→ STATUS: PASS

# Ugly Whisper
$ npm run test:whisper
→ Tests  58 passed (58)
→ STATUS: PASS

# Conflict Fuzzer
$ npm run test:fuzzer
→ Tests  15 passed (15)
→ STATUS: PASS

# Billing Completeness
$ npm run test:billing
→ Tests  23 passed (23)
→ STATUS: PASS

# Output Integrity
$ npm run test:integrity
→ Tests  36 passed (36)
→ STATUS: PASS

# Golden Output v2
$ npm run test:golden-output
→ Tests  147 passed (147)
→ STATUS: PASS
```

**Gesamt: 62+20+58+15+23+36+147 = 361 Tests**

---

## 5. Kombinationsregeln Coverage

| Quelle | Regeln | In Tests |
|--------|--------|----------|
| `kombinationen.json` | 14 | UNKNOWN |
| `fuellung_regeln.json` | 18 | PARTIAL |
| **Gesamt** | **32** | |

**Coverage-Detail:**

| Regel-Typ | Anzahl | Getestet | Status |
|-----------|--------|----------|--------|
| ausschluss (Kombinationsverbote) | ~8 | 2 | NOT TESTED (6) |
| pflichtfeld | ~10 | 5 | PARTIAL |
| warnung (auditWarning) | ~8 | 3 | PARTIAL |
| upsell | ~6 | 2 | PARTIAL |

**Empfehlung:** Dedizierte Kombinationsregel-Testsuite erstellen.

---

## 6. Risiken (klassifiziert)

| Risiko | Schwere | Status | Nachweis |
|--------|---------|--------|----------|
| E2E nicht deterministisch | Mittel | **PROVEN** | Separiert in proof-pack:full |
| Devital-Warning nur mit vipr_neg | Niedrig | **PROVEN** | Golden Output devital_warning fixture |
| >5 Flächen Edge Case | Niedrig | **NOT TESTED** | Kein Fixture vorhanden |
| Multi-Tooth in einem Diktat | Mittel | **NOT TESTED** | UI nicht implementiert |
| Endo/Chirurgie JSON fehlt | Hoch | **PROVEN** | JSON-Dateien existieren nicht |
| Kombinationsregeln lückenhaft | Mittel | **PARTIAL** | 32 Regeln, ~10 getestet |
| juristik_referenzen ist Stub | Niedrig | **PROVEN** | Nur Metadaten, kein Fließtext |

---

## 7. Multi-Treatment: MVP oder Post-MVP?

### Entscheidung: **POST-MVP**

**Begründung:**

| Aspekt | Status |
|--------|--------|
| TreatmentEngine Multi-Segment | ✅ Architektur vorhanden |
| UI für Multi-Segment | ❌ Nicht implementiert |
| Tests für Multi-Treatment | ❌ Keine Fixtures |
| Diktat-Segmentierung | ❌ Nicht implementiert |

**Risiko bei MVP-Einschluss:**
- Keine Test-Coverage
- UI fehlt komplett
- Segmentierung ungetestet

**Empfehlung:**
1. MVP: Single-Treatment (Füllung) vollständig
2. Post-MVP Phase 1: Endo + Chirurgie (single)
3. Post-MVP Phase 2: Multi-Treatment

---

## 8. Was fehlt noch im Produkt?

### MVP-Blocker

| Lücke | Impact | Status |
|-------|--------|--------|
| Endo JSON nicht vorhanden | Nur Füllung | **PROVEN** |
| Chirurgie JSON nicht vorhanden | Nur Füllung | **PROVEN** |

### Post-MVP

| Feature | Priorität | Status |
|---------|-----------|--------|
| Multi-Treatment | Hoch | **NOT TESTED** |
| Prophylaxe/UPT | Mittel | **UNKNOWN** |
| ZE (Zahnersatz) | Mittel | **UNKNOWN** |
| Kinderlogik | Niedrig | **UNKNOWN** |
| BEL-II Labor | Niedrig | **UNKNOWN** |

---

## 9. Nächste 5 Schritte

| # | Schritt | Erfolgskriterium | Status |
|---|---------|------------------|--------|
| 1 | `endo_unified.json` erstellen | JSON mit ≥10 Chips | NOT STARTED |
| 2 | `endo_regeln.json` erstellen | JSON mit ≥5 Regeln | NOT STARTED |
| 3 | Endo Golden Output Fixtures | 5 Fixtures in fixtures.json | NOT STARTED |
| 4 | Endo Tests | proof-pack → 400+ Tests | NOT STARTED |
| 5 | Kombinationsregel-Testsuite | 32 Regeln → 32 Tests | NOT STARTED |

---

## 10. Änderungsübersicht

| Datei | Status |
|-------|--------|
| index.md | ✏️ Aktualisiert |
| 01_ProductVision.md | ✅ Unverändert |
| 02_ClinicalWorkflow.md | ✅ Unverändert |
| 03_EngineArchitecture.md | ✏️ Aktualisiert |
| 04_DataModel.md | ✅ Unverändert |
| 05_MultiTreatmentSystem.md | ✅ Unverändert |
| 06_RuleEngine.md | ✅ Unverändert |
| 07_QuestionEngine.md | ✅ Unverändert |
| 08_AuditEngine.md | ✅ Unverändert |
| 09_UX_Flow_Dictation.md | ✅ Unverändert |
| 10_MVP_Scope.md | ✏️ Aktualisiert |
| 11_Roadmap_2025.md | ✅ Unverändert |
| ProofPack_TestStrategy_v1.md | ✏️ Aktualisiert |
| PROOF_PACK_STATUS.md | ✏️ Aktualisiert |
| Golden_Output_Gate_v2.md | ✅ Bereits aktuell |
| masterplan_v3.md | ✅ Unverändert |
| **00_REPORT_masterplan_sync.md** | 🆕 Neu/Aktualisiert |

---

## Evidence Standards (für zukünftige Reports)

1. **Test-Output:** Exaktes Kommando + realer Output als Code-Block
2. **Datei-Count:** Kern vs Add-ons explizit aufschlüsseln
3. **Risiko-Klassifizierung:** PROVEN / NOT TESTED / UNKNOWN / PARTIAL
4. **Regel-Coverage:** Anzahl Regeln vs Anzahl getestete Regeln
5. **Feature-Scope:** MVP / POST-MVP mit Begründung
