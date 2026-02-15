# Anleitung: Füllungstherapie-Vorlage aktualisieren

## Optimierte Version

Die neue Vorlage ist **deutlich kürzer** und fokussiert auf:
- ✅ **Schnelle Abrechnung**: Leistungsübersicht am Anfang, kompakt
- ✅ **Forensisch relevant**: Nur notwendige Informationen
- ✅ **Platzhalter**: [ZAHL], [ja/nein], [BETRAG] etc. werden automatisch befüllt

## So aktualisieren Sie die Vorlage:

### Option 1: Über die Settings-UI (Empfohlen)

1. Öffnen Sie die **Settings**-Seite
2. Klicken Sie auf **"Vorlagen"** in der Sidebar
3. Suchen Sie **"Füllungstherapie"** und klicken Sie darauf
4. Scrollen Sie zum Bereich **"Vorlage erstellen"**
5. **Löschen Sie den alten Text** im Textfeld
6. **Fügen Sie die neue optimierte Vorlage ein** (siehe unten)
7. Klicken Sie auf **"Speichern"**

### Option 2: Direkt in Firebase Console

1. Öffnen Sie Firebase Console
2. Gehen Sie zu: `Praxen > 1 > Vorlagen > Füllungstherapie`
3. Bearbeiten Sie das Feld `Text`
4. Fügen Sie die neue Vorlage ein
5. Speichern

## Neue optimierte Vorlage (zum Kopieren):

```
**1) Leistungsübersicht (Abrechnung)**

Füllung Zahn [ZAHL] - [FLÄCHEN] - [BETRAG] €
[Anästhesie-Art] ([ja/nein])
Isolation mittels Kofferdamm ([ja/nein])
Matrize und Keil ([ja/nein])
Mehrschichttechnik ([ja/nein])
Trockenlegung in SÄT ([ja/nein])
Lichtgehärtet ([ja/nein])
Politur ([ja/nein])

**2) Behandlungsdokumentation (Praxisakte)**

Patient kommt zur Füllung an Zahn [ZAHL], Flächen: [FLÄCHEN].
Klinische Untersuchung: [BEFUND].
Vitalitätsprüfung: [ERGEBNIS].
Röntgenologisch: [BEFUND].
Aufklärung über Vor- und Nachteile durchgeführt, Patient einverstanden.
Kosten: [BETRAG] €, Farbe: [FARBE].
[Anästhesie-Art] mit [MENGE] durchgeführt.
Die Behandlung erfolgte unter Kofferdamm ([ja/nein]).
Zur Füllung wurde eine Matrize angelegt ([ja/nein]).
Keil und Spannring gesetzt ([ja/nein]).
Karies vollständig exkaviert.
Kavität mit Adhäsivtechnik vorbereitet.
Trockenlegung in SÄT durchgeführt ([ja/nein]).
Die Füllung wurde in Mehrschichttechnik gelegt ([ja/nein]).
Füllung mit [MATERIAL] schichtweise gelegt und lichthärtend polymerisiert ([ja/nein]).
Anatomische Ausformung hergestellt, Kontaktpunkt wiederhergestellt.
Okklusion geprüft und eingeschliffen.
Abschließend wurde die Füllung poliert ([ja/nein]).
Duraphat appliziert ([ja/nein]).
Postoperative Hinweise gegeben: [HINWEISE].
Kontrolltermin in [ZEITRAUM] vereinbart.
Patient verließ die Praxis in stabilem Zustand.
```

## Was wurde geändert?

### ✅ Entfernt (unnötig):
- Lange, detaillierte Beschreibungen
- Redundante Informationen
- Überflüssige Wiederholungen

### ✅ Beibehalten (forensisch wichtig):
- Aufklärung und Einverständnis
- Alle Behandlungsschritte chronologisch
- Materialien und Techniken
- Postoperative Hinweise
- Kontrolltermin

### ✅ Verbessert:
- **Leistungsübersicht am Anfang** → Schnell für Abrechnung
- **Kompakte Struktur** → Weniger Token, schnellere Verarbeitung
- **Klare Platzhalter** → GPT kann besser befüllen

## Platzhalter-Erklärung:

- `[ZAHL]` → Zahnnummer (z.B. 37)
- `[FLÄCHEN]` → Betroffene Flächen (z.B. OD, 2-flächig)
- `[BETRAG]` → Kosten (z.B. 90,00)
- `[ja/nein]` → Wurde durchgeführt? (wird aus Diktat extrahiert)
- `[Anästhesie-Art]` → Art der Anästhesie (z.B. Intraligamentäre Anästhesie)
- `[MENGE]` → Menge (z.B. 1 Amp. Ultracain DS 1,7 ml)
- `[BEFUND]` → Klinischer/Röntgenologischer Befund
- `[ERGEBNIS]` → Ergebnis der Vitalitätsprüfung
- `[FARBE]` → Füllungsfarbe (z.B. A2)
- `[MATERIAL]` → Verwendetes Material (z.B. Gaenial Flow A2)
- `[HINWEISE]` → Postoperative Hinweise
- `[ZEITRAUM]` → Kontrolltermin (z.B. 4 Wochen)

## Testen:

Nach dem Update:
1. Gehen Sie zum Dashboard
2. Wählen Sie "Füllungstherapie"
3. Machen Sie ein Test-Diktat
4. Prüfen Sie, ob alle Platzhalter korrekt befüllt werden

