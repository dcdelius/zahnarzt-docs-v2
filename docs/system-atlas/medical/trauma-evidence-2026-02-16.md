# Trauma Evidence Notes (2026-02-16)

Scope: Treatment onboarding `trauma` (V10 pack + KB + billing DB mapping).

## Source Anchors

1. KZBV BEMA 2026 (Stand 01.01.2026):
- `100` semipermanente Schienung.
- Quelle enthält die Regel: Behandlungen von Verletzungen/Erkrankungen des Gesichtsschädels werden nach GOÄ berechnet, sofern nicht im BEMA enthalten.
- URL: https://www.kzbv.de/wp-content/uploads/2026_01_01_bema-1.pdf

2. GOZ Anlage 1 (amtlicher Verordnungstext):
- `7070` semipermanente Schiene mit Abformung, Anfertigung und Eingliederung.
- URL: https://www.gesetze-im-internet.de/goz_1987/anlage_1.html

3. AWMF Leitlinie Dentales Trauma bleibender Zähne (Registernr. 083-004):
- Klinische Grundlage für Trauma-Klassifikation, Stabilisierung/Schienung und Nachsorge.
- URL: https://register.awmf.org/de/leitlinien/detail/083-004

## Engineering Decisions from Sources

1. Billing DB refs (no runtime hardcoding):
- `trauma_schienung_semipermanent` -> `BEMA_100` / `GOZ_7070`

2. Deterministic askbacks:
- `medical_trauma_art` (`luxation` | `fraktur` | `avulsion`)
- `medical_trauma_schienung` (`ja` | `nein`)
- `medical_trauma_kontrolle` (`ja` | `nein`, optional)

3. Architecture policy:
- Keine neuen hardcodierten Abrechnungscodes in UI/Runtime.
- Abrechnungsreferenzen ausschließlich über `billing_db.v1.json`.
