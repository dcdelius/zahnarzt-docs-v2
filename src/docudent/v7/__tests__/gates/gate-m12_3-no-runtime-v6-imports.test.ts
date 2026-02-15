/**
 * Gate M12.3: No Runtime V6 Imports
 *
 * GATE DEFINITION:
 * No non-archive code may import from src/docudent/v6/**.
 * V6 is archived/reference-only, not in the live path.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Directories that SHOULD NOT have V6 imports
const RUNTIME_DIRS = [
    'src/docudent/v7',
    'src/docudent/v10',
    'src/docudent/core',
    'src/docudent/medical_kb',
];

// Directories that ARE ALLOWED to reference V6 (archive/docs)
const ARCHIVE_DIRS = [
    'docs',
    '__archive__',
    'v6', // V6 can reference itself
];

describe('Gate M12.3: No Runtime V6 Imports', () => {
    it('V7 does not import from V6', () => {
        checkNoV6Imports('src/docudent/v7');
    });

    it('V10 does not import from V6', () => {
        checkNoV6Imports('src/docudent/v10');
    });

    /**
     * M12.4: outputService.ts (the last V6 import) has been archived.
     * core/ now has zero V6 imports.
     */
    it('core/ does not import from V6', () => {
        checkNoV6Imports('src/docudent/core');
    });

    it('medical_kb does not import from V6', () => {
        checkNoV6Imports('src/docudent/medical_kb');
    });
});

function checkNoV6Imports(dirPath: string): void {
    const absolutePath = path.resolve(__dirname, '../../../../..', dirPath);

    if (!fs.existsSync(absolutePath)) {
        // Directory doesn't exist — pass
        return;
    }

    const violations: string[] = [];
    walkDir(absolutePath, (filePath) => {
        if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) {
            return;
        }

        // Skip files in archive directories
        if (ARCHIVE_DIRS.some(d => filePath.includes(`/${d}/`))) {
            return;
        }

        const content = fs.readFileSync(filePath, 'utf-8');

        // Check for V6 imports
        const v6ImportPattern = /from\s+['"][^'"]*\/v6\//;
        if (v6ImportPattern.test(content)) {
            const relativePath = path.relative(absolutePath, filePath);
            violations.push(relativePath);
        }
    });

    if (violations.length > 0) {
        expect.fail(
            `Found ${violations.length} file(s) with V6 imports in ${dirPath}:\n${violations.join('\n')}\n\n` +
            'V6 is archived. Use V10 or core/ modules instead.'
        );
    }
}

function walkDir(dir: string, callback: (path: string) => void): void {
    try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
                walkDir(filePath, callback);
            } else {
                callback(filePath);
            }
        }
    } catch {
        // Directory access error — skip
    }
}
