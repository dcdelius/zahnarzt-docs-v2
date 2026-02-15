# Settings Model (Praxis vs Benutzer vs Fall)

Ziel: Die Settings sollen sich wie eine reale Praxis anfuehlen: **Die Praxis stellt bereit (Inventar/Capabilities)**, der **Behandler hat Vorlieben (Defaults)**, und der **konkrete Fall entscheidet (Overrides pro Patient/Zahn)**.

## Grundprinzip (3 Ebenen)

1) **Praxis (Admin) = "Was ist moeglich / vorhanden?"**
- Geraete, Materialien, Systeme, erlaubte Optionen.
- Praxisweite Policies: "darf/ soll / muss" (z.B. Behandlungsangebot aktivieren/deaktivieren).
- Keine "Behandler-Meinung" als Default, sondern Verfuegbarkeit + Rahmen.

2) **Benutzer (Behandler) = "Wie arbeite ich meistens?"**
- Pro Behandlung: persoenliche Defaults/Shortcuts innerhalb der Praxis-Capabilities.
- Dokumentations-Stil (Textlaenge, Formulierungs-Praeferenzen, etc.).
- Optional: persoenliche Favoriten/Presets (z.B. Endo-Standard vs Revisions-Endo).

3) **Fall/Session (Page 2 Chips) = "Was ist bei diesem Patienten wirklich passiert?"**
- Aus Diktat + Rueckfragen + manuellen Toggles.
- Hat immer Vorrang vor Praxis/Benutzer-Defaults.

Merksatz: **Praxis = Inventar/Regeln**, **Benutzer = Defaults**, **Fall = Wahrheit**.

## Standard-Chips (Auto-On) fuer Dokumentation

Neben "Facts/Answers" gibt es eine zweite Kategorie: **Dokumentations-Standards**, die ein Behandler immer mitschreibt (z.B. Aufklaerung, Alternativen, Einverstaendnis, Okklusion, Politur).

Prinzip:
- **Benutzer** waehlt pro Behandlung Standard-Chips (Auto-On)
- Der Pipeline-Run aktiviert sie automatisch
- Im Control Center werden sie als **STD** angezeigt und sind pro Fall deaktivierbar

So bleibt der Flow "Defaults steuern die Pipeline, der Fall bleibt die Wahrheit" konsistent.

## Warum das wichtig ist (Docudent-Logik)

- Settings dueren **Facts seed-en**, nicht Billing/Codes.
- Praxis-Settings sollten nicht "WL-Methode" erzwingen, sondern z.B. sagen: "Apex Locator vorhanden, Roentgen verfuegbar".
- Der Behandler entscheidet pro Fall (und ueber seine Defaults), was er nutzt; die UI zeigt das als Chips mit Herkunft (Praxis/Benutzer/Fall).

## Settings-Baum (Vorschlag)

### Links: Behandlungen (Tree)
Behandlungen -> Kategorie -> Behandlung (wie jetzt).

### Rechts: je nach Scope unterschiedliche Inhalte

#### Scope: Praxis (Admin)
- **Praxis: Allgemein**
  - Inventar global: Mikroskop vorhanden, Motoren, Roentgen, Scanner, etc.
  - Material-Bibliotheken / Systeme (als Auswahl aus einem globalen Registry, nicht als Freitext):
    - Endo: Instrumentationssysteme, Sealer, Spuelloesungen
    - Fuellung: Adhaesivsysteme, Komposite, Matrices
  - Praxis-Policies:
    - Behandlungen aktiv (angeboten) / gesperrt
    - Pflicht/Standard-Hinweise, die im Control Center als "Praxis-Standard" auftauchen (reviewable)

- **Praxis: Behandlung X**
  - "Verfuegbar in dieser Praxis" (Capabilities pro Behandlung):
    - z.B. Endo: Reciproc vorhanden? Rotary vorhanden? Warm obturation? Mikroskop?
    - z.B. Chirurgie: Osteotomie-Set? Piezo? Nahtmaterial-Optionen?
  - Optional: "Praxis-Standards" als **Policy** (nicht als Behandler-Default)

