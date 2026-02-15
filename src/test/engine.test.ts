import { describe, expect, it } from 'vitest';
import { validateData } from '../engine/validate';
import { renderTemplate } from '../engine/render';
import { TemplateV3 } from '../types/templateV3';
import { MASTER_TEMPLATE_V3 } from '../data/masterTemplate';

const baseTemplate: TemplateV3 = {
    id: 'test_template',
    version: 1,
    title: 'Test Template',
    category: 'Test',
    systemVersion: 'v3',
    description: 'Mock template for engine tests',
    createdAt: '',
    updatedAt: '',
    fields: [
        { id: 'tooth', label: 'Zahn', type: 'string', required: true },
        { id: 'surfaces', label: 'Flächen', type: 'multiselect', required: true, options: ['m', 'o', 'd', 'b', 'l'] },
        { id: 'matrixUsed', label: 'Matrize', type: 'boolean' },
        { id: 'laUsed', label: 'Anästhesie', type: 'boolean' },
        { id: 'laType', label: 'LA Typ', type: 'enum', options: ['Infiltration', 'Leitung'] },
        { id: 'isolation', label: 'Trockenlegung', type: 'enum', options: ['Kofferdam', 'Relativ', 'Keine'] }
    ],
    rules: [
        { id: 'rule_matrix', when: [{ fieldId: 'surfaces', operator: 'contains', value: 'm' }], then: [{ type: 'require', targetFieldId: 'matrixUsed' }] },
        { id: 'rule_matrix_d', when: [{ fieldId: 'surfaces', operator: 'contains', value: 'd' }], then: [{ type: 'require', targetFieldId: 'matrixUsed' }] },
        { id: 'rule_isolation', when: [{ fieldId: 'isolation', operator: 'eq', value: 'Keine' }], then: [{ type: 'warn', message: 'Keine Trockenlegung!' }] }
    ],
    renderConfig: {
        blocks: [
            { id: 'b1', title: 'Übersicht', type: 'bullets', fields: ['tooth', 'surfaces', 'matrixUsed', 'laUsed', 'isolation'] },
            { id: 'b2', title: 'Verlauf', type: 'text', fields: ['tooth', 'surfaces'], template: 'Behandlung an Zahn {tooth}. Flächen: {surfaces}.' }
        ]
    }
};

const buildTemplate = () => JSON.parse(JSON.stringify(baseTemplate)) as TemplateV3;

const hasBlockingIssue = (result: ReturnType<typeof validateData>, fieldId: string) =>
    result.blockingIssues?.some(issue => (issue.path || (issue as any).fieldId) === fieldId);

describe('Template Engine Smoke Tests', () => {
    it('flags missing tooth as blocking', () => {
        const template = buildTemplate();
        const result = validateData(template, { surfaces: ['o'] });
        expect(hasBlockingIssue(result, 'tooth')).toBe(true);
    });

    it('requires matrix for approximal surfaces', () => {
        const template = buildTemplate();
        const result = validateData(template, { tooth: '16', surfaces: ['m', 'o'] });
        expect(hasBlockingIssue(result, 'matrixUsed')).toBe(true);
    });

    it('accepts matrix when provided', () => {
        const template = buildTemplate();
        const result = validateData(template, { tooth: '16', surfaces: ['m', 'o'], matrixUsed: true });
        expect(result.blockingIssues.some(issue => issue.fieldId === 'matrixUsed')).toBe(false);
    });

    it('warns when LA type missing but LA used', () => {
        const template = buildTemplate();
        template.rules.push({
            id: 'rule_la_complex',
            when: [
                { fieldId: 'laUsed', operator: 'eq', value: true },
                { fieldId: 'laType', operator: 'notExists' }
            ],
            then: [{ type: 'warn', message: 'LA Typ fehlt wirklich!' }]
        });

        const missingType = validateData(template, { tooth: '16', laUsed: true });
        expect(missingType.issues.some(issue => issue.message === 'LA Typ fehlt wirklich!')).toBe(true);

        const withType = validateData(template, { tooth: '16', laUsed: true, laType: 'Infiltration' });
        expect(withType.issues.some(issue => issue.message === 'LA Typ fehlt wirklich!')).toBe(false);
    });

    it('renders deterministically', () => {
        const template = buildTemplate();
        const data = { tooth: '16', surfaces: ['o'], matrixUsed: false };
        const first = renderTemplate(template, data);
        const second = renderTemplate(template, data);

        expect(first).toBe(second);
        expect(first).toContain('16');
    });

    it('flags missing surfaces when null values provided', () => {
        const template = buildTemplate();
        const result = validateData(template, { tooth: '16', surfaces: null, matrixUsed: null });
        expect(hasBlockingIssue(result, 'surfaces')).toBe(true);
    });

    it('renders extended master template fields', () => {
        const output = renderTemplate(MASTER_TEMPLATE_V3 as TemplateV3, {
            tooth: '16',
            surfaces: ['m', 'o'],
            anesthesia: 'Infiltration',
            isolation: 'Kofferdam',
            bmf: 'bMF zur Blutstillung',
            conditioning: 'Total-Etch',
            technique: 'Schichttechnik',
            matrix_system: 'Sectional Matrix',
            underfilling: 'Calciumhydroxid',
            pulp_capping: 'Cp',
            material: 'Tetric',
            polishing: true,
            fluoridation: 'Elmex',
            bite_registration: 'Okklusionsprüfung',
            xray: 'Einzelzahnaufnahme'
        });

        expect(output).toContain('Kofferdam');
        expect(output).toContain('Schichttechnik');
        expect(output).toContain('Elmex');
    });
});
