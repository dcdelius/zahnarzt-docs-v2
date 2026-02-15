import fs from 'fs';
import path from 'path';

export interface GateNoSettingsAccessResult {
    ok: boolean;
    violations: string[];
}

const COMPOSER_MARKER = '// ═══ V10 COMPOSER';

export function gateNoSettingsAccessInComposer(): GateNoSettingsAccessResult {
    const filePath = path.join(__dirname, '../../pipeline/runV10.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    const markerIndex = content.indexOf(COMPOSER_MARKER);

    if (markerIndex < 0) {
        return {
            ok: false,
            violations: ['Composer marker not found in runV10.ts'],
        };
    }

    const composerSlice = content.slice(markerIndex);
    const violations: string[] = [];

    if (composerSlice.includes('settingsInput')) {
        violations.push('settingsInput used in composer block');
    }
    if (composerSlice.includes('buildRenderContext')) {
        violations.push('buildRenderContext referenced in composer block');
    }
    if (composerSlice.includes('renderContext')) {
        violations.push('renderContext referenced in composer block');
    }

    return {
        ok: violations.length === 0,
        violations,
    };
}
