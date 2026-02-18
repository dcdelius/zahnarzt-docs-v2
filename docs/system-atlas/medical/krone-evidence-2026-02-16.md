# Krone Evidence Notes (2026-02-16)

Scope: Treatment onboarding `krone` (V10 pack + KB + billing DB mapping).

## Source Anchors

1. KZBV BEMA/GOZ entry point:
- Gebuehrenverzeichnisse als Referenzbasis fuer Kronenpositionen.
- URL: https://www.kzbv.de/zahnaerzte/rechtsgrundlagen/bema-und-goz/gebuehrenverzeichnisse/

2. GOZ legal text (Anlage 1):
- `2210`: Vollkrone (Hohlkehl- oder Stufenpraeparation).
- `2270`: Provisorium im direkten Verfahren mit Abformung.
- `5180`: Eingliederung Krone/Bruecke definitiv konventionell.
- URL: https://www.gesetze-im-internet.de/goz_1987/anlage_1.html

## Engineering Decisions from Sources

1. Billing DB refs:
- `krone_vollkrone` -> `BEMA_20a` / `GOZ_2210`
- `krone_provisorium` -> `BEMA_19` / `GOZ_2270`
- `krone_eingliederung_definitiv` -> `GOZ_5180`

2. Deterministic askbacks:
- Kronenart (`vollkrone` | `provisorium`)
- Eingliederungsart (`definitiv` | `provisorisch`)

3. Architecture policy:
- Keine hardcodierten Codes in UI/Runtime-Logik.
- Abrechnungsreferenzen ausschliesslich ueber `billing_db.v1.json`.
