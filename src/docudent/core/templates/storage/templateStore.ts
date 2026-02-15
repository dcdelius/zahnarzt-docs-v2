import { TemplateV3Spec, TemplateV3SpecSchema } from '../schema/templateV3Schema';

const STORAGE_KEY = 'sonia_v3_templates_admin';

export class TemplateStore {
    static loadAdminTemplates(): TemplateV3Spec[] {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];

            // Filter out invalid templates but try to load as many as possible
            return parsed.filter(item => {
                const result = TemplateV3SpecSchema.safeParse(item);
                if (!result.success) {
                    console.warn('Invalid template in storage:', item, result.error);
                    return false;
                }
                return true;
            });
        } catch (e) {
            console.error('Failed to load admin templates:', e);
            return [];
        }
    }

    static saveAdminTemplates(list: TemplateV3Spec[]): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
            // Dispatch event for real-time updates if needed
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('sonia-templates-changed'));
            }
        } catch (e) {
            console.error('Failed to save admin templates:', e);
        }
    }

    static upsertTemplate(template: TemplateV3Spec): void {
        const list = this.loadAdminTemplates();
        const index = list.findIndex(t => t.id === template.id);

        if (index >= 0) {
            list[index] = template;
        } else {
            list.push(template);
        }

        this.saveAdminTemplates(list);
    }

    static deleteTemplate(id: string): void {
        const list = this.loadAdminTemplates();
        const filtered = list.filter(t => t.id !== id);
        this.saveAdminTemplates(filtered);
    }

    static getTemplate(id: string): TemplateV3Spec | undefined {
        return this.loadAdminTemplates().find(t => t.id === id);
    }
}
