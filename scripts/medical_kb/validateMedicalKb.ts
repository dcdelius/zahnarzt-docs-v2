/**
 * Medical KB Validation Script
 *
 * Validates the medical_kb.v1.json against schema and source requirements:
 * 1. All 'medical' tagged rules must have sourceRefs
 * 2. All sourceRefs must reference valid anchors in sources.v1.yaml
 * 3. No duplicate rule IDs
 *
 * Run with: npx tsx scripts/medical_kb/validateMedicalKb.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

// Types
interface SourceRef {
    sourceId: string;
    anchorId: string;
    note?: string;
}

interface Rule {
    id: string;
    tags: string[];
    sourceRefs?: SourceRef[];
    active: boolean;
}

interface MedicalKB {
    rules: Rule[];
    askbacks: Array<{ id: string; sourceRefs?: SourceRef[]; category: string }>;
    chips: Array<{ id: string; sourceRefs?: SourceRef[] }>;
    defaults: Array<{ id: string; sourceRefs?: SourceRef[] }>;
}

interface SourceAnchor {
    anchorId: string;
}

interface Source {
    id: string;
    anchors: SourceAnchor[];
}

interface SourcesYaml {
    sources: Source[];
}

// Paths
const KB_PATH = path.join(process.cwd(), 'src/docudent/medical_kb/medical_kb.v1.json');
const SOURCES_PATH = path.join(process.cwd(), 'docs/medical/sources/sources.v1.yaml');

// Validation functions
export function loadMedicalKb(): MedicalKB {
    const content = fs.readFileSync(KB_PATH, 'utf-8');
    return JSON.parse(content) as MedicalKB;
}

export function loadSources(): SourcesYaml {
    const content = fs.readFileSync(SOURCES_PATH, 'utf-8');
    return yaml.parse(content) as SourcesYaml;
}

export function getValidAnchors(sources: SourcesYaml): Set<string> {
    const anchors = new Set<string>();
    for (const source of sources.sources) {
        for (const anchor of source.anchors || []) {
            anchors.add(`${source.id}::${anchor.anchorId}`);
        }
    }
    return anchors;
}

export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

export function validateMedicalKb(kb: MedicalKB, sources: SourcesYaml): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const validAnchors = getValidAnchors(sources);

    // 1. Check for duplicate rule IDs
    const ruleIds = new Set<string>();
    for (const rule of kb.rules) {
        if (ruleIds.has(rule.id)) {
            errors.push(`Duplicate rule ID: ${rule.id}`);
        }
        ruleIds.add(rule.id);
    }

    // 2. Check medical rules have sourceRefs
    for (const rule of kb.rules) {
        if (rule.tags.includes('medical')) {
            if (!rule.sourceRefs || rule.sourceRefs.length === 0) {
                errors.push(`Medical rule '${rule.id}' has no sourceRefs`);
            }
        }
    }

    // 3. Check all sourceRefs point to valid anchors
    const checkSourceRefs = (item: { id: string; sourceRefs?: SourceRef[] }, type: string) => {
        if (!item.sourceRefs) return;
        for (const ref of item.sourceRefs) {
            const key = `${ref.sourceId}::${ref.anchorId}`;
            if (!validAnchors.has(key)) {
                errors.push(`${type} '${item.id}' references invalid anchor: ${key}`);
            }
        }
    };

    for (const rule of kb.rules) {
        checkSourceRefs(rule, 'Rule');
    }

    for (const askback of kb.askbacks) {
        if (askback.category === 'medical') {
            if (!askback.sourceRefs || askback.sourceRefs.length === 0) {
                warnings.push(`Medical askback '${askback.id}' has no sourceRefs`);
            }
        }
        checkSourceRefs(askback, 'Askback');
    }

    for (const chip of kb.chips) {
        checkSourceRefs(chip, 'Chip');
    }

    for (const def of kb.defaults) {
        checkSourceRefs(def, 'Default');
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}

// CLI execution
if (require.main === module) {
    console.log('🔍 Validating Medical Knowledge Base...\n');

    const kb = loadMedicalKb();
    const sources = loadSources();
    const result = validateMedicalKb(kb, sources);

    if (result.warnings.length > 0) {
        console.log('⚠️  Warnings:');
        for (const warning of result.warnings) {
            console.log(`   - ${warning}`);
        }
        console.log('');
    }

    if (result.errors.length > 0) {
        console.log('❌ Errors:');
        for (const error of result.errors) {
            console.log(`   - ${error}`);
        }
        console.log('');
        console.log('Validation FAILED');
        process.exit(1);
    }

    console.log(`✅ Medical KB is valid!`);
    console.log(`   - ${kb.rules.length} rules`);
    console.log(`   - ${kb.askbacks.length} askbacks`);
    console.log(`   - ${kb.chips.length} chips`);
    console.log(`   - ${kb.defaults.length} defaults`);
    console.log(`   - ${sources.sources.length} sources with ${getValidAnchors(sources).size} anchors`);
}
