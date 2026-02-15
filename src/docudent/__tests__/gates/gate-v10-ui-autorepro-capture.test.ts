/**
 * Gate: V10 UI AutoRepro Capture (M70)
 * 
 * Verifies AutoRepro capture system works.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const AUTO_REPRO_PATH = join(__dirname, '../../v10/debug/autoReproCapture.ts');
const DEBUG_DRAWER_PATH = join(__dirname, '../../v10/components/V10DebugDrawer.tsx');

describe('Gate: V10 UI AutoRepro Capture (M70)', () => {
    let autoReproContent: string;
    let drawerContent: string;

    beforeAll(() => {
        autoReproContent = readFileSync(AUTO_REPRO_PATH, 'utf-8');
        drawerContent = readFileSync(DEBUG_DRAWER_PATH, 'utf-8');
    });

    describe('AutoRepro Module', () => {
        it('exports captureRepro function', () => {
            expect(autoReproContent).toContain('export function captureRepro');
        });

        it('exports getLastRepro function', () => {
            expect(autoReproContent).toContain('export function getLastRepro');
        });

        it('exports copyLastReproToClipboard function', () => {
            expect(autoReproContent).toContain('export async function copyLastReproToClipboard');
        });

        it('uses localStorage for storage', () => {
            expect(autoReproContent).toContain('localStorage.setItem');
            expect(autoReproContent).toContain('localStorage.getItem');
        });

        it('defines LAST_REPRO_KEY constant', () => {
            expect(autoReproContent).toContain("const LAST_REPRO_KEY = 'v10_last_repro'");
        });

        it('validates no secrets before storage', () => {
            expect(autoReproContent).toContain('validateNoSecrets');
        });

        it('strips testOnly fields', () => {
            expect(autoReproContent).toContain('stripTestOnlyFields');
        });
    });

    describe('AutoReproBundle Type', () => {
        it('extends ReproBundleV1', () => {
            expect(autoReproContent).toContain('extends ReproBundleV1');
        });

        it('includes resultSummary', () => {
            expect(autoReproContent).toContain('resultSummary: ReproCaptureOutput');
        });

        it('resultSummary includes state', () => {
            expect(autoReproContent).toContain('state: string');
        });

        it('resultSummary includes questionIds', () => {
            expect(autoReproContent).toContain('questionIds?: string[]');
        });

        it('resultSummary includes billingCodesCount', () => {
            expect(autoReproContent).toContain('billingCodesCount?: number');
        });
    });

    describe('Debug Drawer Copy Button', () => {
        it('imports copyLastReproToClipboard', () => {
            expect(drawerContent).toContain('copyLastReproToClipboard');
        });

        it('has Copy Last Repro button', () => {
            expect(drawerContent).toContain('data-testid="v10-copy-last-repro"');
        });

        it('button text includes Copy', () => {
            expect(drawerContent).toContain('Copy Last Repro JSON');
        });
    });
});
