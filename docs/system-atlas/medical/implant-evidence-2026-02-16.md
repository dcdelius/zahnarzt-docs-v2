# Implant Evidence Notes (2026-02-16)

Scope: Treatment onboarding `implant` (V10 pack + KB + billing DB mapping).

## Source Anchors

1. GOZ Anlage 1 (amtlicher Verordnungstext):
- `9000` Implantatinsertion (enossales Implantat).
- `9040` Freilegen eines Implantats.
- URL: https://www.gesetze-im-internet.de/goz_1987/anlage_1.html

2. KZBV BEMA/GOZ entry point:
- Katalog-Referenzbasis für die Trennung GKV/PKV-Abrechnungswege.
- URL: https://www.kzbv.de/zahnaerzte/rechtsgrundlagen/bema-und-goz/gebuehrenverzeichnisse/

3. AWMF Leitlinien:
- Implantationszeitpunkte.
- Periimplantäre Infektionen.
- URLs:
  - https://www.awmf.org/service/awmf-aktuell/implantationszeitpunkte
  - https://www.awmf.org/service/awmf-aktuell/die-behandlung-periimplantaerer-infektionen-an-zahnimplantaten

## Engineering Decisions from Sources

1. Billing DB refs (no runtime hardcoding):
- `implant_insertion` -> `GOZ_9000`
- `implant_freilegung` -> `GOZ_9040`

2. Deterministic askbacks:
- `medical_implant_phase` (`insertion` | `freilegung`)
- `medical_implant_nachsorge` (`ja` | `nein`)

3. Architecture policy:
- Keine neuen hardcodierten Abrechnungscodes in UI/Runtime.
- Abrechnungsreferenzen ausschließlich über `billing_db.v1.json`.
