# WSR Evidence Notes (2026-02-16)

Scope: Treatment onboarding `wsr` (V10 pack + KB + billing DB mapping).

## Source Anchors

1. KZBV BEMA 2026 (Stand 01.01.2026):
- Positionen `54` (WSR am trepanierten/am eroeffneten Zahn), `55` (WSR durch Osteotomie), Zuschlaege `WR1`/`WR2`.
- URL: https://www.kzbv.de/wp-content/uploads/2026_01_01_bema-1.pdf

2. GOZ Anlage 1 (amtlicher Verordnungstext):
- `3110`: Resektion einer Wurzelspitze an Frontzahn/Praemolar.
- `3120`: Resektion einer Wurzelspitze an Molar.
- URL: https://www.gesetze-im-internet.de/goz_1987/anlage_1.html

3. KZBV Patienteninformation zur WSR:
- Hinweis auf Abrechnung nach BEMA 54/55 und Zuschlaegen WR1/WR2 je Wurzel.
- URL: https://www.kzbv.de/wurzelspitzenresektion.157.de.html

4. AWMF S2k-Leitlinie Wurzelspitzenresektion (Registernr. 083-025):
- Klinische Grundlage fuer Indikation, Diagnostik und operatives Vorgehen.
- URL: https://register.awmf.org/de/leitlinien/detail/083-025

## Engineering Decisions from Sources

1. Billing DB refs (no runtime hardcoding):
- `wsr_bema_54` -> `BEMA_54`
- `wsr_bema_55` -> `BEMA_55`
- `wsr_goz_3110` -> `GOZ_3110`
- `wsr_goz_3120` -> `GOZ_3120`

2. Deterministic askbacks:
- `medical_wsr_zugang` (`trepaniert` | `osteotomie`) fuer GKV-Pfad.
- `medical_wsr_lokalisation` (`front_praemolar` | `molar`) fuer PKV-Pfad.

3. Architecture policy:
- Keine neuen hardcodierten Abrechnungscodes in UI/Runtime.
- Abrechnungsreferenzen ausschliesslich ueber `billing_db.v1.json`.
