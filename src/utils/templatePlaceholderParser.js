/**
 * Utility to parse and extract placeholders from template text
 * Identifies required fields like [ZAHL], [BETRAG], [MATERIAL], etc.
 */

// Map of placeholder patterns to field configurations
const PLACEHOLDER_MAP = {
  '[ZAHL]': {
    label: 'Zahnnummer',
    type: 'number',
    required: true,
    placeholder: 'z.B. 37',
    pattern: /\[ZAHL\]/g
  },
  '[FLÄCHEN]': {
    label: 'Flächen',
    type: 'text',
    required: true,
    placeholder: 'z.B. OD, 2-flächig',
    pattern: /\[FLÄCHEN\]/g
  },
  '[BETRAG]': {
    label: 'Kosten',
    type: 'currency',
    required: true,
    placeholder: 'z.B. 90,00 €',
    pattern: /\[BETRAG\]/g
  },
  '[MATERIAL]': {
    label: 'Material',
    type: 'text',
    required: false, // Usually auto-filled from template
    placeholder: 'z.B. Komposit',
    pattern: /\[MATERIAL\]/g
  },
  '[ja/nein]': {
    label: 'Durchgeführt',
    type: 'checkbox',
    required: false,
    placeholder: '',
    pattern: /\[ja\/nein\]/g
  },
  '[Anästhesie-Art]': {
    label: 'Anästhesie-Art',
    type: 'text',
    required: false,
    placeholder: 'z.B. Intraligamentäre Anästhesie',
    pattern: /\[Anästhesie-Art\]/g
  },
  '[MENGE]': {
    label: 'Menge',
    type: 'text',
    required: false,
    placeholder: 'z.B. 1 Amp. Ultracain DS 1,7 ml',
    pattern: /\[MENGE\]/g
  },
  '[BEFUND]': {
    label: 'Befund',
    type: 'text',
    required: false,
    placeholder: 'Klinischer oder röntgenologischer Befund',
    pattern: /\[BEFUND\]/g
  },
  '[ERGEBNIS]': {
    label: 'Ergebnis',
    type: 'text',
    required: false,
    placeholder: 'z.B. Vitalitätsprüfung positiv',
    pattern: /\[ERGEBNIS\]/g
  },
  '[FARBE]': {
    label: 'Farbe',
    type: 'text',
    required: false,
    placeholder: 'z.B. A2',
    pattern: /\[FARBE\]/g
  },
  '[HINWEISE]': {
    label: 'Postoperative Hinweise',
    type: 'textarea',
    required: false,
    placeholder: 'z.B. 2 Stunden Nahrungspause',
    pattern: /\[HINWEISE\]/g
  },
  '[ZEITRAUM]': {
    label: 'Kontrolltermin',
    type: 'text',
    required: false,
    placeholder: 'z.B. 4 Wochen',
    pattern: /\[ZEITRAUM\]/g
  }
};

/**
 * Extract all unique placeholders from template text
 * @param {string} templateText - The template text containing placeholders
 * @returns {Array} Array of unique placeholder configurations
 */
export function parseTemplatePlaceholders(templateText) {
  if (!templateText || typeof templateText !== 'string') {
    return [];
  }

  const foundPlaceholders = new Map();

  // Check each known placeholder pattern
  Object.entries(PLACEHOLDER_MAP).forEach(([placeholder, config]) => {
    const matches = templateText.match(config.pattern);
    if (matches && matches.length > 0) {
      // Count occurrences to determine if it's critical (appears multiple times)
      const count = matches.length;
      foundPlaceholders.set(placeholder, {
        ...config,
        placeholder: placeholder,
        occurrences: count,
        // If appears multiple times, might be more important
        priority: count > 1 ? 'high' : 'normal'
      });
    }
  });

  // Convert to array and sort by priority (required first, then by occurrence count)
  return Array.from(foundPlaceholders.values())
    .sort((a, b) => {
      // Required fields first
      if (a.required && !b.required) return -1;
      if (!a.required && b.required) return 1;
      // Then by occurrence count
      return b.occurrences - a.occurrences;
    });
}

/**
 * Replace placeholders in template text with actual values
 * @param {string} templateText - Template text with placeholders
 * @param {Object} values - Object mapping placeholder to value (e.g., { '[ZAHL]': '37' })
 * @returns {string} Template text with placeholders replaced
 */
export function replacePlaceholders(templateText, values) {
  if (!templateText || typeof templateText !== 'string') {
    return templateText;
  }

  let result = templateText;
  Object.entries(values).forEach(([placeholder, value]) => {
    // Remove brackets for replacement
    const cleanPlaceholder = placeholder.replace(/[\[\]]/g, '');
    const regex = new RegExp(`\\[${cleanPlaceholder}\\]`, 'g');
    result = result.replace(regex, value || placeholder);
  });

  return result;
}

/**
 * Validate that all required fields are filled
 * @param {Array} placeholders - Array of placeholder configs from parseTemplatePlaceholders
 * @param {Object} values - Object with field values
 * @returns {Object} { valid: boolean, missing: Array<string> }
 */
export function validateRequiredFields(placeholders, values) {
  const required = placeholders.filter(p => p.required);
  const missing = required.filter(p => {
    const key = p.placeholder;
    const value = values[key];
    return !value || (typeof value === 'string' && value.trim() === '');
  });

  return {
    valid: missing.length === 0,
    missing: missing.map(m => m.label)
  };
}

/**
 * Get default value for a placeholder (e.g., from template material)
 * @param {string} placeholder - The placeholder key
 * @param {Object} template - The template object (may contain Material, etc.)
 * @returns {string|null} Default value or null
 */
export function getDefaultValue(placeholder, template) {
  if (placeholder === '[MATERIAL]' && template?.Material) {
    return template.Material;
  }
  return null;
}

