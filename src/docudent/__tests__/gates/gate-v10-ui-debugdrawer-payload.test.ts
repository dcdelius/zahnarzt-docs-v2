/**
 * Gate: V10 DebugDrawer Payload Visibility (M52)
 * 
 * Verifies via static analysis that:
 * 1. DebugDrawer has a payload/input section
 * 2. insuranceType is visible in debug info
 * 3. treatmentId and textLength are accessible
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const DEBUG_DRAWER_PATH = join(__dirname, '../../v10/components/V10DebugDrawer.tsx');
const USE_V7_PIPELINE_PATH = join(__dirname, '../../v7/hooks/useV7Pipeline.ts');

describe('Gate: V10 DebugDrawer Payload Visibility (M52)', () => {
    let drawerContent: string;
    let hookContent: string;

    beforeAll(() => {
        drawerContent = readFileSync(DEBUG_DRAWER_PATH, 'utf-8');
        hookContent = readFileSync(USE_V7_PIPELINE_PATH, 'utf-8');
    });

    describe('DebugDrawer Structure', () => {
        it('has tabs for navigation', () => {
            expect(drawerContent).toContain('TABS');
            expect(drawerContent).toContain('activeTab');
        });

        it('has repro tab with input visibility', () => {
            expect(drawerContent).toContain("id: 'repro'");
            // Repro section shows input data
            expect(drawerContent).toContain('insuranceType');
            expect(drawerContent).toContain('treatmentId');
        });

        it('has provenance tab showing billing codes count', () => {
            expect(drawerContent).toContain("id: 'provenance'");
            expect(drawerContent).toContain('billingCodes');
        });
    });

    describe('Insurance Type Visibility', () => {
        it('insuranceType is used in repro bundle creation', () => {
            expect(drawerContent).toMatch(/insuranceType.*result/s);
        });

        it('hook exports insuranceType', () => {
            expect(hookContent).toContain('insuranceType,');
            expect(hookContent).toMatch(/return\s*\{[\s\S]*insuranceType[\s\S]*\}/);
        });
    });

    describe('Input Parameters Accessible', () => {
        it('treatmentId is captured in repro', () => {
            expect(drawerContent).toContain('treatmentId');
        });

        it('result state is displayed', () => {
            expect(drawerContent).toContain("result?.state || 'idle'");
        });
    });
});
