/**
 * Material Analyzer - Analysiert und kategorisiert zahnmedizinische Materialien
 */

/**
 * Analysiert ein einzelnes Material und gibt die Kategorie zurück
 * @param {string} material - Materialname
 * @returns {string} - Kategorie (anesthesia, bonding, flow, composite, sealer, guttapercha, isolation, polish, cement, build-up, other)
 */
export function categorizeMaterial(material) {
  if (!material || typeof material !== 'string') return 'other';
  
  const materialLower = material.toLowerCase().trim();
  
  // Anästhesie
  if (materialLower.match(/\b(ultracain|articain|lidocain|mepivacain|xylocain|scandicain|citanest|anästhesie|lokalanästhesie|anesthesia)\b/)) {
    return 'anesthesia';
  }
  
  // Bonding/Adhäsiv
  if (materialLower.match(/\b(vivapen|adhese|optibond|prime|bond|adhäsiv|bonding|universal bond|adhesive)\b/)) {
    return 'bonding';
  }
  
  // Flow-Komposite
  if (materialLower.match(/\bflow\b/) && !materialLower.match(/\b(flowable|flowable composite)\b/)) {
    return 'flow';
  }
  
  // Komposit
  if (materialLower.match(/\b(tetric|filtek|grandio|venus|komposit|composite|evoceram|ceram|nano|diamond|supreme)\b/)) {
    return 'composite';
  }
  
  // Wurzelfüllung - Sealer
  if (materialLower.match(/\b(bioceramic sealer|ah plus|sealer|zement|cement)\b/)) {
    return 'sealer';
  }
  
  // Wurzelfüllung - Guttapercha
  if (materialLower.match(/\b(guttapercha|gutta|gp)\b/)) {
    return 'guttapercha';
  }
  
  // Wurzelfüllung - Medikamente
  if (materialLower.match(/\b(ultracal|ledermix|calciumhydroxid|calcium hydroxide)\b/)) {
    return 'medication';
  }
  
  // Isolation
  if (materialLower.match(/\b(kofferdamm|optidam|dam|isolation|rubber dam)\b/)) {
    return 'isolation';
  }
  
  // Polier
  if (materialLower.match(/\b(sof-lex|optishine|polier|polishing|diamant|diamond)\b/)) {
    return 'polish';
  }
  
  // Zement
  if (materialLower.match(/\b(zement|cement|glasionomer|fuji|glass ionomer)\b/)) {
    return 'cement';
  }
  
  // Aufbau
  if (materialLower.match(/\b(aufbau|build-up|core|stift|post)\b/)) {
    return 'build-up';
  }
  
  return 'other';
}

/**
 * Analysiert eine Material-String (komma-separiert oder zeilenweise) und gibt kategorisierte Materialien zurück
 * @param {string} materialString - Material-String (z.B. "Ultracain Dental, Vivapen universal, Tetric EvoCeram A3")
 * @returns {Object} - Kategorisierte Materialien
 */
export function analyzeMaterials(materialString) {
  if (!materialString || typeof materialString !== 'string') {
    return {
      categorized: {},
      raw: '',
      formatted: ''
    };
  }
  
  // Materialien extrahieren (komma-separiert oder zeilenweise)
  const materials = materialString
    .split(/[,\n]/)
    .map(m => m.trim())
    .filter(m => m.length > 0);
  
  const categorized = {
    anesthesia: [],
    bonding: [],
    flow: [],
    composite: [],
    sealer: [],
    guttapercha: [],
    medication: [],
    isolation: [],
    polish: [],
    cement: [],
    'build-up': [],
    other: []
  };
  
  // Jedes Material kategorisieren
  materials.forEach(material => {
    const category = categorizeMaterial(material);
    if (!categorized[category]) {
      categorized[category] = [];
    }
    categorized[category].push(material);
  });
  
  // Formatierten String erstellen (für Anzeige)
  const formatted = Object.entries(categorized)
    .filter(([category, materials]) => materials.length > 0)
    .map(([category, materials]) => {
      const categoryLabels = {
        anesthesia: 'Anästhesie',
        bonding: 'Bonding',
        flow: 'Flow',
        composite: 'Komposit',
        sealer: 'Sealer',
        guttapercha: 'Guttapercha',
        medication: 'Medikament',
        isolation: 'Isolation',
        polish: 'Polier',
        cement: 'Zement',
        'build-up': 'Aufbau',
        other: 'Sonstige'
      };
      return `${categoryLabels[category] || category}: ${materials.join(', ')}`;
    })
    .join('\n');
  
  return {
    categorized,
    raw: materialString,
    formatted
  };
}

/**
 * Gibt die deutsche Bezeichnung für eine Kategorie zurück
 */
export function getCategoryLabel(category) {
  const labels = {
    anesthesia: 'Anästhesie',
    bonding: 'Bonding',
    flow: 'Flow',
    composite: 'Komposit',
    sealer: 'Sealer',
    guttapercha: 'Guttapercha',
    medication: 'Medikament',
    isolation: 'Isolation',
    polish: 'Polier',
    cement: 'Zement',
    'build-up': 'Aufbau',
    other: 'Sonstige'
  };
  return labels[category] || category;
}

/**
 * Gibt die Farbe für eine Kategorie zurück (für UI)
 */
export function getCategoryColor(category) {
  const colors = {
    anesthesia: 'bg-blue-100 text-blue-800',
    bonding: 'bg-purple-100 text-purple-800',
    flow: 'bg-cyan-100 text-cyan-800',
    composite: 'bg-green-100 text-green-800',
    sealer: 'bg-orange-100 text-orange-800',
    guttapercha: 'bg-yellow-100 text-yellow-800',
    medication: 'bg-red-100 text-red-800',
    isolation: 'bg-gray-100 text-gray-800',
    polish: 'bg-pink-100 text-pink-800',
    cement: 'bg-indigo-100 text-indigo-800',
    'build-up': 'bg-teal-100 text-teal-800',
    other: 'bg-gray-100 text-gray-600'
  };
  return colors[category] || colors.other;
}






