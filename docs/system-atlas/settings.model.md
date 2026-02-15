# Settings Model (V10)

Ziel: Eine klare, nicht-chaotische Trennung zwischen **Praxis** (was ist vorhanden/verfuegbar) und **Benutzer** (wie arbeitet der Behandler standardmaessig).

## Mental Model (einfach)

- **Praxis** = Inventar/Kapazitaeten
  - Welche Geraete und Materialien gibt es in der Praxis?
  - Das ist die "Auswahl-Liste", aus der Behandler spaeter waehlen koennen.
- **Benutzer** = Arbeitsweise/Defaults
  - Wie macht ein Behandler die Behandlung normalerweise?
  - Welche Standards sollen automatisch dokumentiert werden (Auto-On Chips)?

## UI Struktur

- Links: Behandlungen nach Kategorien (Tree)
  - Allgemein
  - Konservierend -> Fuellung, Cp/P
  - Endodontie -> Endo
  - ...

Rechts (Main):

- **Allgemein**
  - Praxis: globale Praxis-Defaults (z.B. Standard-Anaesthetikum, Standard-Textbausteine)
  - Benutzer: globale Defaults (Dokumentations-Standards, Anaesthesie-Defaults, Textlaenge, MKV, Advanced)

- **Pro Behandlung (z.B. Fuellung, Endo)**
  - Praxis: Inventar/Verfuegbarkeit + Materialkatalog fuer genau diese Behandlung
  - Benutzer: persoenliche Defaults/Arbeitsweise fuer genau diese Behandlung (nur das, was in Praxis verfuegbar ist)

## Datenmodell (SSOT)

- PracticeSettings
  - `inventory.*` (Capabilities, pro Behandlung)
  - `materialCatalog.*` (kuratiertes Material-Set, pro Behandlung)
  - `defaultAnestheticAgentId` (nur fuer Textvariablen, keine Hardcodes)
  - `chipStandards.*` (Praxisweite Dokumentations-Standards; sparsam nutzen)

- UserSettings
  - `chipStandards.global` (Auto-On Dokumentationschips)
  - `defaultLAType` (Standard-LA)
  - `defaultLATypeUkPosterior` (Override fuer UK Molaren: 36-38 / 46-48)
  - `treatments.*` (Behandlungs-spezifische Defaults, z.B. Fuellung: Schichtung, Matrix, Material-Defaults; Endo: WL/WF/Spuelung)

## Pipeline (warum Settings wichtig sind)

1. Diktat -> Extraction -> Facts
2. SettingsResolver -> fuellt nur dann Defaults, wenn Diktat nichts Konkretes liefert
3. Render-Labels werden aus Facts/Settings in `facts.render` abgeleitet (keine direkte Settings-Nutzung im Composer)
4. KB Engine (SSOT) -> Chips + Billing/Text
5. Control Center (Step 2) -> Chips sichtbar (STD = Auto-On), klickbar (an/aus)

## Regeln

- Praxis soll **nicht** "Arbeitsweise" festlegen (das ist Benutzer).
- Benutzer soll **nicht** Praxis-Inventar "erfinden" (Praxis begrenzt Auswahl).
- Billing/Text bleibt SSOT in der KB; Settings liefern nur Defaults/Variablen.
- Standard-Textbausteine (Praxis+Benutzer) nutzen die SSOT-Liste aus `src/docudent/v10/settings/docStandardChips.ts`.
- Composer/Renderer lesen **nur** Facts/Chips (Render-Labels via `facts.render`).
- Gate: `gate-v10-no-settings-in-composer.test.ts` verhindert direkte Settings-Zugriffe im Composer-Block.
