# Bruecke Evidence (2026-02-17)

Treatment ID: `bruecke`  
Status: basis for V10 beta onboarding

## 1) Regulatory / Billing Anchors

1. GOZ Anlage 1 (official):
   - https://www.gesetze-im-internet.de/goz_1987/anlage_1.html
   - Relevante Nummern fuer aktuelle Abbildung:
     - `5070`: Verbindung durch Brueckenglieder / Spanne
     - `5120`: Provisorische Bruecke im direkten Verfahren
2. G-BA Zahnersatz / Festzuschuss-Kontext:
   - https://www.g-ba.de/themen/zahnaerztliche-versorgung/zahnersatz/
3. KZBV Festzuschuss-Richtlinie (Regelwerk und Kombinationslogik):
   - https://www.kzbv.de/zahnaerzte/rechtsgrundlagen/festzuschuesse/richtlinie-und-beschluesse/

## 2) Clinical Anchor

1. AWMF Registernummer 083-003 (festsitzender Zahnersatz bei zahnbegrenzten Luecken):
   - https://www.awmf.org/service/awmf-aktuell/festsitzender-zahnersatz-fuer-zahnbegrenzte-luecken

## 3) Implementation Mapping (current beta)

- `bruecke_definitiv` -> `PKV: GOZ_5070`
- `bruecke_provisorisch` -> `PKV: GOZ_5120`
- `bruecke_kontrolle` -> documentation-only chip (no direct billing ref)

## 4) Notes

- GKV-Bereich laeuft im Produktkontext primär ueber Festzuschuss-/HKP-Systematik; daher aktuell bewusst keine direkte BEMA-Ziffernzuordnung im bruecke-beta-Pack.
- Erweiterungsschritte koennen Pfeiler-/Spannenlogik und differenzierte Befundkombinationen in eigener Obligationsstufe nachziehen.
