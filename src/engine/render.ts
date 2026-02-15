import { TemplateV3, RenderBlockConfig } from '../types/templateV3';

/**
 * Renders a single block based on configuration and data.
 */
const renderBlock = (block: RenderBlockConfig, data: Record<string, any>, fields: any[]): string => {
    let content = "";

    if (block.type === 'bullets') {
        const lines: string[] = [];
        block.fields.forEach(fieldId => {
            const value = data[fieldId];
            const fieldDef = fields.find(f => f.id === fieldId);

            if (value !== undefined && value !== null && value !== '' && fieldDef) {
                // Handle boolean true/false for simple flags
                if (fieldDef.type === 'boolean') {
                    if (value === true) {
                        lines.push(`- ${fieldDef.label}: Ja`);
                    }
                    // Don't show false usually, or maybe "Nein" if explicitly needed? 
                    // For now, only show if true or if it's a non-boolean value.
                } else if (Array.isArray(value)) {
                    if (value.length > 0) {
                        lines.push(`- ${fieldDef.label}: ${value.join(', ')}`);
                    }
                } else {
                    lines.push(`- ${fieldDef.label}: ${value}`);
                }
            }
        });
        if (lines.length > 0) {
            content = `**${block.title}**\n${lines.join('\n')}`;
        }
    } else if (block.type === 'text' && block.template) {
        // Simple template replacement
        let text = block.template;
        let hasContent = false;

        // Replace {fieldId} with value
        // We need to handle conditional sentences? 
        // For MVP, we assume the template is a set of sentences. 
        // If a variable is missing, we might leave it or remove the sentence?
        // Let's do simple replacement first.

        // Regex to find {fieldId}
        text = text.replace(/\{(\w+)\}/g, (match, fieldId) => {
            const value = data[fieldId];
            const fieldDef = fields.find(f => f.id === fieldId);

            if (value !== undefined && value !== null && value !== '') {
                hasContent = true;
                if (Array.isArray(value)) return value.join(', ');
                if (typeof value === 'boolean') {
                     // If field has a label, we might want to use it if true?
                     // But here we are inside a text template replacement.
                     // Usually "true" means "Yes" or the action happened.
                     return value ? 'Ja' : 'Nein'; 
                }
                return value;
            }
            // If boolean false, we might want to return "Nein" instead of "___" if it's a binary state?
            // But if value is undefined/null, we return placeholder.
            // If value is false (boolean), it enters the block above because false !== ''? No, false !== ''.
            // Wait: value !== '' is true for false.
            // value !== null is true. value !== undefined is true.
            // So false DOES enter the block above.
            // And returns 'Nein'.
            
            return "___"; // Placeholder for missing data
        });

        // If we want to be smarter: "If {laUsed} is true, add sentence..."
        // But for MVP, let's stick to the requested "Text Template".
        // Actually, the user requirement says: "Verlauf beschreibt Ablauf/Abweichungen".
        // Maybe we just join the values of the fields in this block if no template is provided?
        // Or we use the `template` string as the source of truth.

        if (hasContent) {
            content = `**${block.title}**\n${text}`;
        }
    }

    return content;
};

/**
 * Renders the full note.
 */
export const renderTemplate = (template: TemplateV3, data: Record<string, any>): string => {
    const blocks: string[] = [];

    template.renderConfig.blocks.forEach(block => {
        const blockText = renderBlock(block, data, template.fields);
        if (blockText) {
            blocks.push(blockText);
        }
    });

    return blocks.join('\n\n');
};
