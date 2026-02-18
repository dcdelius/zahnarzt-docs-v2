# Parodontologie Evidence Notes (2026-02-16)

Scope: Treatment onboarding `parodontologie` (V10 pack + KB + billing DB mapping).

## Source Anchors

1. KZBV BEMA/GOZ entry point:
- Gebuehrenverzeichnisse (BEMA/GOZ) als Referenzbasis fuer vertragszahnmedizinische Abrechnung.
- URL: https://www.kzbv.de/zahnaerzte/rechtsgrundlagen/bema-und-goz/gebuehrenverzeichnisse/

2. KZBV Informationsseite PAR-Richtlinie:
- Struktur der systematischen Parodontitistherapie (u. a. AIT/UPT-Kontext).
- URL: https://www.kzbv.de/par-richtlinie.1587.de.html

3. GOZ legal text (Anlage 1):
- `4000`: Erstellung und Dokumentation eines Parodontalstatus.
- `4070`: systematische Behandlung von Parodontopathien (geschlossenes Vorgehen, je einwurzeligem Zahn).
- `4075`: systematische Behandlung von Parodontopathien (geschlossenes Vorgehen, je mehrwurzeligem Zahn).
- URL: https://www.gesetze-im-internet.de/goz_1987/anlage_1.html

## Engineering Decisions from Sources

1. Billing DB refs:
- `parodontologie_status` -> `BEMA_04` / `GOZ_4000`
- `parodontologie_ait` -> `BEMA_AIT` / `GOZ_4070`
- `parodontologie_upt_a` -> `BEMA_UPTa`
- `parodontologie_upt_b` -> `BEMA_UPTb`
- `parodontologie_upt_c` -> `BEMA_UPTc`

2. Deterministic askbacks:
- PAR-Phase (`status` | `ait` | `upt`)
- UPT-Grad (`a` | `b` | `c`) falls Phase = `upt`

3. Architecture policy:
- Keine hardcodierten Abrechnungscodes in UI/Logik.
- Aufloesung ausschliesslich ueber `billing_db.v1.json`.
