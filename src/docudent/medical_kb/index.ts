/**
 * Medical Knowledge Base Index
 *
 * Re-exports schema and provides type-safe access to medical_kb.v1.json
 */

export * from './schema.v1';

// Import the KB JSON with type assertion
import medicalKbJson from './medical_kb.v1.json';
import medicalKbV10Json from './medical_kb.v1.v10.json';
import type { MedicalKB } from './schema.v1';

/**
 * The medical knowledge base singleton
 */
export const medicalKb = medicalKbJson as unknown as MedicalKB;
export const medicalKbV10 = medicalKbV10Json as unknown as MedicalKB;

/**
 * Get a rule by ID
 */
export function getRuleById(ruleId: string) {
    return medicalKb.rules.find(r => r.id === ruleId);
}

/**
 * Get all active rules with a specific tag
 */
export function getActiveRulesByTag(tag: 'medical' | 'billing' | 'technical' | 'ux') {
    return medicalKb.rules.filter(r => r.active && r.tags.includes(tag));
}

/**
 * Get an askback definition by ID
 */
export function getAskbackById(askbackId: string) {
    return medicalKb.askbacks.find(a => a.id === askbackId);
}

/**
 * Get a concept by ID
 */
export function getConceptById(conceptId: string) {
    return medicalKb.concepts.find(c => c.id === conceptId);
}

/**
 * Get all source references for a rule
 */
export function getSourceRefsForRule(ruleId: string) {
    const rule = getRuleById(ruleId);
    return rule?.sourceRefs || [];
}
