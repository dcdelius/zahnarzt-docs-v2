# Material Catalog (Fuellung P0)

Ziel: Praxen sollen aus einer kuratierten Liste (\"wie eine kleine Datenbank\") Materialien auswaehlen koennen, damit
- Benutzer spaeter **persoenliche Defaults** aus der Praxis-Verfuegbarkeit waehlen koennen (ohne Freitext-Chaos)
- die Dokumentation konsistent bleibt (SSOT bleibt die KB; Settings liefern nur Variablen/Defaults)

## Prinzip (SSOT + Auswahl)

- **Katalog (Code, read-only):** kuratierte Materialliste mit stabilen IDs.
- **Praxis-Settings (Firestore/local):** welche Katalog-Items sind in der Praxis verfuegbar?
- **Benutzer-Settings (Firestore/local):** persoenliche Defaults/Favoriten (aus Praxis-Auswahl).
- **Fall (Control Center):** kann alles ueberschreiben (Chips/Overrides).

## Aktueller Stand (P0)

- Katalog: `src/docudent/v10/registry/materialCatalog.ts`
- Praxis waehlt:
  - Standard-Anästhetikum (z.B. Ultracain) fuer Textbausteine
  - Materialkatalog fuer Fuellung (Praxis verfuegbar)
  in `src/docudent/v10/pages/SettingsPageV10.tsx`
- Benutzer waehlt (Fuellung):
  - Standard-Komposit (Marke) aus Praxis-Auswahl

## Dokumentation (Beispiel)

In der Fuellung-KB sind Textbausteine parametrisiert:
- `la_agent` (Default: Ultracain D-S)
- `fill_material` (Default: Komposit)

Pipeline setzt diese Variablen aus Settings, wenn kein konkreter Hinweis aus dem Diktat kommt.

KB: `src/docudent/core/billing/knowledgeBase/treatments/fuellung/unified.json`

## Naechste Schritte (P1)

- Favoriten pro Benutzer (mehr als 1 Default, z.B. Bulk vs Mehrschicht Presets)
- Material-Variablen fuer Adhaesiv/Matrix/Keile (nur wenn sinnvoll und nicht zu noisy)
- Optional: \"Material-Chips\" im Control Center (z.B. Materialwechsel pro Fall)

