/**
 * Gate: V10 UI BuildInfo Visible (M70)
 * 
 * Verifies BuildInfo is available in Debug Drawer.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const DEBUG_DRAWER_PATH = join(__dirname, '../../v10/components/V10DebugDrawer.tsx');
const BUILD_INFO_PATH = join(__dirname, '../../v10/debug/buildInfo.ts');

describe('Gate: V10 UI BuildInfo Visible (M70)', () => {
    let drawerContent: string;
    let buildInfoContent: string;

    beforeAll(() => {
        drawerContent = readFileSync(DEBUG_DRAWER_PATH, 'utf-8');
        buildInfoContent = readFileSync(BUILD_INFO_PATH, 'utf-8');
    });

    describe('BuildInfo Module', () => {
        it('exports getBuildInfo function', () => {
            expect(buildInfoContent).toContain('export function getBuildInfo');
        });

        it('includes gitSha in BuildInfo interface', () => {
            expect(buildInfoContent).toContain('gitSha: string');
        });

        it('includes kb hashes in BuildInfo', () => {
            expect(buildInfoContent).toMatch(/kb:\s*\{/);
            expect(buildInfoContent).toContain('medical:');
        });

        it('includes packs list', () => {
            expect(buildInfoContent).toContain('packs: string[]');
        });
    });

    describe('Debug Drawer Integration', () => {
        it('imports getBuildInfo', () => {
            expect(drawerContent).toContain("import { getBuildInfo");
        });

        it('has Build tab', () => {
            expect(drawerContent).toMatch(/id:\s*['"]build['"]/);
        });

        it('has data-testid for build panel', () => {
            expect(drawerContent).toContain('data-testid="v10-debug-build"');
        });

        it('displays Git SHA', () => {
            expect(drawerContent).toContain('Git SHA');
            expect(drawerContent).toContain('buildInfo.gitSha');
        });

        it('displays KB Meta', () => {
            expect(drawerContent).toContain('KB Meta');
            expect(drawerContent).toContain('buildInfo.kb.medical');
        });

        it('displays Active Packs', () => {
            expect(drawerContent).toContain('Active Packs');
            expect(drawerContent).toContain('buildInfo.packs');
        });
    });
});
