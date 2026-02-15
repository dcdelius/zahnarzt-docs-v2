/**
 * Gate: Onboarding Links Are Valid
 *
 * Ensures file links in onboarding docs point to existing files.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Gate: Onboarding Links Are Valid', () => {
    const onboardingDir = path.join(process.cwd(), 'docs/v10/onboarding');

    function extractFileLinks(content: string): string[] {
        // Match patterns like [text](src/docudent/... or (src/docudent/...
        const regex = /\(src\/docudent\/[^)#]+/g;
        const matches = content.match(regex) || [];
        return matches.map(m => m.slice(1)); // Remove leading (
    }

    it('all src file links point to existing files', () => {
        if (!fs.existsSync(onboardingDir)) {
            console.log('Skipping: onboarding directory not yet created');
            return;
        }

        const files = fs.readdirSync(onboardingDir).filter(f => f.endsWith('.md'));
        const brokenLinks: string[] = [];

        for (const file of files) {
            const content = fs.readFileSync(path.join(onboardingDir, file), 'utf-8');
            const links = extractFileLinks(content);

            for (const link of links) {
                const filePath = path.join(process.cwd(), link);
                if (!fs.existsSync(filePath)) {
                    brokenLinks.push(`${file}: ${link}`);
                }
            }
        }

        expect(brokenLinks, `Broken links:\n${brokenLinks.join('\n')}`).toHaveLength(0);
    });

    it('onboarding docs exist', () => {
        const requiredDocs = [
            'index.md',
            'executive-summary.md',
            '60min-route.md',
            'full-circle-map.md',
            'debug-playbook.md',
        ];

        const missing: string[] = [];
        for (const doc of requiredDocs) {
            const docPath = path.join(onboardingDir, doc);
            if (!fs.existsSync(docPath)) {
                missing.push(doc);
            }
        }

        expect(missing, `Missing docs: ${missing.join(', ')}`).toHaveLength(0);
    });
});
