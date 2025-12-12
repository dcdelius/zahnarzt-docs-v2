import { TemplateV3 } from '../knowledge/types';

interface RenderContext {
    template: TemplateV3;
    caseState: any;
    validation: any;
    acceptedSuggestions: any[];
    injectedText: string[];
    dictationRaw: string;
    dictationExtras: string[];
}

interface RenderResult {
    summary: string;
    procedure: string;
    forensic: string;
    billing: string;
    extras: string;
    fullText: string;
}

export const renderTemplateV3 = (ctx: RenderContext): RenderResult => {
    const { template, caseState, validation, acceptedSuggestions, injectedText, dictationRaw, dictationExtras } = ctx;
    const blueprint = template.blueprint || {};

    // 1. Prepare Data Context

    // Deduplicate injected text
    const uniqueInjectedText = Array.from(new Set(injectedText));

    // Helper: Format lists
    const formatList = (items: string[]) => items.filter(Boolean).map(i => `- ${i}`).join('\n');

    // 2. Prepare Data with Defaults
    const defaults = template.defaults || {};

    // Remove null/undefined/empty values from caseState so they don't override defaults
    const cleanCaseState = Object.fromEntries(
        Object.entries(caseState).filter(([_, v]) => v !== null && v !== undefined && v !== '')
    );

    const baseData = {
        ...defaults, // Apply defaults first
        ...cleanCaseState, // Override only with present values
        insuranceType: caseState.meta?.insuranceType || 'GKV',
        dictationRaw,
    };

    // 3. Derived Tokens
    let materialDisplay = baseData.material || '';
    if (baseData.material && baseData.shade) {
        materialDisplay += ` (${baseData.shade})`;
    }

    // Surfaces Pretty
    const surfacesShort = baseData.surfaces ? (Array.isArray(baseData.surfaces) ? baseData.surfaces.join('').toUpperCase() : String(baseData.surfaces).toUpperCase()) : '';
    const surfacesPretty = baseData.surfaces ? (Array.isArray(baseData.surfaces) ? baseData.surfaces.join(', ') : String(baseData.surfaces)) : '';

    const data: Record<string, any> = {
        ...baseData,

        // Enhanced Tokens
        surfacesShort,
        surfacesPretty,
        material: materialDisplay,

        // Lists as strings
        injectedText: uniqueInjectedText.join(' '),
        dictationExtras: dictationExtras.join(', '),

        // Special List Tokens
        billingLines: acceptedSuggestions
            .flatMap(s => s.billingItems || [])
            .map((b: any) => `${b.code} ${b.label}`)
            .join('\n'),

        billingTable: acceptedSuggestions
            .flatMap(s => s.billingItems || [])
            .map((b: any) => `- ${b.code} (${b.label})`)
            .join('\n'),

        // Procedure Lines: Only injected text (clinical steps)
        // Dictation Extras should be placed explicitly by the user (e.g. in Extras section)
        procedureLines: uniqueInjectedText.join('\n'),

        risksLines: caseState.risks ? caseState.risks.join('\n') : '',
        risks: caseState.risks ? caseState.risks.join(', ') : '',
    };

    // 2. Helper: Replace Placeholders with Smart Line Removal
    const replace = (text: string): string => {
        if (!text) return '';

        // 1. Replace tokens
        let processed = text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            const val = data[key];

            // Smart Missing Handling:
            // If value is missing, return empty string (do NOT remove entire line yet)
            if (val === undefined || val === null || val === '') {
                return '';
            }

            if (Array.isArray(val)) {
                if (val.length === 0) return '';
                return val.join(', ');
            }

            return String(val);
        });

        // 2. Post-process: Clean up artifacts from missing tokens
        processed = processed
            .replace(/\(\s*\)/g, '') // Remove empty parens ()
            .replace(/,\s*,/g, ',')  // Remove double commas
            .replace(/,\s*\./g, '.') // Remove comma before dot
            .replace(/[^\S\n]+/g, ' '); // Normalize spaces BUT preserve newlines

        // 3. Remove lines that are effectively empty (only punctuation or whitespace)
        return processed
            .split('\n')
            .map(line => line.trim())
            .filter(line => {
                // Keep line if it has alphanumeric content
                // Remove if it's just "Diagnose: " or "Zahn ()" (if parens weren't caught)
                // or just punctuation like ".,"
                const stripped = line.replace(/[^\w\säöüÄÖÜß]/g, '').trim();
                return stripped.length > 0;
            })
            .join('\n');
    };

    // 3. Render Sections
    const renderedSections: Record<string, string> = {};
    let fullTextParts: string[] = [];

    template.renderSpec.sections.forEach(section => {
        const blueprintText = template.blueprint?.[section.id] || '';
        const renderedContent = replace(blueprintText);

        if (renderedContent) {
            renderedSections[section.id] = renderedContent;

            // Add Header
            if (section.title) {
                fullTextParts.push(`=== ${section.title} ===`);
            }
            fullTextParts.push(renderedContent);
            fullTextParts.push(''); // Empty line after section
        }
    });

    return {
        summary: renderedSections.summary || '',
        procedure: renderedSections.procedure || '',
        forensic: renderedSections.forensic || '',
        billing: renderedSections.billing || '',
        extras: renderedSections.extras || '',
        fullText: fullTextParts.join('\n').trim()
    };
};