#### Scope: Benutzer (Behandler)
- **Benutzer: Allgemein**
  - Dokumentationsstil (Textlaenge)
  - Allgemeine medizinische Defaults, die typischerweise persoenlich sind (z.B. LA-Typ-Praeferenz)
  - Optional: "Immer anzeigen" Chips / Askbacks-Profile

- **Benutzer: Behandlung X**
  - "Meine Defaults" innerhalb der Praxis-Capabilities:
    - Endo: bevorzuge Reciproc vs Rotary, WL-Methode, Spuelprotokoll, WF-Technik, Einlage
    - Fuellung: Adhaesivtechnik, Schichtung, Material-Praeferenzen
  - Optional: Presets (z.B. Endo-Standard / Revisions-Endo)

#### Scope: Fall/Session (nicht Settings-Seite)
- Wird im Control Center abgebildet: Chips mit Herkunft + Override-Mechanik.

## Konkretes Praxis-Beispiel (Endo)

### Praxis gibt vor (Capabilities / Inventar)
- Mikroskop: ja/nein (und ggf. welche Einheiten)
- Endo-Motor: vorhanden (rotary/reciproc faehig)
- Apex Locator: vorhanden
- Roentgen: vorhanden
- Verfuegbare Systeme:
  - Instrumentation: Reciproc-Systeme, Rotary-Systeme (Auswahl)
  - Obturation: kalt/warm/einzelstift (Auswahl)
  - Spuellosungen: NaOCl, EDTA, CHX (Auswahl) + Konzentration als Option (falls relevant)
  - Sealer: Auswahl aus Praxis-Bibliothek

### Behandler setzt Defaults (Preferences)
- Ich mache Endo **meist**:
  - WL: Apex Locator (ggf. "plus Kontrollroentgen")
  - Aufbereitung: Reciproc
  - Spuelprotokoll: NaOCl + EDTA
  - WF: warm
  - Einlage: Ca(OH)2 nur bei 2. Termin (als Default/Chip-Logik)

### Fall entscheidet (Override)
- Patient hat z.B. Anamnese/Kooperation -> anderes Vorgehen; Chips werden im Control Center angepasst.

## Migration/Refactor-Idee (bezogen auf aktuellen Stand)

Heutige Situation in V10:
- Praxis: `defaultWLMethod`, `defaultWFTechnique`, `defaultIrrigationProtocol` (sind oft Behandler-spezifisch)
- Benutzer: hat einige Defaults, aber Endo-Defaults sind noch teils gemischt

Vorschlag:
- Praxis behaelt **Verfuegbarkeit** (z.B. `endo.capabilities`) und "Behandlung aktiv" (Gating).
- Benutzer bekommt die **Wahl-Defaults** (WL/WF/Spuel etc.), jedoch nur aus den Praxis-Capabilities auswaehlbar.
- Control Center (Page 2) zeigt:
  - Praxis-Standards (policy-based, reviewable)
  - Benutzer-Defaults (preselected, reviewable)
  - Diktat-Erkannt (active)

## Datenmodell (grob, ohne Implementationsdetails)

### PracticeSettings
- `enabledTreatments[]`
- `inventory` (geraete/materialien/systeme)
- `treatments[endo].capabilities` (allowed values)
- optional `policies` (what is mandatory/reviewable)

### UserSettings
- `defaults` (allgemein)
- `treatments[endo].defaults` (preferred values)
- `presets[]` (optional)

### Session/Fall (runtime)
- `facts[]` + `overrides[]` mit provenance

## Nächster Schritt (Entscheidungen, die wir treffen muessen)

1) Welche Dinge sind **Praxis-Capability** (Inventory) vs echte **Praxis-Policy** (Standard/Muss)?
2) Welche Defaults sind wirklich **Benutzer** (WL/WF/Spuel/Technik) und sollten aus Praxis-Capabilities gespeist werden?
3) Welche Felder muessen pro Behandlung zuerst kommen (P0), damit der Flow Diktat -> Chips -> Final sauber ist?
