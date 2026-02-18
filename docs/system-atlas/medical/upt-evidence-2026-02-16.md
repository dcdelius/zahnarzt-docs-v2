# UPT Evidence Notes (2026-02-16)

Scope: Treatment onboarding `upt` (V10 pack + KB + billing DB mapping).

## Source Anchors

1. KZBV BEMA/GOZ entry point:
- Gebuehrenverzeichnisse als Referenz fuer BEMA-UPT Positionen.
- URL: https://www.kzbv.de/zahnaerzte/rechtsgrundlagen/bema-und-goz/gebuehrenverzeichnisse/

2. KZBV Informationsseite PAR-Richtlinie:
- UPT als Bestandteil der PAR-Behandlungsstrecke.
- URL: https://www.kzbv.de/par-richtlinie.1587.de.html

3. G-BA Aktualisierung PAR-Richtlinie:
- Beschlusskontext zu UPT-Regelung (Inkrafttreten 01.07.2025).
- URL: https://www.g-ba.de/presse/pressemitteilungen-meldungen/1264/

## Engineering Decisions from Sources

1. Billing DB refs:
- `upt_grad_a` -> `BEMA_UPTa`
- `upt_grad_b` -> `BEMA_UPTb`
- `upt_grad_c` -> `BEMA_UPTc`

2. Deterministic askbacks:
- UPT-Grad (`a` | `b` | `c`)
- Recallintervall (`3-4_monate` | `6_monate` | `12_monate`)

3. Architecture policy:
- Keine hardcodierten Codes in UI/Runtime-Logik.
- Abrechnungsreferenzen ausschliesslich ueber `billing_db.v1.json`.
