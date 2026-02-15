/**
 * Gate: Combinability Coverage
 *
 * Ensures every billing code present in unified.json (all treatments)
 * is covered by at least one combinability rule pattern.
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import kombinationen from '../../../core/billing/knowledgeBase/regeln/kombinationen.json';

function loadBillingCodes(): string[] {
    const treatmentsDir = path.resolve(process.cwd(), 'src/docudent/core/billing/knowledgeBase/treatments');
    const codes = new Set<string>();

    for (const dir of fs.readdirSync(treatmentsDir)) {
        const unifiedPath = path.join(treatmentsDir, dir, 'unified.json');
        if (!fs.existsSync(unifiedPath)) continue;
        const data = JSON.parse(fs.readFileSync(unifiedPath, 'utf8')) as {
            chips?: Array<{ billingRef?: unknown; billingRefs?: unknown[] }>;
            surface_mapping?: Array<{ billingRefs?: unknown[] }>;
        };

        const pushRef = (ref: unknown) => {
            if (!ref) return;
            if (typeof ref === 'string') {
                codes.add(ref);
                return;
            }
            if (Array.isArray(ref)) {
                ref.forEach(pushRef);
                return;
            }
            if (typeof ref === 'object') {
                const values = Object.values(ref as Record<string, unknown>);
                values.forEach(pushRef);
                const maybeCode = (ref as { code?: unknown }).code;
                if (typeof maybeCode === 'string') codes.add(maybeCode);
            }
        };

        for (const chip of data.chips ?? []) {
            if (chip.billingRef) pushRef(chip.billingRef);
            if (chip.billingRefs) pushRef(chip.billingRefs);
        }
        if (Array.isArray(data.surface_mapping)) {
            for (const mapping of data.surface_mapping) {
                if (mapping.billingRefs) pushRef(mapping.billingRefs);
            }
        }
    }

    return Array.from(codes);
}

function codeMatchesPattern(code: string, pattern: string): boolean {
    if (code === pattern) return true;
    return code.startsWith(pattern.replace(/_.+/, '_'));
}

describe('Gate: Combinability Coverage', () => {
    it('every billing code has a combinability rule', () => {
        const billingCodes = loadBillingCodes();
        const patterns = kombinationen.flatMap(rule => rule.betrifft ?? []);

        const missing = billingCodes.filter(
            code => !patterns.some(pattern => codeMatchesPattern(code, pattern))
        );

        expect(missing).toEqual([]);
    });
});
