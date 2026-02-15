/**
 * Umfassendes zahnmedizinisches Wörterbuch
 * Für Google Speech-to-Text speechContexts
 */

export const dentalDictionary = {
  // Zahnflächen (Grundbegriffe)
  surfaces: [
    'mesial', 'distal', 'okklusal', 'okklusiv', 'bukkal', 'bukal', 'buccal',
    'palatinal', 'lingual', 'inzisal', 'inzisiv', 'vestibulär', 'vestibulär'
  ],

  // Flächen-Kombinationen (häufig gesprochen)
  surfaceCombinations: [
    'mesial okklusal distal', 'mesial okklusiv distal', 'mesial okklusal', 'okklusal distal',
    'distal okklusal mesial', 'distal okklusiv mesial',
    'bukkal okklusal', 'bukkal okklusiv', 'bukal okklusal', 'bukal okklusiv',
    'distal okklusal', 'distal okklusiv', 'mesial okklusal', 'mesial okklusiv',
    'palatinal okklusal', 'lingual okklusal', 'vestibulär okklusal'
  ],

  // Flächen-Abkürzungen (alle Varianten)
  surfaceAbbreviations: [
    'mod', 'm o d', 'm.o.d.', 'M O D', 'M.O.D.', 'MOD',
    'bod', 'b o d', 'b.o.d.', 'B O D', 'B.O.D.', 'BOD',
    'dop', 'd o p', 'd.o.p.', 'D O P', 'D.O.P.', 'DOP',
    'mob', 'm o b', 'm.o.b.', 'M O B', 'M.O.B.', 'MOB',
    'do', 'd o', 'd.o.', 'D O', 'D.O.', 'DO',
    'bo', 'b o', 'b.o.', 'B O', 'B.O.', 'BO',
    'mo', 'm o', 'm.o.', 'M O', 'M.O.', 'MO',
    'md', 'm d', 'm.d.', 'M D', 'M.D.', 'MD',
    'od', 'o d', 'o.d.', 'O D', 'O.D.', 'OD'
  ],

  // Anästhetika (alle Varianten und häufige Fehler)
  anesthetics: [
    'Ultracain', 'Ultracain Forte', 'Ultracain Dental', 'Ultracain D-S', 'Ultracain DS',
    'Ultracain Denker', 'Ultracain Denker Forte', 'Ultracain Suprarenin',
    'Ultrakain', 'Ultrakain Forte', 'Ultrakain Dental', 'Ultrakainforte',
    'Articain', 'Artikain', 'Articainhydrochlorid',
    'Lidocain', 'Lidokain', 'Lidocainhydrochlorid',
    'Mepivacain', 'Mepivakain', 'Mepivacainhydrochlorid',
    'Scandonest', 'Xylocain', 'Xylokain'
  ],

  // Bonding-Materialien
  bondingMaterials: [
    'Vivapen', 'Vivapen Universal', 'Vivaphen', 'Vivaphen Universal',
    'OptiBond', 'OptiBond FL', 'OptiBond All-In-One',
    'Adhese Universal', 'Adhese', 'Prime Bond', 'PrimeBond',
    'Clearfil SE Bond', 'Clearfil', 'SE Bond',
    'Scotchbond', 'Scotch Bond', 'Scotchbond Universal'
  ],

  // Komposit-Materialien
  compositeMaterials: [
    'Tetric EvoCeram', 'Tetric Evo Ceram', 'Tetric', 'EvoCeram',
    'Filtek', 'Filtek Supreme', 'Filtek Z250', 'Filtek Z350',
    'Grandio', 'GrandioSO', 'Grandio Flow',
    'Venus', 'Venus Diamond', 'Venus Pearl',
    'Charisma', 'Charisma Diamond', 'Charisma Opal',
    'Gaenial Flow', 'Genial Flow', 'Gaenial', 'Genial',
    'Estelite', 'Estelite Sigma', 'Estelite Flow',
    'Beautifil', 'Beautifil II', 'Beautifil Flow'
  ],

  // Isolation-Materialien
  isolationMaterials: [
    'Kofferdamm', 'Kofferdam', 'Rubber Dam', 'Gummispan',
    'OptiDam', 'Opti Dam', 'OptiDam Flexi', 'OptiDam Plus',
    'Hygenic', 'Hygenic Flexidam', 'Hygenic Flexi',
    'Isolation', 'Trockenlegung'
  ],

  // Polier-Materialien
  polishingMaterials: [
    'Sof-Lex', 'Sof Lex', 'Soflex', 'Sof-Lex Discs',
    'OptiShine', 'Opti Shine', 'OptiShine Polishing',
    'Polier', 'Politur', 'Polieren', 'Polierpaste',
    'Diamond Polish', 'Diamond Polishing'
  ],

  // Behandlungen und Verfahren
  treatments: [
    'Füllungstherapie', 'Füllung', 'Kompositfüllung', 'Kunststofffüllung',
    'Karies', 'Kariesexkavation', 'Kavität', 'Kavitätenpräparation',
    'Anästhesie', 'Lokalanästhesie', 'Infiltrationsanästhesie',
    'Matrize', 'Matrizenband', 'Keil', 'Spannring', 'Tofflemire',
    'Säure-Ätz-Technik', 'Säureätzung', 'Etching', 'Bonding',
    'Polymerisation', 'Lichthärtung', 'Lichtpolymerisation',
    'Finieren', 'Finierung', 'Polieren', 'Politur',
    'Approximalkontrollband', 'Approximalkontrolle'
  ],

  // Zahnnummern (FDI-Schema - alle Varianten)
  toothNumbers: [
    // Zahlen als Wörter
    'Zahn eins', 'Zahn zwei', 'Zahn drei', 'Zahn vier', 'Zahn fünf',
    'Zahn sechs', 'Zahn sieben', 'Zahn acht', 'Zahn neun', 'Zahn zehn',
    'Zahn elf', 'Zahn zwölf', 'Zahn dreizehn', 'Zahn vierzehn', 'Zahn fünfzehn',
    'Zahn sechzehn', 'Zahn siebzehn', 'Zahn achtzehn',
    'Zahn einundzwanzig', 'Zahn zweiundzwanzig', 'Zahn dreiundzwanzig',
    'Zahn vierundzwanzig', 'Zahn fünfundzwanzig', 'Zahn sechsundzwanzig',
    'Zahn siebenundzwanzig', 'Zahn achtundzwanzig',
    'Zahn einunddreißig', 'Zahn zweiunddreißig', 'Zahn dreiunddreißig',
    'Zahn vierunddreißig', 'Zahn fünfunddreißig', 'Zahn sechsunddreißig',
    'Zahn siebenunddreißig', 'Zahn achtunddreißig',
    // Zahlen mit "und"
    'Zahn eins eins', 'Zahn zwei sieben', 'Zahn drei sechs', 'Zahn zwei vier',
    'Zahn eins sieben', 'Zahn eins acht', 'Zahn zwei acht',
    // Zahlen als Ziffern
    'Zahn 11', 'Zahn 12', 'Zahn 13', 'Zahn 14', 'Zahn 15', 'Zahn 16', 'Zahn 17', 'Zahn 18',
    'Zahn 21', 'Zahn 22', 'Zahn 23', 'Zahn 24', 'Zahn 25', 'Zahn 26', 'Zahn 27', 'Zahn 28',
    'Zahn 31', 'Zahn 32', 'Zahn 33', 'Zahn 34', 'Zahn 35', 'Zahn 36', 'Zahn 37', 'Zahn 38',
    'Zahn 41', 'Zahn 42', 'Zahn 43', 'Zahn 44', 'Zahn 45', 'Zahn 46', 'Zahn 47', 'Zahn 48'
  ],

  // Weitere medizinische Begriffe
  otherTerms: [
    'Aufklärung', 'Einverständnis', 'Risiken', 'Alternativen',
    'Kostenaufklärung', 'GOZ', 'BEMA', 'Abrechnung',
    'Postoperativ', 'postoperativ', 'Nachsorge', 'Kontrolle',
    'Sensibilität', 'Empfindlichkeit', 'Schmerzen', 'Druck'
  ]
};

/**
 * Gibt alle Phrasen als flaches Array zurück (für Google Speech-to-Text)
 */
export function getAllDentalPhrases() {
  return [
    ...dentalDictionary.surfaces,
    ...dentalDictionary.surfaceCombinations,
    ...dentalDictionary.surfaceAbbreviations,
    ...dentalDictionary.anesthetics,
    ...dentalDictionary.bondingMaterials,
    ...dentalDictionary.compositeMaterials,
    ...dentalDictionary.isolationMaterials,
    ...dentalDictionary.polishingMaterials,
    ...dentalDictionary.treatments,
    ...dentalDictionary.toothNumbers,
    ...dentalDictionary.otherTerms
  ];
}

