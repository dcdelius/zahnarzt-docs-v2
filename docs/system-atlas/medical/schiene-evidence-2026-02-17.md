# Schiene Evidence (2026-02-17)

Treatment ID: `schiene`  
Status: basis for V10 beta onboarding

## 1) Regulatory / Billing Anchors

1. KZBV BEMA/GOZ Gebührenverzeichnisse (entry point):
   - https://www.kzbv.de/zahnaerzte/rechtsgrundlagen/bema-und-goz/gebuehrenverzeichnisse/
2. KZBV BEMA 2026 (Stand 01.01.2026), Teil 2 Kieferbruch / Aufbissbehelfe:
   - Positionen `K1`, `K2`, `K3`, `K6`, `K7`, `K8`, `K9`
   - Source PDF: https://www.kzbv.de/wp-content/uploads/2025/12/BEMA-2026_Internet.pdf
3. GOZ (official text), Abschnitt H Schienen:
   - GOZ `7000`, `7010`, `7020`, `7030`, `7040`, `7050`, `7060`
   - Source: https://www.gesetze-im-internet.de/goz_1987/anlage_1.html

## 2) Clinical Anchor

1. AWMF Leitlinie (S3) zu Okklusionsschienen bei Bruxismus:
   - https://register.awmf.org/de/leitlinien/detail/083-027

## 3) Implementation Mapping (current beta)

- `schiene_okklusionsschiene` -> `GKV: BEMA_K1`, `PKV: GOZ_7000`
- `schiene_protrusionsschiene` -> `PKV: GOZ_7010`
- `schiene_kontrolle` -> documentation-only chip (no direct billing ref)

## 4) Notes

- Mapping is intentionally conservative for beta onboarding.
- Additional BEMA-K subgroup differentiation (`K2/K3/K6-K9`) can be added once structured askbacks for repair/adjustment/protrusions-step are introduced.
