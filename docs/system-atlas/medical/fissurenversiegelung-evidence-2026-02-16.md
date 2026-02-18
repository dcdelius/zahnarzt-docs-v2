# Fissurenversiegelung Evidence Notes (2026-02-16)

Scope: Treatment onboarding `fissurenversiegelung` (V10 pack + KB + billing DB mapping).

## Source Anchors

1. KZBV BEMA PDF (Stand 2026):
- Position `IP5`: Fissurenversiegelung (Zaehne 6 und 7).
- PDF: https://www.kzbv.de/static/media/docs/kzbv_gebuehrenverzeichnisse_bema.pdf

2. GOZ legal text (Anlage 1):
- Position `2000`: Versiegelung von kariesfreien Zahnfissuren mit aushaertenden Kunststoffen, ggf. einschliesslich Polieren und Fluoridierung.
- URL: https://www.gesetze-im-internet.de/goz_1987/anlage_1.html

## Engineering Decisions from Sources

1. Billing DB ref (baseline):
- `fissurenversiegelung_standard` -> `BEMA_IP5` / `GOZ_2000`

2. Evidence askbacks for deterministic documentation quality:
- Indikation der Versiegelung
- Verwendetes Material

3. Architecture policy:
- No runtime hardcoded billing literals in logic/UI.
- Codes are resolved only via `billing_db.v1.json` references.
