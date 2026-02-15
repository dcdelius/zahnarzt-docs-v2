# Fuellung Settings: Praxis vs Benutzer (Scope Plan)

> **Design-Ziel:** Settings fuehlen sich wie eine reale Praxis an:  
> **Praxis stellt bereit (Capabilities)** -> **Behandler setzt Defaults (Preferences)** -> **Fall entscheidet (Overrides via Chips)**.

---

## TL;DR (ein Satz)

**Praxis** definiert Inventar/Verfuegbarkeit (Systeme/Materialien/Tools) und ggf. Policies;  
**Benutzer** definiert persoenliche Defaults innerhalb dieser Capabilities;  
**Fall** ueberschreibt alles im Control Center.

---

## 1) Praxis-Realitaet (Mental Model)

Eine Fuellung ist kein einzelner Schalter, sondern eine Pipeline aus Bausteinen:

1. Anästhesie (keine / Infiltration / Leitung)
2. Isolation (Kofferdam vs relative Trockenlegung)
3. Kariesmanagement (tief? -> Ueberkappung/Liner/Base; ein- vs zweizeitig)
4. Matrize/Keile (sektional / Tofflemire / Strip / keine)
5. Adhaesiv-Protokoll (etch&rinse / self-etch / selective-etch; plus Produkt)
6. Material/Schichtung (bulk vs mehrschicht; flowable base)
7. Lichthaertung (Lampe/Modus; praxisabhaengig)
8. Finishing/Politur + Okklusion (praxisstandard vs persoenlich)
9. Dokumentationsstil (wie detailliert; persoenliche Phrasen)

**Behandler unterscheiden sich vor allem bei 4-6** (Matrix, Adhaesiv, Schichtung) und teils 1-3 (LA/Isolation/Ueberkappung).

---

## 2) Scope Mapping (was gehoert wohin?)

| Ebene | Frage | Typische Inhalte | Darf Billing erzwingen? |
|---|---|---|---|
| Praxis (Admin) | "Was ist in der Praxis verfuegbar/erlaubt?" | Capabilities/Inventar, Material-Bibliotheken, Geraete, Behandlung aktiv/inaktiv | Nein (nur Facts seed-en) |
| Benutzer (Behandler) | "Wie arbeite ich meistens?" | Defaults/Praeferenzen pro Behandlung (aus Praxis-Inventar) | Nein (nur Facts seed-en) |
| Fall/Session (Control Center) | "Was ist heute passiert?" | Overrides pro Zahn/Behandlung, Rueckfragen-Antworten | Nein (Renderer bleibt SSOT) |

---

## 3) Praxis (Admin): Inventar/Capabilities fuer Fuellung

**Warum Praxis?** Damit der Behandler nur Dinge auswaehlen kann, die wirklich vorhanden sind.

**Capabilities (P0/P1)**:
- Komposit-Systeme: Bulk-Fill verfuegbar? Schichtkomposit? Flowable?
- Adhaesiv-Systeme: Universal vorhanden? Etch&rinse moeglich? (Aetzgel vorhanden?)
- Matrizen: sektional? Tofflemire? Strip (Front)?
- Isolation: Kofferdam-Set vorhanden?
- Ueberkappung/Liner: welche Materialien sind als Praxisbibliothek verfuegbar?
- Geraete: Polymerisationslampe (optional spaeter), Sandstrahl etc. (spaeter)

**Praxis-Policies (spaeter, P1/P2):**
- Reviewable Standards (z.B. Okklusionskontrolle/Politur als "Praxis-Standard" Chip)
- Behandlung "Fuellung" aktiv/inaktiv (gating)

---

## 4) Benutzer (Behandler): Defaults/Praeferenzen (nur aus Inventar)

**Praeferenzen, die wirklich zwischen Behandlern variieren:**
- Default Isolation: Kofferdam vs relativ
- Default Ueberkappung: none / indirekt / direkt + Materialpraeferenz
- Default Adhaesivtechnik: (z.B. universal: self-etch vs selective etch)
- Default Schichtung: Bulk vs Mehrschicht + Flowable base ja/nein
- Default Matrizen-System: sektional vs Tofflemire (optional P1)

**Regel:** Benutzer-Defaults sind "preselected facts" -> im Fall jederzeit abschaltbar.

### 4.1) (Neu, P0) Dokumentations-Standards als Chips (Auto-On)

