# Untersuchung Evidence Notes (2026-02-16)

Scope: Treatment onboarding `untersuchung` (V10 pack + KB + billing DB mapping).

## Source Anchors

1. KZBV BEMA PDF (Stand 2026):
- Position `01`: Eingehende Untersuchung zur Feststellung von Zahn-, Mund- und Kieferkrankheiten.
- Position `Ae1`: Beratung eines Kranken.
- PDF: https://www.kzbv.de/static/media/docs/kzbv_gebuehrenverzeichnisse_bema.pdf

2. GOZ legal text (Anlage 1):
- Position `0010`: Eingehende Untersuchung zur Feststellung von Zahn-, Mund- und Kiefererkrankungen.
- URL: https://www.gesetze-im-internet.de/goz_1987/anlage_1.html

## Engineering Decisions from Sources

1. Billing DB ref (baseline):
- `untersuchung_eingehend` -> `BEMA_01` / `GOZ_0010`

2. Evidence askbacks for deterministic documentation quality:
- Anlass
- Befunde
- Beurteilung

3. Architecture policy:
- No runtime hardcoded billing literals in logic/UI.
- Codes are resolved only via `billing_db.v1.json` references.
