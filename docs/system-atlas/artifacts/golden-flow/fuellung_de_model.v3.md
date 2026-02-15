# Füllung DE — Decision Model v3

**Version:** 3.0.0  
**Regulatory Context:** Deutschland 2025 (Amalgam-Ban, BEMA 13e-h, S3-Leitlinie)

---

## Änderungen v2 → v3

| Bereich | v2 | v3 |
|---------|----|----|
| Materialien | 3 (self_adhesive, bulk_fill, composite) | 4 (+giz separat) |
| Decisions | 8 | 11 (+anterior, +pediatric, +matrix) |
| Askbacks | 6 | 7 (+matrix_system) |
| Level-System | 2 (blocking/optional) | 3 (L1 blocking, L2 recommended, L3 optional) |
| Forbidden Derivations | - | 5 explizit dokumentiert |
| Cavity Extent | - | small/medium/large (triggert Layering) |
| Approx Contact | - | triggert Matrix-Askback |

---

## Askback-Architektur

### Level 1 (Blocking) — Ohne diese KEINE Abrechnung
1. **ab_insurance_context** — GKV-Regel vs MKV vs PKV
2. **ab_material_choice** — Self-Adhesive/GIZ vs Bulk-Fill vs Composite
3. **ab_adhesive_technique** — Nur bei Komposit Seitenzahn (BEMA 13e-h)

### Level 2 (Recommended) — Default vorhanden
4. **ab_layering_technique** — Bei mittel/groß
5. **ab_isolation_level** — Bei Adhäsiv oder schwieriger Feuchtigkeit
6. **ab_pulp_protection** — Bei tiefer Karies

### Level 3 (Optional) — Nur bei Trigger
7. **ab_matrix_system** — Bei Approximalkontakt

---

## Forbidden Derivations (NIEMALS ableiten)

| ID | Verboten | Warum |
|----|----------|-------|
| fd01 | Komposit → Adhäsiv: ja | Muss bestätigt werden |
| fd02 | GKV → self-adhesive | MKV-Option |
| fd03 | Tief → Pulpaschutz: ja | Behandler-Entscheidung |
| fd04 | Kofferdam nicht erwähnt → relativ | Askback bei Adhäsiv |
| fd05 | Material → Billing | Via Chip→SSOT→Catalog |

---

## Chip-Kategorien

| Kategorie | Chips |
|-----------|-------|
| Insurance | insurance_gkv_regel, insurance_gkv_mehrkosten, insurance_pkv, mkv_vorhanden |
| Material | material_self_adhesive, material_giz, material_bulk_fill, material_composite |
| Technique | technique_adhesive, technique_layering |
| Isolation | isolation_kofferdam, isolation_relative |
| Pulp | pulp_liner, pulp_base, pulp_protection_none |
| Matrix | matrix_sectional, matrix_tofflemire, matrix_none |

---

## Verifikation

✅ Keine Billing-Codes in v3 Knowledge  
✅ Jede Askback-Option setzt 1-2 Chips  
✅ 5 Forbidden Derivations dokumentiert  
✅ 3 Levels für UX-Priorisierung