Viele Dinge sind **kein "Fakt" aus dem Diktat**, sondern ein **wiederkehrender Dokumentations-Standard** des Behandlers:
- Aufklaerung erfolgt
- Alternativen besprochen
- Risiken besprochen
- Einverstaendnis eingeholt
- Okklusion kontrolliert
- Politur/Finierung

**Umsetzungsidee (P0, zum Testen ohne Bestaetigung):**
- Benutzer waehlt pro Behandlung eine Liste von **Standard-Chips**
- Diese Chips werden im Pipeline-Run **automatisch aktiviert** (Auto-On)
- Im Control Center (Step 2) werden sie als **STD** markiert und sind **pro Fall deaktivierbar**

Das ist das Kernprinzip: **Defaults steuern die Pipeline, der Fall bleibt die Wahrheit**.

---

## 5) Priorisierung (P0 -> P2)

### P0 (entscheidend fuer Diktat -> Chips -> Final)
- Isolation default (Praxis default ok; Benutzer kann ueberschreiben)
- LA default (Benutzer)
- Ueberkappung (none/direkt/indirekt) + Material (Benutzer)
- Adhaesivtechnik default (Benutzer, aus Praxis-Capabilities)
- Schichtung default (Benutzer, aus Praxis-Capabilities)
- Dokumentations-Standards als Chips (Benutzer, Auto-On, im Control Center deaktivierbar)

### P1 (macht es "praxisnah" und reduziert Rueckfragen)
- Matrix-System default (Benutzer) + Praxis Capabilities
- Flowable base default (Benutzer) + Praxis Capabilities
- Politur/Okklusionskontrolle als reviewable Praxis-Standard (Policy)

### P2 (produktstark, spaeter)
- Registry/Marken + Textbaustein-Qualitaet (Renderer bleibt SSOT)
- Presets pro Behandler (Standard-Fuellung vs Profunda/tiefe Karies)
- Front/Seitenzahn Sub-Defaults

---

## 6) Settings UI (Wireframe)

```text
Behandlungen
  Konservierend
    Fuellung

Rechts:
  [Praxis] [Benutzer]

  Praxis -> Inventar
    - Bulk-Fill verfuegbar [on/off]
    - Universal-Adhaesiv verfuegbar [on/off]
    - Aetzgel verfuegbar [on/off]
    - Sektionale Matrizen [on/off]
    - Tofflemire [on/off]
    - Flowable verfuegbar [on/off]
    - Capping-Materialien (Liste/Registry)

  Benutzer -> Meine Defaults
    - Adhaesivtechnik [Dropdown] (nur erlaubte Optionen)
    - Schichtung [Dropdown] (Bulk nur wenn Praxis Bulk-Fill)
    - Ueberkappung [Dropdown] + Material [Dropdown] (nur Praxis-Bibliothek)
    - (P1) Matrix-System [Dropdown] (nur wenn Praxis Matrix-System vorhanden)
```

---

## 7) Datenmodell (minimal, kompatibel mit aktuellem Ansatz)

### PracticeSettings.inventory.fuellung (neu, analog Endo)

- `kofferdamKit?: boolean`
- `bulkFill?: boolean`
- `flowableComposite?: boolean`
- `adhesiveUniversal?: boolean`
- `adhesiveEtchRinse?: boolean`
- `etchGel?: boolean`
- `sectionalMatrix?: boolean`
- `tofflemireMatrix?: boolean`
- (spaeter) `stripMatrix?: boolean`
- Capping-Materialien weiterhin ueber Praxis-Listen/Registry

### UserSettings.treatments.fuellung (Defaults)

- `defaultAdhesiv` (nur wenn in Inventar erlaubt)
- `defaultSchichtung` (bulk/mehrschicht; bulk nur wenn `bulkFill`)
- `defaultCappingMode` (none/direkt/indirekt) + `defaultCappingMaterial` (nur wenn Praxisbibliothek)
- (P1) `defaultMatrixSystem` (sectional/tofflemire/none)

---

## 8) Naechste Schritte (konkret)

1) Fuellung: Praxis-Inventarfelder definieren (toggles) + speichern (Firestore/local)
2) Fuellung: Benutzer-Defaults nur aus Inventar auswählbar + Auto-Sanitize, wenn Inventar etwas deaktiviert
3) Migration: falls bisher Praxis-Fuellung Defaults existieren, einmalig pro Benutzer uebernehmen (wie bei Endo)
