# Ueberkappung Evidence Notes (2026-02-16)

Scope: Treatment onboarding `ueberkappung` (V10 pack + KB + billing DB mapping).

## Source Anchors

1. KZBV BEMA PDF (Stand 2026):
- Position `25`: indirekte Ueberkappung zur Erhaltung der vitalen Pulpa.
- Position `26`: direkte Ueberkappung.
- PDF: https://www.kzbv.de/static/media/docs/kzbv_gebuehrenverzeichnisse_bema.pdf

2. GOZ legal text (Anlage 1):
- `2330`: indirekte Ueberkappung.
- `2340`: direkte Ueberkappung.
- URL: https://www.gesetze-im-internet.de/goz_1987/anlage_1.html

## Engineering Decisions from Sources

1. Billing DB refs:
- `ueberkappung_indirekt` -> `BEMA_25` / `GOZ_2330`
- `ueberkappung_direkt` -> `BEMA_26` / `GOZ_2340`

2. Evidence askbacks:
- Art der Ueberkappung (direkt/indirekt)
- Material

3. Architecture policy:
- Billing resolution only via DB references, no runtime billing literals in logic/UI.
