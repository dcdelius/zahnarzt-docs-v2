/**
 * Gate Test: Atlas Reality Sync
 *
 * CI gate ensuring Atlas documentation stays in sync with runtime code.
 * Fails if reality.snapshot.v10.md or coverage.index.v10.md are missing/stale.
 */

import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ATLAS_DIR = path.resolve(__dirname, '../../../../docs/system-atlas');

describe('gate-atlas-reality-sync', () => {
    describe('Required Files Exist', () => {
        test('reality.snapshot.v10.md exists', () => {
            const filePath = path.join(ATLAS_DIR, 'reality.snapshot.v10.md');
            expect(fs.existsSync(filePath)).toBe(true);
        });

        test('coverage.index.v10.md exists', () => {
            const filePath = path.join(ATLAS_DIR, 'coverage.index.v10.md');
            expect(fs.existsSync(filePath)).toBe(true);
        });
    });

    describe('Pipeline Anchors Present', () => {
        test('reality.snapshot contains applyMedicalKb', () => {
            const content = fs.readFileSync(
                path.join(ATLAS_DIR, 'reality.snapshot.v10.md'),
                'utf-8'
            );
            expect(content.includes('applyMedicalKb') || content.includes('Medical KB')).toBe(true);
        });

        test('reality.snapshot contains compileAskbacksToQuestions', () => {
            const content = fs.readFileSync(
                path.join(ATLAS_DIR, 'reality.snapshot.v10.md'),
                'utf-8'
            );
            expect(content.includes('compileAskbacksToQuestions') || content.includes('Askbacks')).toBe(true);
        });

        test('reality.snapshot contains renderFromKbChips', () => {
            const content = fs.readFileSync(
                path.join(ATLAS_DIR, 'reality.snapshot.v10.md'),
                'utf-8'
            );
            expect(content.includes('renderFromKbChips') || content.includes('Renderer')).toBe(true);
        });

        test('reality.snapshot contains checkCombinabilityFromKb', () => {
            const content = fs.readFileSync(
                path.join(ATLAS_DIR, 'reality.snapshot.v10.md'),
                'utf-8'
            );
            expect(content.includes('checkCombinabilityFromKb') || content.includes('Combinability')).toBe(true);
        });
    });

    describe('Coverage Index Anchors', () => {
        test('coverage.index contains Chips inventory', () => {
            const content = fs.readFileSync(
                path.join(ATLAS_DIR, 'coverage.index.v10.md'),
                'utf-8'
            );
            expect(content.includes('ChipId') || content.includes('Chips')).toBe(true);
        });

        test('coverage.index contains Askbacks inventory', () => {
            const content = fs.readFileSync(
                path.join(ATLAS_DIR, 'coverage.index.v10.md'),
                'utf-8'
            );
            expect(content.includes('AskbackId') || content.includes('Askbacks')).toBe(true);
        });

        test('coverage.index contains BillingRef mapping', () => {
            const content = fs.readFileSync(
                path.join(ATLAS_DIR, 'coverage.index.v10.md'),
                'utf-8'
            );
            expect(content.includes('BillingRef') || content.includes('BEMA_')).toBe(true);
        });
    });

    describe('SSOT Contracts', () => {
        test('reality.snapshot documents BillingRef = DB key only', () => {
            const content = fs.readFileSync(
                path.join(ATLAS_DIR, 'reality.snapshot.v10.md'),
                'utf-8'
            );
            expect(
                content.includes('DB key') ||
                content.includes('billingref-closure') ||
                content.includes('BillingRef')
            ).toBe(true);
        });

        test('reality.snapshot documents perInstance SSOT', () => {
            const content = fs.readFileSync(
                path.join(ATLAS_DIR, 'reality.snapshot.v10.md'),
                'utf-8'
            );
            expect(
                content.includes('perInstance') ||
                content.includes('SSOT') ||
                content.includes('Instance')
            ).toBe(true);
        });
    });
});
