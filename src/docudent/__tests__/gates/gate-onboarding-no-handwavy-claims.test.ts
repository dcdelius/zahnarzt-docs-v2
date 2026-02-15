/**
 * Gate: Onboarding No Handwavy Claims
 *
 * Ensures onboarding docs have no TODO or ??? markers.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Gate: Onboarding No Handwavy Claims', () => {
    const onboardingDir = path.join(process.cwd(), 'docs/v10/onboarding');

    const forbiddenPatterns = [
        /\bTODO\b/,
        /\?\?\?/,
        /\bprobably\b/i,
        /\bmaybe\b/i,
        /\bshould work\b/i,
    ];

    it('no TODO/handwavy markers in onboarding docs', () => {
        if (!fs.existsSync(onboardingDir)) {
            console.log('Skipping: onboarding directory not yet created');
            return;
        }

        const files = fs.readdirSync(onboardingDir).filter(f => f.endsWith('.md'));
        const violations: string[] = [];

        for (const file of files) {
            const content = fs.readFileSync(path.join(onboardingDir, file), 'utf-8');
            const lines = content.split('\n');

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                for (const pattern of forbiddenPatterns) {
                    if (pattern.test(line)) {
                        violations.push(`${file}:${i + 1}: "${line.trim().slice(0, 50)}..."`);
                        break;
                    }
                }
            }
        }

        expect(violations, `Handwavy claims found:\n${violations.join('\n')}`).toHaveLength(0);
    });
});
