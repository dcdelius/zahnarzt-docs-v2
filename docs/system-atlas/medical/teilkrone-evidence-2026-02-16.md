# Teilkrone Evidence Notes (2026-02-16)

Scope: Treatment onboarding `teilkrone` (V10 pack + KB + billing DB mapping).

## Source Anchors

1. KZBV BEMA/GOZ entry point:
- Gebuehrenverzeichnisse als Referenzbasis fuer Teilkronen-Positionen.
- URL: https://www.kzbv.de/zahnaerzte/rechtsgrundlagen/bema-und-goz/gebuehrenverzeichnisse/

2. GOZ legal text (Anlage 1):
- `2220`: Teilkrone, Veneer.
- `2260`: Provisorium im direkten Verfahren ohne Abformung.
- `5180`: Eingliederung Krone/Bruecke definitiv konventionell.
- URL: https://www.gesetze-im-internet.de/goz_1987/anlage_1.html

3. KZV Berlin Festzuschuss-/BEMA-Referenz (Befundklasse 1):
- Teilkrone in Regelversorgung mit Bezug auf `BEMA 20c` / Provisorium `BEMA 19`.
- URL: https://www.kzv-berlin.de/fuer-praxen/abrechnung/wichtige-abrechnungsinfos/festzuschuesse-fuer-zahnersatz-teil-1-befundklasse-1

## Engineering Decisions from Sources

1. Billing DB refs:
- `teilkrone_definitiv` -> `BEMA_20c` / `GOZ_2220`
- `teilkrone_provisorium` -> `BEMA_19` / `GOZ_2260`
- `teilkrone_eingliederung_definitiv` -> `GOZ_5180`

2. Deterministic askbacks:
- Teilkronenart (`teilkrone` | `provisorium`)
- Eingliederungsart (`definitiv` | `provisorisch`)

3. Architecture policy:
- Keine hardcodierten Codes in UI/Runtime-Logik.
- Abrechnungsreferenzen ausschliesslich ueber `billing_db.v1.json`.
