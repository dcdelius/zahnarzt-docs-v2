// Script to update the "Füllungstherapie" template in Firebase
// Run this in the browser console while on the Settings page, or integrate into the app

const OPTIMIZED_TEMPLATE_TEXT = `**1) Leistungsübersicht (Abrechnung)**

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
Patient verließ die Praxis in stabilem Zustand.`;

// To use this:
// 1. Go to Settings page
// 2. Click on "Füllungstherapie" template to edit
// 3. Paste OPTIMIZED_TEMPLATE_TEXT into the "Vorlage erstellen" textarea
// 4. Save the template

console.log('Optimized template text ready. Copy and paste into Settings > Füllungstherapie > Text field.');
console.log('Template length:', OPTIMIZED_TEMPLATE_TEXT.length, 'characters');
console.log('Original was much longer. This version is:', Math.round((OPTIMIZED_TEMPLATE_TEXT.length / 2000) * 100), '% of typical length');

