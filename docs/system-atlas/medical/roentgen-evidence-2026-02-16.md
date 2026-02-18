# Roentgen Evidence Notes (2026-02-16)

Scope: Treatment onboarding `roentgen` (V10 pack + KB + billing DB mapping).

## Source Anchors

1. KZBV Gebuehrenverzeichnisse -> BEMA PDF:
- Page "Leistungen aus den Gebieten der konservierend-chirurgischen Leistungen" lists:
  - `Ae925` (incl. subset `a`): intraorale Aufnahme(n)
  - `Ae935` (incl. subset `d`): Panoramaaufnahme(n)
- URL entry point: https://www.kzbv.de/bema-goz-ebz/bema-und-goz/gebuehrenverzeichnisse/
- PDF: https://www.kzbv.de/static/media/docs/kzbv_gebuehrenverzeichnisse_bema.pdf

2. GOAE legal text (Gesetze im Internet), Anlage O:
- `5000`: intraorale Aufnahme
- `5004`: Panoramaaufnahme des Kiefers
- URL: https://www.gesetze-im-internet.de/go__1982/anlage.html

## Engineering Decisions from Sources

1. Billing DB refs:
- `roentgen_einzelzahn` -> `BEMA_Ä925a` / `GOZ_5000`
- `roentgen_opg` -> `BEMA_Ä935d` / `GOZ_5004`

2. Mandatory documentation askbacks for this treatment:
- indication
- type
- timing
- findings

3. Architecture policy:
- No hardcoded runtime billing codes in UI/core logic.
- Event bundle uses `billingRefIds`; code resolution comes from `billing_db.v1.json`.
