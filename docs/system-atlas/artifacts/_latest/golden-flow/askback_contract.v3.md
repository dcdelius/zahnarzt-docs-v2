# Askback Contract v3 — UX + Technical Matrix

**GP2: Askback-Design für minimale Fragen, maximaler Impact**

---

## Askback Contract Matrix

| ID | Frage (DE) | Level | Blocking | Trigger | Optionen | Chip Delta |
|----|------------|-------|----------|---------|----------|------------|
| ab_insurance_context | Abrechnungskontext? | 1 | ✓ | insurance==unknown | GKV-Regel / MKV / PKV | insurance_* |
| ab_material_choice | Material? | 1 | ✓ | material==unknown | Self-Adh / GIZ / Bulk / Komposit | material_* |
| ab_adhesive_technique | Adhäsiv angewendet? | 1 | ✓ | composite+posterior+unknown | Ja / Nein | technique_adhesive |
| ab_layering_technique | Schichttechnik? | 2 | ✗ | composite+medium/large | Mehrschicht / Einfach | technique_layering |
| ab_isolation_level | Isolation? | 2 | ✗ | adhesive+unknown | Kofferdam / Relativ | isolation_* |
| ab_pulp_protection | Pulpaschutz? | 2 | ✗ | deep+unknown | Liner / Base / Nein | pulp_* |
| ab_matrix_system | Matrize? | 3 | ✗ | approx+unknown | Sektional / Tofflemire / Keine | matrix_* |

---

## 5 kritische Askbacks (Hebel)

### 1. ab_insurance_context
**Warum kritisch:** Bestimmt gesamten Billing-Pfad (BEMA vs GOZ vs Mix)
- GKV-Regel → Self-Adhesive default
- MKV → Komposit + MKV-Chip
- PKV → Volle Freiheit

### 2. ab_material_choice
**Warum kritisch:** Material bestimmt Technik-Pflichten
- Self-Adhesive/GIZ → Kein Adhäsiv nötig
- Komposit/Bulk → Adhäsiv MUSS bestätigt werden (BEMA 13e-h)

### 3. ab_adhesive_technique
**Warum kritisch:** Abrechnungsfähigkeit bei GKV Seitenzahn
- Ohne Bestätigung → Keine BEMA 13e-h
- Bei "Nein" → Warning + ggf. Block

### 4. ab_isolation_level
**Warum kritisch:** S3-Qualität + Langzeiterfolg
- Kofferdam → Dokumentation "absolute Trockenlegung"
- Relativ → Default, wenn nicht explizit

### 5. ab_pulp_protection
**Warum kritisch:** Medizinische Korrektheit bei tiefer Karies
- Tiefe Karies + kein Schutz → Muss bewusste Entscheidung sein

---

## Anti-Doppelfragen-Regeln

| Situation | Verhalten |
|-----------|-----------|
| insurance=GKV-Regel + material=self_adhesive | Kein Material-Askback mehr |
| material=GIZ | Kein Adhäsiv-Askback (GIZ ist selbstadhäsiv) |
| cavity=small | Kein Layering-Askback (nicht nötig bei klein) |
| tooth_region=anterior | Kein Adhäsiv-Blocking (nur Seitenzahn kritisch) |

---

## UX Reihenfolge

```
1. ab_insurance_context (immer zuerst wenn unklar)
         ↓
2. ab_material_choice (wenn material unklar)
         ↓
3. ab_adhesive_technique (nur wenn composite+posterior)
         ↓
4. ab_layering_technique (nur wenn composite+medium/large)
         ↓
5. ab_isolation_level (nur wenn adhesive=yes)
         ↓
6. ab_pulp_protection (nur wenn deep)
         ↓
7. ab_matrix_system (nur wenn approx)
```

---

## Default-Verhalten

| Askback | Default | Grund |
|---------|---------|-------|
| ab_layering | yes | S3-Standard bei mittel/groß |
| ab_isolation | relative | Fallback wenn unklar |
| ab_pulp | none | Kein Schutz wenn nicht dokumentiert |
| ab_matrix | none | Keine Matrize wenn nicht approx |

---

## Wording (UX-optimiert)

### ab_insurance_context
> "Wie wird diese Behandlung abgerechnet?"
> - ○ Kassenleistung (GKV Standard)
> - ○ Kassenleistung mit Zuzahlung (MKV)
> - ○ Privatleistung (PKV)

### ab_adhesive_technique
> "Wurde Adhäsivtechnik (Ätzen/Primer/Bond) durchgeführt?"
> - ○ Ja
> - ○ Nein ⚠️ *Bei Seitenzahn-Komposit abrechnungsrelevant*
