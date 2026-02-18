# Teilprothese Evidence Pack (2026-02-17)

Treatment ID: `teilprothese`  
Status: `beta` onboarding evidence for V10 pack + billing DB mapping

## Scope in this implementation

Implemented variants:
- `interim` -> chip `teilprothese_interim` -> billing ref via DB to `GOZ_5200` (PKV)
- `modellguss` -> chip `teilprothese_modellguss` -> billing ref via DB to `GOZ_5210` (PKV)
- optional follow-up: `kontrolle` -> chip `teilprothese_kontrolle` (no direct billing ref)

## Source anchors (online)

1. BZAEK GOZ commentary Nr. 5200 (Teilprothese mit einfachen, gebogenen Halteelementen)  
   https://www.bzaek.de/goz/goz-kommentar/prothetische-leistungen/goz-nr-5200.html
2. BZAEK GOZ commentary Nr. 5210 (Modellgussprothese mit gegossenen Halte-/Stuetzelementen)  
   https://www.bzaek.de/goz/goz-kommentar/prothetische-leistungen/goz-nr-5210.html
3. KZBV entry point for BEMA/GOZ fee catalogs (authoritative billing context)  
   https://www.kzbv.de/zahnaerzte/rechtsgrundlagen/bema-und-goz/gebuehrenverzeichnisse/
4. G-BA Festzuschuss-Richtlinie (current legal frame for GKV prosthetic regular care/fixed subsidy system; in force 01.01.2026)  
   https://www.g-ba.de/richtlinien/27/
5. GOZ regulation master page (legal basis of GOZ schedule)  
   https://www.gesetze-im-internet.de/goz_1987/

## Translation into product obligations

Derived obligations for `teilprothese` runtime:
- type differentiation is mandatory in askbacks (`interim` vs `modellguss`) before final output
- treatment phase (`eingliederung` vs `kontrolle`) must be captured for medically plausible process text
- billing code emission must come from billing DB references only; no hardcoded GOZ literals in treatment logic/UI
- optional control/follow-up can be documented as chip without forcing billing code creation

## Notes / risk handling

- This segment intentionally ships a conservative PKV mapping (`GOZ_5200`, `GOZ_5210`) with no new hardcoded GKV BEMA branch in pack logic.
- Any later GKV extension (e.g., nuanced BEMA prosthetics paths) should be added only through billing DB entries and combinability rules, not through UI-side constants.
