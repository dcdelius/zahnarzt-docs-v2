import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

describe('gate-v10-option-pill-accessibility', () => {
    it('exposes active state via aria-pressed for deterministic UI flows', () => {
        const file = fs.readFileSync(
            path.join(ROOT, 'src/docudent/v10/components/V10OptionPillButton.tsx'),
            'utf8'
        );

        expect(file).toContain('aria-pressed={isActive}');
        expect(file).toContain("data-state={isActive ? 'active' : 'inactive'}");
    });
});
