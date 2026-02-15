/**
 * Gate Test: V7 Must Use Settings Overrides Service
 *
 * ═══════════════════════════════════════════════════════════════
 * Ensures V7 admin/settings UI never calls setDoc/updateDoc on
 * settingsOverrides directly. All writes must go through the service.
 * ═══════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const V7_DIR = path.join(__dirname, '../../src/docudent/v7');

// Files that ARE allowed to write to Firestore directly
const ALLOWED_DIRECT_FIRESTORE_WRITES = [
    'core/settings/settingsOverridesService.ts', // The service itself
];

// Pattern to detect Firestore write imports
const FIRESTORE_WRITE_IMPORTS = /import\s*{[^}]*(setDoc|updateDoc|addDoc|writeBatch)[^}]*}\s*from\s*['"]firebase\/firestore['"]/;

// Pattern to detect settingsOverrides path usage
const SETTINGS_OVERRIDES_PATH = /settingsOverrides/i;

// Pattern to detect direct Firestore write calls
const DIRECT_WRITE_CALLS = /(setDoc|updateDoc|addDoc|writeBatch)\s*\(/;

function getAllTsFiles(dir: string): string[] {
    const files: string[] = [];

    if (!fs.existsSync(dir)) {
        return files;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...getAllTsFiles(fullPath));
        } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
            files.push(fullPath);
        }
    }

    return files;
}

function isAllowedFile(filePath: string): boolean {
    return ALLOWED_DIRECT_FIRESTORE_WRITES.some(allowed => filePath.includes(allowed));
}

describe('Gate: V7 Must Use Settings Overrides Service', () => {
    it('V7 files should not import Firestore write functions for settingsOverrides', () => {
        const v7Files = getAllTsFiles(V7_DIR);
        const violations: string[] = [];

        for (const filePath of v7Files) {
            if (isAllowedFile(filePath)) continue;

            const content = fs.readFileSync(filePath, 'utf8');

            // Check if file imports Firestore write functions
            const hasWriteImport = FIRESTORE_WRITE_IMPORTS.test(content);
            // Check if file mentions settingsOverrides
            const hasSettingsOverridesRef = SETTINGS_OVERRIDES_PATH.test(content);
            // Check if file has direct write calls
            const hasWriteCalls = DIRECT_WRITE_CALLS.test(content);

            // Violation: imports write functions AND mentions settingsOverrides
            if (hasWriteImport && hasSettingsOverridesRef) {
                violations.push(
                    `${path.relative(V7_DIR, filePath)}: ` +
                    `Imports Firestore write functions and references 'settingsOverrides'. ` +
                    `Use core/settings/settingsOverridesService instead.`
                );
            }
        }

        if (violations.length > 0) {
            const message = [
                '',
                '═══════════════════════════════════════════════════════════════',
                'GATE FAILURE: Direct Firestore writes to settingsOverrides in V7',
                '═══════════════════════════════════════════════════════════════',
                '',
                'V7 UI must use core/settings/settingsOverridesService for all',
                'settingsOverrides writes. Direct Firestore calls bypass validation.',
                '',
                'Violations:',
                ...violations.map(v => `  ❌ ${v}`),
                '',
                'Fix: Replace direct setDoc/updateDoc calls with:',
                '  import { createSettingsOverridesService } from "core/settings/settingsOverridesService";',
                '  const service = createSettingsOverridesService(db);',
                '  await service.writeSettingsOverride({ ... });',
                '',
            ].join('\n');

            expect.fail(message);
        }
    });

    it('V7 settings components should not define their own allowedValuesByPath', () => {
        const v7Files = getAllTsFiles(V7_DIR);
        const violations: string[] = [];

        // Pattern to detect hardcoded allowed values
        const HARDCODED_VALUES_PATTERN = /allowedValues\s*[:=]\s*\[|ALLOWED_VALUES|allowedValuesByPath/i;

        for (const filePath of v7Files) {
            // Exclude settingOptions.ts which provides UI labels (not logic)
            if (filePath.includes('settingOptions.ts')) continue;
            if (filePath.includes('.test.')) continue;

            const content = fs.readFileSync(filePath, 'utf8');

            if (HARDCODED_VALUES_PATTERN.test(content)) {
                // Check if it's importing from SSOT
                const importsFromContracts = content.includes('contracts/settingsUiRegistry') ||
                    content.includes('contracts/settingsValidator');

                if (!importsFromContracts) {
                    violations.push(
                        `${path.relative(V7_DIR, filePath)}: ` +
                        `Defines allowedValues without importing from contracts/. ` +
                        `Use contracts/settingsUiRegistry as SSOT.`
                    );
                }
            }
        }

        if (violations.length > 0) {
            const message = [
                '',
                '═══════════════════════════════════════════════════════════════',
                'GATE FAILURE: V7 defines own allowedValues without SSOT import',
                '═══════════════════════════════════════════════════════════════',
                '',
                'V7 must use contracts/settingsUiRegistry for allowed values.',
                '',
                'Violations:',
                ...violations.map(v => `  ❌ ${v}`),
                '',
            ].join('\n');

            expect.fail(message);
        }
    });
});

describe('Gate: Service Layer Exists and Is Used', () => {
    it('core/settings/settingsOverridesService.ts exists', () => {
        const servicePath = path.join(
            __dirname,
            '../../core/settings/settingsOverridesService.ts'
        );
        expect(fs.existsSync(servicePath)).toBe(true);
    });

    it('contracts/settingsValidator.ts exists', () => {
        const validatorPath = path.join(
            __dirname,
            '../../contracts/settingsValidator.ts'
        );
        expect(fs.existsSync(validatorPath)).toBe(true);
    });
});
