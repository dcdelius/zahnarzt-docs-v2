# V10 Testkatalog (medizinisch + Abrechnung)

Ziel: Klinisch plausible Dokumentation + korrekte Abrechnung mit nachvollziehbaren Regelketten.
Dieser Katalog ist die SSOT für Szenarien, Goldfälle und Grenzfälle.

## 1) Füllung (Fuellung) – Kernfälle
- 1fl / 2fl / 3fl (MOD) jeweils mit/ohne LA, mit/ohne Kofferdam
- Tiefe: caries profunda vs. oberflächlich
- Überkappung: keine, indirekt (Cp), direkt (P)
- Material: Komposit, Bulk, Flowable, GIZ
- Zusatz: Politur, Fluoridierung
- Versicherungen: GKV, MKV, PKV

**Erwartungen**
- Text: Material wird fließend eingebaut, LA/Kofferdam/Cp/P korrekt erwähnt
- Billing: BEMA 13/13b/13c + 12/40/IP4/25/26 je nach Logik
- MKV/PKV: passende GOZ-Komponenten (2060/2080/2100 etc.)

## 2) Endo – Kernfälle
- Vital vs. non-vital
- Aufbereitung + Spülung + Medikation
- Längenbestimmung/Arbeitslänge
- Kofferdam + LA
- Ein- vs. mehrwurzelig

**Erwartungen**
- Text: Aufbereitungsschritte + Medikation korrekt
- Billing: GOZ/BEMA-Kombis (inkl. ggf. Zusatzpositionen)

## 3) Extraktion – Kernfälle
- Einfach vs. operativ
- Wurzelreste, Naht, Antibiose
- LA vorhanden

**Erwartungen**
- Text: OP-Schritte, Naht, Aufklärung
- Billing: korrekte Extraktions-Positionen

## 4) Multi-Treatment Kombinierbarkeit
- Sitzung: Endo + Füllung + Extraktion
- Parallel: mehrere Zähne, unterschiedliche Versicherungen

**Erwartungen**
- Kombinierbarkeit: keine verbotenen Kombis
- Upsell: nur erlaubte Hinweise

## 5) Askback-Logik (Rückfragen)
- Fehlflächen → Surface-Askback
- Fehlmaterial → Material-Askback
- Fehlende LA/Isolation → passende Askbacks

**Erwartungen**
- Fragen erscheinen nur, wenn Fakten fehlen
- Antworten wirken auf Chips/Text/Billing

## 6) Settings-Propagation (kritisch)
- Praxis: Geräte/Materiallisten gesetzt
- Benutzer: Standard-Material / Standard-Isolation / Standard-Chips gesetzt

**Erwartungen**
- **Facts**: Defaults landen in `facts`
- **Chips**: Standard-Chips aktiv
- **Text**: Material-Defaults fließend integriert
- **Billing**: Defaults beeinflussen Codes korrekt (z.B. MKV bei Mehrkosten-Setup)

## 7) MKV / Mehrkosten-Details
- MKV explizit genannt
- MKV Betrag + Begründung
- „Nur Kasse“ Override

**Erwartungen**
- Text: Mehrkostenvereinbarung + Begründung
- Billing: GOZ-Addon korrekt, keine GOZ bei „nur Kasse“

## 8) Regression Gates (SSOT)
- Keine Chips ohne KB
- Askback-ID existiert
- SettingsSchema → Resolver → Facts → Chips → Text/Billing

**Erwartungen**
- Gate-Tests grün

## 9) Goldfälle (medizinisch reviewed)
Mindestens 5 pro Behandlung (Füllung, Endo, Extraktion):
- Realistische Diktate
- Erwarteter Zieltext + Codes (Gold-Output)

## Nächste Umsetzungsschritte
1. Szenarien für Endo/Extraktion erstellen (analog zu `scenarios.v10.fuellung.json`)
2. Multi-Treatment Szenarien (neuer Runner)
3. Settings-Propagation Tests ergänzen
4. Gold-Output Suite reaktivieren
