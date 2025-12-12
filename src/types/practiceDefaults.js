/**
 * User Practice Settings Schema
 * 
 * This configuration allows dentists to select their preferred standard procedures,
 * which will be injected into AI prompts for consistent documentation.
 * 
 * @typedef {Object} UserPracticeSettings
 * @property {string} standard_anamnesis_update - Standard text for anamnesis updates in routine checks (01)
 * @property {string} kons_isolation_method - Preferred isolation method for fillings (Kons)
 * @property {string} kons_anesthesia_type - Preferred anesthesia type for fillings
 * @property {string} kons_polishing_method - Preferred polishing method for fillings
 * @property {string} kons_matrix_system - Preferred matrix system for fillings
 * @property {string} kons_disclaimer_text - Legal safety/disclaimer text for fillings
 */

/**
 * Available dropdown options for User Practice Settings
 */
export const PRACTICE_DEFAULTS_OPTIONS = {
  // General / Routine (01) Standards
  standard_anamnesis_update: [
    { value: "no_changes", label: "Keine Änderungen (Anamnese geprüft)" },
    { value: "asked_regarding_changes", label: "Nach Änderungen gefragt, keine Meldung" },
    { value: "medication_checked", label: "Medikation geprüft, unverändert" },
    { value: "custom", label: "Eigener Text..." }
  ],

  // Restorative / Fillings (Kons) Standards
  kons_isolation_method: [
    { value: "cotton_rolls", label: "Watterollen / Absaugung" },
    { value: "rubber_dam", label: "Kofferdamm" },
    { value: "optidam", label: "OptiDam" },
    { value: "cotton_rolls_standard", label: "Standard: Watterollen, Kofferdamm bei Bedarf" },
    { value: "custom", label: "Eigener Text..." }
  ],

  kons_anesthesia_type: [
    { value: "infiltration", label: "Infiltration" },
    { value: "intraligamentary", label: "Intraligamentär" },
    { value: "conduction", label: "Leitungsanästhesie" },
    { value: "topical_only", label: "Nur Oberflächenanästhesie" },
    { value: "not_required", label: "Keine Anästhesie erforderlich" },
    { value: "custom", label: "Eigener Text..." }
  ],

  kons_polishing_method: [
    { value: "rubber_cups_paste", label: "Gummipolierer & Polierpaste" },
    { value: "soflex_discs", label: "Sof-Lex Scheiben" },
    { value: "optishine", label: "OptiShine" },
    { value: "diamond_burs", label: "Diamantschleifer" },
    { value: "custom", label: "Eigener Text..." }
  ],

  kons_matrix_system: [
    { value: "sectional_matrix", label: "Seitenmatrize (Sectional Matrix)" },
    { value: "circumferential_matrix", label: "Ringmatrize" },
    { value: "tofflemire", label: "Tofflemire-Matrize" },
    { value: "no_matrix", label: "Keine Matrize erforderlich" },
    { value: "custom", label: "Eigener Text..." }
  ],

  kons_disclaimer_text: [
    { 
      value: "standard_legal", 
      label: "Standard: Aufklärung über Alternativen, Risiken und Kosten erfolgt; Patient einverstanden" 
    },
    { 
      value: "detailed_legal", 
      label: "Detailliert: Aufklärung über Behandlungsalternativen, mögliche Risiken, Komplikationen und Kosten erfolgt; Patient informiert und einverstanden" 
    },
    { 
      value: "minimal", 
      label: "Minimal: Patient aufgeklärt und einverstanden" 
    },
    { 
      value: "custom", 
      label: "Eigener Text..." 
    }
  ]
};

/**
 * Default values for User Practice Settings
 * These will be used when a user hasn't configured their preferences yet
 */
export const DEFAULT_PRACTICE_SETTINGS = {
  standard_anamnesis_update: "no_changes",
  kons_isolation_method: "cotton_rolls_standard",
  kons_anesthesia_type: "infiltration",
  kons_polishing_method: "rubber_cups_paste",
  kons_matrix_system: "sectional_matrix",
  kons_disclaimer_text: "standard_legal"
};

/**
 * Get the display label for a setting value
 * @param {string} settingKey - The setting key (e.g., "kons_isolation_method")
 * @param {string} value - The value to look up
 * @returns {string} The display label or the value itself if not found
 */
export function getSettingLabel(settingKey, value) {
  const options = PRACTICE_DEFAULTS_OPTIONS[settingKey];
  if (!options) return value;
  
  const option = options.find(opt => opt.value === value);
  return option ? option.label : value;
}

/**
 * Get the full text for a setting value (for custom values, returns the stored text)
 * @param {string} settingKey - The setting key
 * @param {string} value - The value (or custom text if value is "custom")
 * @param {string} customText - Optional custom text if value is "custom"
 * @returns {string} The full text to use in prompts
 */
export function getSettingText(settingKey, value, customText = "") {
  if (value === "custom" && customText) {
    return customText;
  }
  
  const option = PRACTICE_DEFAULTS_OPTIONS[settingKey]?.find(opt => opt.value === value);
  if (option) {
    // Extract the actual text from the label (remove the "Standard:" prefix if present)
    return option.label.replace(/^Standard:\s*/, "");
  }
  
  return value;
}






