import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheckCircle, FiAlertCircle, FiInfo } from 'react-icons/fi';
import { parseTemplatePlaceholders, validateRequiredFields, getDefaultValue } from '../utils/templatePlaceholderParser';

export default function PreDictationChecklist({ 
  template, 
  material, 
  onFieldsChange, 
  onValidationChange 
}) {
  const [fields, setFields] = useState({});
  const [placeholders, setPlaceholders] = useState([]);
  const [validation, setValidation] = useState({ valid: false, missing: [] });

  // Parse placeholders when template changes
  useEffect(() => {
    if (template?.Text || template?.text) {
      const templateText = template.Text || template.text;
      const parsed = parseTemplatePlaceholders(templateText);
      setPlaceholders(parsed);
      
      // Initialize fields with defaults
      const initialFields = {};
      parsed.forEach(placeholder => {
        const defaultValue = getDefaultValue(placeholder.placeholder, { Material: material });
        if (defaultValue) {
          initialFields[placeholder.placeholder] = defaultValue;
        }
      });
      setFields(initialFields);
    } else {
      setPlaceholders([]);
      setFields({});
    }
  }, [template, material]);

  // Validate when fields change
  useEffect(() => {
    const validationResult = validateRequiredFields(placeholders, fields);
    setValidation(validationResult);
    if (onValidationChange) {
      onValidationChange(validationResult.valid);
    }
    if (onFieldsChange) {
      onFieldsChange(fields);
    }
  }, [fields, placeholders, onValidationChange, onFieldsChange]);

  const handleFieldChange = (placeholder, value) => {
    setFields(prev => ({
      ...prev,
      [placeholder]: value
    }));
  };

  if (!template || placeholders.length === 0) {
    return null; // Don't show if no template or no placeholders
  }

  const requiredFields = placeholders.filter(p => p.required);
  const optionalFields = placeholders.filter(p => !p.required);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="mb-8 bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border-2 border-gray-200/50"
    >
      <div className="flex items-center gap-3 mb-6">
        <FiInfo className="text-blue-600 text-2xl" />
        <h3 className="text-xl font-bold text-[#22223b]">
          Erforderliche Informationen
        </h3>
        {validation.valid ? (
          <FiCheckCircle className="text-green-500 text-xl ml-auto" />
        ) : (
          <FiAlertCircle className="text-orange-500 text-xl ml-auto" />
        )}
      </div>

      {/* Required Fields */}
      {requiredFields.length > 0 && (
        <div className="mb-6">
          <div className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="text-red-500">*</span>
            Pflichtfelder
          </div>
          <div className="space-y-4">
            {requiredFields.map((placeholder) => (
              <FieldInput
                key={placeholder.placeholder}
                placeholder={placeholder}
                value={fields[placeholder.placeholder] || ''}
                onChange={(value) => handleFieldChange(placeholder.placeholder, value)}
                hasError={!fields[placeholder.placeholder] || fields[placeholder.placeholder].trim() === ''}
              />
            ))}
          </div>
        </div>
      )}

      {/* Optional Fields */}
      {optionalFields.length > 0 && (
        <div>
          <div className="text-sm font-semibold text-gray-700 mb-3">
            Optionale Informationen
          </div>
          <div className="space-y-4">
            {optionalFields.map((placeholder) => (
              <FieldInput
                key={placeholder.placeholder}
                placeholder={placeholder}
                value={fields[placeholder.placeholder] || ''}
                onChange={(value) => handleFieldChange(placeholder.placeholder, value)}
                hasError={false}
              />
            ))}
          </div>
        </div>
      )}

      {/* Validation Message */}
      {!validation.valid && validation.missing.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg"
        >
          <div className="text-sm text-orange-800">
            <strong>Bitte füllen Sie aus:</strong> {validation.missing.join(', ')}
          </div>
        </motion.div>
      )}

      {validation.valid && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg"
        >
          <div className="text-sm text-green-800 flex items-center gap-2">
            <FiCheckCircle className="text-green-600" />
            <strong>Alle Pflichtfelder ausgefüllt. Sie können jetzt mit der Diktation beginnen.</strong>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function FieldInput({ placeholder, value, onChange, hasError }) {
  const renderInput = () => {
    switch (placeholder.type) {
      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder.placeholder}
            className={`w-full px-4 py-2 rounded-lg border-2 transition-colors ${
              hasError
                ? 'border-red-300 focus:border-red-500'
                : 'border-gray-200 focus:border-[#ff9900]'
            } focus:outline-none bg-white`}
          />
        );
      
      case 'currency':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder.placeholder}
            className={`w-full px-4 py-2 rounded-lg border-2 transition-colors ${
              hasError
                ? 'border-red-300 focus:border-red-500'
                : 'border-gray-200 focus:border-[#ff9900]'
            } focus:outline-none bg-white`}
          />
        );
      
      case 'checkbox':
        return (
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={value === 'ja' || value === true}
              onChange={(e) => onChange(e.target.checked ? 'ja' : 'nein')}
              className="w-5 h-5 text-[#ff9900] rounded focus:ring-[#ff9900]"
            />
            <span className="text-sm text-gray-600">Ja</span>
          </div>
        );
      
      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder.placeholder}
            rows={3}
            className={`w-full px-4 py-2 rounded-lg border-2 transition-colors resize-none ${
              hasError
                ? 'border-red-300 focus:border-red-500'
                : 'border-gray-200 focus:border-[#ff9900]'
            } focus:outline-none bg-white`}
          />
        );
      
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder.placeholder}
            className={`w-full px-4 py-2 rounded-lg border-2 transition-colors ${
              hasError
                ? 'border-red-300 focus:border-red-500'
                : 'border-gray-200 focus:border-[#ff9900]'
            } focus:outline-none bg-white`}
          />
        );
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {placeholder.label}
        {placeholder.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {renderInput()}
      {placeholder.placeholder && (
        <p className="text-xs text-gray-500 mt-1">{placeholder.placeholder}</p>
      )}
    </div>
  );
}

